import { X, Grid } from 'lucide-react';
import PropTypes from 'prop-types';
// import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion'; // eslint-disable-line no-unused-vars
import { useState, useEffect, useRef, useCallback } from 'react';
import useListStore from '../store/useListStore';
// import useAuthStore from '../store/useAuthStore';
import useWatchHistoryStore from '../store/useWatchHistoryStore';
import StreamingPlayer from './StreamingPlayer';
import clsx from 'clsx';
import useModalStore from '../store/useModalStore';
import { useModalData } from '../hooks/useModalData';
import useIsMobile from '../hooks/useIsMobile';
import ModalSkeleton from './ModalSkeleton';
import axios from 'axios';
import DownloadModal from './modal/DownloadModal';
import { getBaseUrl } from '../utils/apiConfig';

import { lazy, Suspense } from 'react';

import ModalHero from './modal/ModalHero';
const ModalEpisodes = lazy(() => import('./modal/ModalEpisodes'));
const ModalSimilar = lazy(() => import('./modal/ModalSimilar'));
const ModalDetails = lazy(() => import('./modal/ModalDetails'));
const TrailerModal = lazy(() => import('./modal/TrailerModal'));
const CastModal = lazy(() => import('./modal/CastModal'));

const Modal = ({ movie, onClose, onMovieClick }) => {

    const openModal = useModalStore((state) => state.openModal);
    const closeModal = useModalStore((state) => state.closeModal);
    const activeTab = useModalStore((state) => state.activeTab);
    const setOnCloseHandler = useModalStore((state) => state.setOnCloseHandler);
    const playerState = useModalStore((state) => state.playerState);
    const setPlayerState = useModalStore((state) => state.setPlayerState);
    const closePlayer = useModalStore((state) => state.closePlayer);

    const isMobile = useIsMobile();

    // Open modal when movie changes
    useEffect(() => {
        if (movie) {
            openModal(movie.first_air_date ? 'tv' : 'movie');
        }
    }, [movie, openModal]);

    // Cleanup: close modal on component unmount
    useEffect(() => {
        return () => closeModal();
    }, [closeModal]);


    const [selectedSeason, setSelectedSeason] = useState(movie?.season || 1);
    const [showTrailer, setShowTrailer] = useState(false);
    const [desktopTab, setDesktopTab] = useState('more'); // 'more' or 'about'

    // Download State
    const [showDownloadModal, setShowDownloadModal] = useState(false);
    const [downloadLinks, setDownloadLinks] = useState([]);
    const [downloadSeasons, setDownloadSeasons] = useState([]);
    const [downloadType, setDownloadType] = useState('movie');
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadError, setDownloadError] = useState(null);

    const hasOpenedRef = useRef(false);
    const { addMovie, removeMovie, isInList } = useListStore();
    // const { user } = useAuthStore();
    const { addToHistory, getHistoryItem } = useWatchHistoryStore();

    // Lock body scroll when modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    const handleListToggle = useCallback(() => {
        if (isInList(movie.id)) {
            removeMovie(movie.id);
        } else {
            addMovie(movie);
        }
    }, [isInList, movie, removeMovie, addMovie]);

    // Mark modal as opened
    if (movie && !hasOpenedRef.current) {
        hasOpenedRef.current = true;
    }

    const modalEnabled = hasOpenedRef.current && !!movie?.id;

    // Use custom hook for data
    const {
        movieDetails,
        episodes,
        isEpisodesLoading,
        isLoading,
        logoPath,
        cast,
        similarMovies,
        trailerKey,
        director,
        creators,
        // Error states
        isSimilarError,
        isEpisodesError,
        // Refetch functions
        refetchSimilar,
        refetchEpisodes
    } = useModalData(movie, modalEnabled, selectedSeason);

    // Use ref to keep onClose stable for the effect dependency
    const onCloseRef = useRef(onClose);

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    const handleClose = useCallback(() => {
        closeModal();
        if (onCloseRef.current) {
            onCloseRef.current();
        }
    }, [closeModal]);

    // Register the close handler with the store so BottomNavbar can use it
    useEffect(() => {
        if (movie && typeof setOnCloseHandler === 'function') {
            setOnCloseHandler(handleClose);
        }
        return () => {
            if (typeof setOnCloseHandler === 'function') {
                setOnCloseHandler(null);
            }
        };
    }, [movie, handleClose, setOnCloseHandler]);

    const handleTrailerOpen = useCallback(() => {
        setShowTrailer(true);
    }, []);

    const handleTrailerClose = useCallback(() => {
        setShowTrailer(false);
    }, []);

    const handlePlay = useCallback((season = 1, episode = 1) => {
        addToHistory(movie);
        setPlayerState({ isOpen: true, type: movie.first_air_date ? 'tv' : 'movie', season, episode });
    }, [addToHistory, movie, setPlayerState]);

    const handleDownload = useCallback(async () => {
        setShowDownloadModal(true);
        setIsDownloading(true);
        setDownloadError(null);
        setDownloadLinks([]);
        setDownloadSeasons([]);

        try {
            const query = movie.title || movie.name;
            // Use centralized API config
            const backendUrl = getBaseUrl();
            const response = await axios.get(`${backendUrl}/downloads/search`, {
                params: { q: query }
            });

            if (response.data.success && response.data.data.length > 0) {
                // Flatten all downloads from all results or just take the first result's downloads
                // For better UX, let's aggregate downloads from the best match (usually the first one)
                const currentType = movie.first_air_date ? 'series' : 'movie';

                // Find the first result that matches our current type
                const bestMatch = response.data.data.find(item => item.type === currentType) || response.data.data[0];

                setDownloadType(bestMatch.type || 'movie');

                if (bestMatch.type === 'series') {
                    setDownloadSeasons(bestMatch.seasons || []);
                } else {
                    setDownloadLinks(bestMatch.downloads || []);
                }
            } else {
                setDownloadLinks([]);
                setDownloadSeasons([]);
            }
        } catch (error) {
            console.error('Download fetch error:', error);
            setDownloadError('Failed to fetch download links. Please try again.');
        } finally {
            setIsDownloading(false);
        }
    }, [movie]);

    const handleCloseDownloadModal = useCallback(() => {
        setShowDownloadModal(false);
    }, []);

    if (!movie) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, pointerEvents: 'none' }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-0 md:p-4"
            style={{ willChange: 'opacity' }}
        >
            <motion.div
                initial={{ scale: 0.8, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0, y: 20 }}
                transition={{
                    type: "spring",
                    damping: 25,
                    stiffness: 300,
                    duration: 0.4
                }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-7xl bg-[#1a1a1a] rounded-none md:rounded-4xl overflow-hidden shadow-2xl max-h-[100vh] md:max-h-[96vh] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                style={{ willChange: 'transform, opacity' }}
            >
                {/* Close Button */}
                <button
                    onClick={handleClose}
                    className="hidden md:block absolute top-3 right-3 md:top-4 md:right-4 z-[100] bg-[#1a1a1a]/80 rounded-full p-2 md:p-2 hover:bg-[#2a2a2a] transition ring-1 ring-white/20"
                >
                    <X className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </button>
                <ModalHero
                    movie={movie}
                    movieDetails={movieDetails}
                    logoPath={logoPath}
                    cast={cast}
                    isMobile={isMobile}
                    activeTab={activeTab}
                    handleListToggle={handleListToggle}
                    inList={isInList(movie.id)}
                    handleTrailerOpen={handleTrailerOpen}
                    trailerKey={trailerKey}
                    onPlay={handlePlay}
                    getHistoryItem={getHistoryItem}
                    director={director}
                    creators={creators}
                    onDownload={handleDownload}
                />

                {/* Episodes Section - Between Hero and Tabs (TV Shows Only) */}
                {movie.first_air_date && (
                    <Suspense fallback={<div className="h-40 w-full bg-[#101010] animate-pulse" />}>
                        <ModalEpisodes
                            movie={movie}
                            isMobile={isMobile}
                            activeTab={activeTab}
                            movieDetails={movieDetails}
                            selectedSeason={selectedSeason}
                            setSelectedSeason={setSelectedSeason}
                            episodes={episodes}
                            isEpisodesLoading={isEpisodesLoading}
                            isEpisodesError={isEpisodesError}
                            onRetryEpisodes={refetchEpisodes}
                            addToHistory={addToHistory}
                            setPlayerState={setPlayerState}
                        />
                    </Suspense>
                )}

                {/* Bottom Section - Tabbed Interface (Desktop Only / Mobile Similar) */}
                <div className={clsx(
                    "px-4 md:px-12 py-4 md:py-8 bg-[#101010]",
                    isMobile ? (activeTab === 'similar' ? "min-h-[100vh]" : "hidden") : ""
                )}>
                    {/* Mobile Header for Similar Section */}
                    {isMobile && activeTab === 'similar' && (
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Grid className="w-5 h-5" /> More Like This
                        </h3>
                    )}

                    {/* Tab Buttons - Hidden on Mobile */}
                    <div className="hidden md:flex gap-4 md:gap-6 border-b border-white/10 mb-4 md:mb-6">
                        <button
                            onClick={() => setDesktopTab('more')}
                            className={`pb-2 md:pb-3 px-1 md:px-2 text-sm md:text-base font-semibold transition-colors relative ${desktopTab === 'more'
                                ? 'text-white'
                                : 'text-gray-400 hover:text-gray-300'
                                }`}
                        >
                            More Like This
                            {desktopTab === 'more' && (
                                <div className="absolute bottom-0 left-0 right-0 rounded-full h-0.5 bg-[#fff]"></div>
                            )}
                        </button>
                        <button
                            onClick={() => setDesktopTab('about')}
                            className={`pb-2 md:pb-3 px-1 md:px-2 text-sm md:text-base font-semibold transition-colors relative ${desktopTab === 'about'
                                ? 'text-white'
                                : 'text-gray-400 hover:text-gray-300'
                                }`}
                        >
                            About
                            {desktopTab === 'about' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#fff]"></div>
                            )}
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="min-h-[300px]">
                        <Suspense fallback={
                            <div className="animate-pulse space-y-4">
                                <div className="h-4 bg-white/10 rounded w-1/4"></div>
                                <div className="h-4 bg-white/10 rounded w-3/4"></div>
                                <div className="h-4 bg-white/10 rounded w-1/4"></div>
                                <div className="h-4 bg-white/10 rounded w-1/2"></div>
                            </div>
                        }>
                            {(isMobile || desktopTab === 'more') ? (
                                <ModalSimilar
                                    similarMovies={similarMovies}
                                    isLoading={isLoading}
                                    isError={isSimilarError}
                                    onRetry={refetchSimilar}
                                    onMovieClick={onMovieClick}
                                    onClose={handleClose}
                                />
                            ) : (
                                <ModalDetails
                                    isLoading={isLoading}
                                    cast={cast}
                                    movieDetails={movieDetails}
                                    movie={movie}
                                    director={director}
                                    creators={creators}
                                />
                            )}
                        </Suspense>
                    </div>
                </div>
            </motion.div>

            <Suspense fallback={null}>
                <TrailerModal
                    showTrailer={showTrailer}
                    trailerKey={trailerKey}
                    onClose={handleTrailerClose}
                />
                <DownloadModal
                    isOpen={showDownloadModal}
                    onClose={handleCloseDownloadModal}
                    downloads={downloadLinks}
                    seasons={downloadSeasons}
                    type={downloadType}
                    isLoading={isDownloading}
                    error={downloadError}
                    movieTitle={movie.title || movie.name}
                />
                <CastModal onMovieClick={onMovieClick} />
            </Suspense>

            {/* Streaming Player */}
            <AnimatePresence>
                {playerState.isOpen && (
                    <StreamingPlayer
                        movie={movie}
                        type={playerState.type}
                        season={playerState.season}
                        episode={playerState.episode}
                        onClose={closePlayer}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
};

Modal.propTypes = {
    movie: PropTypes.object,
    onClose: PropTypes.func.isRequired,
    onMovieClick: PropTypes.func
};

export default Modal;