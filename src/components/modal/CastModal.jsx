import { X, Instagram, Twitter, Facebook, Globe, Calendar, MapPin, Briefcase, User, Film, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion'; // eslint-disable-line no-unused-vars
import { useEffect, useState, useMemo } from 'react';
import useModalStore from '../../store/useModalStore';
import { usePersonDetails } from '../../hooks/useTMDB';
import ImageWithPlaceholder from '../ImageWithPlaceholder';
import clsx from 'clsx';
import CastModalSkeleton from './CastModalSkeleton';

const CastModal = ({ onMovieClick }) => {
    const { isCastModalOpen, selectedPerson, closeCastModal, activeCastTab, setActiveCastTab } = useModalStore();
    const { data: person, isLoading } = usePersonDetails(selectedPerson?.id, isCastModalOpen);
    const [showFullBio, setShowFullBio] = useState(false);

    // Reset state when person changes
    useEffect(() => {
        setShowFullBio(false); // eslint-disable-line react-hooks/set-state-in-effect
        // activeCastTab is reset in openCastModal action
    }, [selectedPerson]);

    const handleClose = () => {
        closeCastModal();
    };

    // Memoize derived data
    const backdropPath = useMemo(() => {
        if (!person?.credits?.cast) return null;
        // Find the most popular movie with a backdrop
        const sorted = [...person.credits.cast].sort((a, b) => b.popularity - a.popularity);
        return sorted.find(item => item.backdrop_path)?.backdrop_path;
    }, [person]);

    const knownFor = useMemo(() => {
        return person?.credits?.cast
            ?.filter(item => item.poster_path)
            ?.sort((a, b) => b.vote_count - a.vote_count)
            ?.slice(0, 24) || [];
    }, [person]);

    const photos = useMemo(() => {
        return person?.images?.profiles?.slice(0, 20) || [];
    }, [person]);

    const socialLinks = useMemo(() => {
        const ids = person?.external_ids;
        if (!ids) return [];
        return [
            ids.instagram_id && { icon: Instagram, url: `https://instagram.com/${ids.instagram_id}`, label: 'Instagram' },
            ids.twitter_id && { icon: Twitter, url: `https://twitter.com/${ids.twitter_id}`, label: 'Twitter' },
            ids.facebook_id && { icon: Facebook, url: `https://facebook.com/${ids.facebook_id}`, label: 'Facebook' },
            ids.imdb_id && { icon: Globe, url: `https://imdb.com/name/${ids.imdb_id}`, label: 'IMDb' },
        ].filter(Boolean);
    }, [person]);

    const tabVariants = {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
        exit: { opacity: 0, y: -10, transition: { duration: 0.2 } }
    };

    // if (!isCastModalOpen || !selectedPerson) return null; // Removed to allow AnimatePresence to work

    return (
        <AnimatePresence>
            {isCastModalOpen && selectedPerson && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, pointerEvents: 'none' }}
                    transition={{ duration: 0.2 }}
                    onClick={handleClose}
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-0 md:p-4"
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
                        className="relative w-full max-w-7xl bg-[#101010] rounded-none md:rounded-3xl overflow-hidden shadow-2xl min-h-[100vh] md:min-h-[96vh] max-h-[100vh] md:max-h-[96vh] flex flex-col md:flex-row border border-white/10"
                    >
                        {/* Close Button - Hidden on mobile as BottomNavbar handles closing */}
                        <button
                            onClick={handleClose}
                            className="hidden md:block absolute top-4 right-4 z-50 p-2 bg-black/50 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all ring-1 ring-white/10"
                        >
                            <X size={24} />
                        </button>

                        {isLoading ? (
                            <CastModalSkeleton />
                        ) : (
                            <>
                                {/* LEFT SIDEBAR - Desktop Only */}
                                <div className="hidden md:flex w-[320px] lg:w-[380px] bg-[#1a1a1a] border-r border-white/5 flex-col h-full min-h-[100vh] md:min-h-[96vh] overflow-y-auto custom-scrollbar shrink-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                    <div className="p-8 flex flex-col items-center text-center">
                                        {/* Profile Image */}
                                        <div className="w-48 rounded-2xl overflow-hidden shadow-2xl ring-4 ring-white/5 mb-6">
                                            <ImageWithPlaceholder
                                                src={`https://image.tmdb.org/t/p/w500${person?.profile_path}`}
                                                alt={person?.name}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>

                                        {/* Name & Dept */}
                                        <h2 className="text-2xl font-black text-white mb-2">{person?.name}</h2>
                                        {person?.known_for_department && (
                                            <span className="px-3 py-1 rounded-full bg-white/5 text-gray-400 text-sm border border-white/5">
                                                {person.known_for_department}
                                            </span>
                                        )}

                                        {/* Social Links */}
                                        {socialLinks.length > 0 && (
                                            <div className="flex items-center gap-3 mt-6">
                                                {socialLinks.map((link) => (
                                                    <a
                                                        key={link.label}
                                                        href={link.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-2 bg-white/5 hover:bg-white/20 rounded-full text-gray-400 hover:text-white transition-all border border-white/5 hover:border-white/20"
                                                        title={link.label}
                                                    >
                                                        <link.icon size={18} />
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Navigation Options */}
                                    <div className="px-4 py-2 space-y-1">
                                        <button
                                            onClick={() => setActiveCastTab('overview')}
                                            className={clsx(
                                                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm",
                                                activeCastTab === 'overview'
                                                    ? "bg-white text-black shadow-lg shadow-white/10"
                                                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                                            )}
                                        >
                                            <User size={18} />
                                            Overview
                                        </button>
                                        <button
                                            onClick={() => setActiveCastTab('known_for')}
                                            className={clsx(
                                                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm",
                                                activeCastTab === 'known_for'
                                                    ? "bg-white text-black shadow-lg shadow-white/10"
                                                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                                            )}
                                        >
                                            <Film size={18} />
                                            Known For
                                        </button>
                                        <button
                                            onClick={() => setActiveCastTab('photos')}
                                            className={clsx(
                                                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm",
                                                activeCastTab === 'photos'
                                                    ? "bg-white text-black shadow-lg shadow-white/10"
                                                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                                            )}
                                        >
                                            <ImageIcon size={18} />
                                            Photos
                                        </button>
                                    </div>

                                    {/* Personal Info */}
                                    <div className="p-8 mt-auto space-y-6 border-t border-white/5">
                                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Personal Info</h3>
                                        <div className="space-y-4 text-sm">
                                            {person?.birthday && (
                                                <div>
                                                    <span className="text-gray-500 block text-xs mb-1">Born</span>
                                                    <p className="text-gray-200 flex items-center gap-2">
                                                        <Calendar size={14} className="text-gray-400" />
                                                        {new Date(person.birthday).toLocaleDateString(undefined, {
                                                            year: 'numeric', month: 'long', day: 'numeric'
                                                        })}
                                                    </p>
                                                </div>
                                            )}
                                            {person?.place_of_birth && (
                                                <div>
                                                    <span className="text-gray-500 block text-xs mb-1">Place of Birth</span>
                                                    <p className="text-gray-200 flex items-center gap-2">
                                                        <MapPin size={14} className="text-gray-400" />
                                                        {person.place_of_birth}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* RIGHT CONTENT - Main Area (Full width on mobile) */}
                                <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#101010]">
                                    {/* Header Image - Adjusted for mobile */}
                                    <div className="relative h-64 md:h-64 shrink-0 w-full">
                                        {backdropPath ? (
                                            <ImageWithPlaceholder
                                                src={`https://image.tmdb.org/t/p/w1280${backdropPath}`}
                                                alt="Backdrop"
                                                className="w-full h-full object-cover opacity-50"
                                                imgClassName="object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black" />
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#101010] to-transparent" />
                                        <div className="absolute inset-0 bg-gradient-to-l from-[#101010] via-transparent to-transparent" />

                                        <div className="absolute bottom-0 left-0 p-6 md:p-8 w-full">
                                            <div className="flex items-end gap-4 md:block">
                                                {/* Mobile Profile Image */}
                                                <div className="md:hidden w-24 rounded-xl overflow-hidden shadow-2xl ring-2 ring-white/10 shrink-0 bg-[#2a2a2a]">
                                                    <ImageWithPlaceholder
                                                        src={`https://image.tmdb.org/t/p/w500${person?.profile_path}`}
                                                        alt={person?.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                <div>
                                                    <h1 className="text-2xl md:text-4xl font-black text-white mb-1 md:mb-2 leading-tight">{person?.name}</h1>
                                                    <p className="text-gray-400 text-xs md:text-base line-clamp-2 md:line-clamp-1 max-w-2xl">
                                                        {person?.known_for_department} • {person?.place_of_birth}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Mobile Social Links */}
                                            <div className="md:hidden flex items-center gap-3 mt-4">
                                                {socialLinks.map((link) => (
                                                    <a
                                                        key={link.label}
                                                        href={link.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-2 bg-white/5 hover:bg-white/20 rounded-full text-gray-400 hover:text-white transition-all border border-white/5 hover:border-white/20"
                                                        title={link.label}
                                                    >
                                                        <link.icon size={16} />
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Scrollable Content - Added padding-bottom for mobile nav */}
                                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 pb-24 md:pb-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                        <AnimatePresence mode="wait">
                                            {activeCastTab === 'overview' && (
                                                <motion.div
                                                    key="overview"
                                                    variants={tabVariants}
                                                    initial="hidden"
                                                    animate="visible"
                                                    exit="exit"
                                                    className="space-y-6 md:space-y-8"
                                                >
                                                    <div>
                                                        <h3 className="text-lg md:text-xl font-bold text-white mb-3 md:mb-4">Biography</h3>
                                                        {person?.biography ? (
                                                            <div className="relative">
                                                                <p className={clsx(
                                                                    "text-gray-300 text-base md:text-lg leading-relaxed whitespace-pre-line font-light",
                                                                    !showFullBio && "line-clamp-[10] md:line-clamp-[15]"
                                                                )}>
                                                                    {person.biography}
                                                                </p>
                                                                {person.biography.length > 500 && (
                                                                    <button
                                                                        onClick={() => setShowFullBio(!showFullBio)}
                                                                        className="mt-4 text-white hover:text-gray-300 text-sm font-semibold underline decoration-white/30 hover:decoration-white transition-all"
                                                                    >
                                                                        {showFullBio ? 'Read Less' : 'Read More'}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <p className="text-gray-500 italic">No biography available.</p>
                                                        )}
                                                    </div>

                                                    {/* Mobile Personal Info */}
                                                    <div className="md:hidden space-y-4 bg-[#1a1a1a]/50 p-4 rounded-xl border border-white/5">
                                                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Personal Info</h3>
                                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                                            {person?.birthday && (
                                                                <div>
                                                                    <span className="text-gray-500 block text-xs mb-1">Born</span>
                                                                    <p className="text-gray-200">
                                                                        {new Date(person.birthday).toLocaleDateString(undefined, {
                                                                            year: 'numeric', month: 'short', day: 'numeric'
                                                                        })}
                                                                    </p>
                                                                </div>
                                                            )}
                                                            {person?.place_of_birth && (
                                                                <div>
                                                                    <span className="text-gray-500 block text-xs mb-1">Place of Birth</span>
                                                                    <p className="text-gray-200 line-clamp-1">
                                                                        {person.place_of_birth}
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Also Known As */}
                                                    {person?.also_known_as?.length > 0 && (
                                                        <div>
                                                            <h3 className="text-lg md:text-xl font-bold text-white mb-3 md:mb-4">Also Known As</h3>
                                                            <div className="flex flex-wrap gap-2">
                                                                {person.also_known_as.slice(0, 10).map(name => (
                                                                    <span key={name} className="px-3 py-1.5 bg-white/5 rounded-lg text-xs md:text-sm text-gray-300 border border-white/5">
                                                                        {name}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </motion.div>
                                            )}

                                            {activeCastTab === 'known_for' && (
                                                <motion.div
                                                    key="known_for"
                                                    variants={tabVariants}
                                                    initial="hidden"
                                                    animate="visible"
                                                    exit="exit"
                                                >
                                                    <h3 className="text-lg md:text-xl font-bold text-white mb-4 md:mb-6">Known For</h3>
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                                                        {knownFor.map((work, index) => (
                                                            <motion.div
                                                                key={`${work.id}-${index}`}
                                                                initial={{ opacity: 0, y: 20 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                transition={{ delay: index * 0.05 }}
                                                                onClick={() => {
                                                                    closeCastModal();
                                                                    if (onMovieClick) onMovieClick(work);
                                                                }}
                                                                className="group relative aspect-[2/3] bg-[#2a2a2a] rounded-xl overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-all hover:-translate-y-1"
                                                            >
                                                                <ImageWithPlaceholder
                                                                    src={`https://image.tmdb.org/t/p/w500${work.poster_path}`}
                                                                    alt={work.title || work.name}
                                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                                />
                                                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3 md:p-4">
                                                                    <p className="text-white font-bold text-xs md:text-sm line-clamp-2 leading-tight">
                                                                        {work.title || work.name}
                                                                    </p>
                                                                    {work.character && (
                                                                        <p className="text-gray-300 text-[10px] md:text-xs mt-1 line-clamp-1">
                                                                            as {work.character}
                                                                        </p>
                                                                    )}
                                                                    <p className="text-gray-400 text-[10px] mt-2 font-medium uppercase tracking-wider">
                                                                        {work.release_date?.substring(0, 4) || work.first_air_date?.substring(0, 4) || 'TBA'}
                                                                    </p>
                                                                </div>
                                                            </motion.div>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            )}

                                            {activeCastTab === 'photos' && (
                                                <motion.div
                                                    key="photos"
                                                    variants={tabVariants}
                                                    initial="hidden"
                                                    animate="visible"
                                                    exit="exit"
                                                >
                                                    <h3 className="text-lg md:text-xl font-bold text-white mb-4 md:mb-6">Gallery</h3>
                                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                                                        {photos.map((photo, index) => (
                                                            <motion.div
                                                                key={`${photo.file_path}-${index}`}
                                                                initial={{ opacity: 0, scale: 0.9 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                transition={{ delay: index * 0.05 }}
                                                                className="aspect-[2/3] rounded-xl overflow-hidden bg-[#2a2a2a] shadow-lg group relative"
                                                            >
                                                                <ImageWithPlaceholder
                                                                    src={`https://image.tmdb.org/t/p/w500${photo.file_path}`}
                                                                    alt="Gallery Photo"
                                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                                />
                                                            </motion.div>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default CastModal;
