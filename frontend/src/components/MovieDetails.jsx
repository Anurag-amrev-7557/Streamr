import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getMovieDetails, getMovieCredits, getMovieVideos, getSimilarMovies } from '../services/tmdbService';
import { PageLoader, SectionLoader, CardLoader } from './Loader';
import { getStreamingUrl, isStreamingAvailable, needsEpisodeSelection } from '../services/streamingService';
import StreamingPlayer from './StreamingPlayer';
import TVEpisodeSelector from './TVEpisodeSelector';

const MovieDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeSeason, setActiveSeason] = useState(1);
  const [activeTab, setActiveTab] = useState('overview');
  const [movieDetails, setMovieDetails] = useState(null);
  const [credits, setCredits] = useState(null);
  const [videos, setVideos] = useState([]);
  const [similarMovies, setSimilarMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isExiting, setIsExiting] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isContentReady, setIsContentReady] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [loadedSections, setLoadedSections] = useState({
    header: false,
    overview: false,
    cast: false,
    production: false,
    similar: false
  });
  const containerRef = useRef(null);
  const scrollPositionRef = useRef(0);
  const viewportRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const playerRef = useRef(null);
  const [modalPosition, setModalPosition] = useState({ top: 0, left: 0 });
  
  // Streaming state
  const [showStreamingPlayer, setShowStreamingPlayer] = useState(false);
  const [streamingUrl, setStreamingUrl] = useState(null);
  const [showEpisodeSelector, setShowEpisodeSelector] = useState(false);

  const seasons = [
    { id: 1, label: 'Season 1' },
    { id: 2, label: 'Season 2' },
    { id: 3, label: 'Season 3' }
  ];

  const episodes = [
    {
      id: 1,
      title: 'The Awakening',
      episode: 'Episode 1',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDovOjSjcd8TzScrypmK9126CTYcna_a53QYbd9sLpuFmjRN4kqQxC_bDjIStCm7UXGTgtij13SeXwQomBfW92hVzVklcTJ_iHP8cC2Fk_xGKXGKvEfSp759an86ef7Xc9g-fCqyW93dgL5YjndCsuwbvTdSabYo9P9KQoN6pwRlu4JVnzeKDLUCKyf34GH16trR1SVkmGiIZO4pbSsw9SZTdEs02e6LO85YaOUJXzqOV48PLJIp5B1bU1s3kj5tcSOGiFTzPQ--Vc'
    },
    {
      id: 2,
      title: 'Shadows of the Past',
      episode: 'Episode 2',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD6uV1RQ0sRFm6byy1Oc_Wte3su8T5YRnkWCFpDOu56zPMA2-vLbARcFHoAix_by7yOi07JasI4JPdPlESKeAz41Med3yDv5nMIsWv7GALBxYFtw3oZc_mH0o0SakkOYXKipZu3c557QrWqmo45VhDBzcbXDRDlnoTR5MwZliGubkcJUvtUr4_1nSrHJ7oRr-2q9cFGnoosWuAceAT1qIEcA-R0E9K1Vrz9yE8xKzPWARtEZw9U0iZdVvtBOg-viviWMsVInV7f9lM'
    },
    {
      id: 3,
      title: 'Whispers in the Dark',
      episode: 'Episode 3',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDZDHRFGJSWtOV95QoUojXTkGWcTRYtc9zW6MpBej71XkkoRpFMCc8_4KobxSo6k38c9VNrSKlIVISlJ56rrjx-rcXGV_3ysbd9dQdxTWtnj-pm3Nap8qLTICJIRbDamay_qAGPeG4lHw8mLjRZBwoL1NQv9I2AkIc10QilNlEw_Kb665FygbzkUs8bA_XOlbekMeIQ5H8dw2twPUOnjeppyNN_8JHYJm3Z0RGDmeX6KK_7kwlDI99hEdz_uGcytVHgaCGG69LVJdA'
    }
  ];

  const cast = [
    {
      id: 1,
      name: 'Ethan Blake',
      role: 'Director',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB1eVj4MMJ9PtX0A53LfgrBp0SHptb5bRd49QTjHScZwrMmKiuOcmB-VEi3Gj7cS2CkfDfPboRuch67TBN1u4QSABw1K4qNrsqA2Q13kfh8JPxrP9IfSHGkJ7-6FJWD18XLfGbDmAB2gL2CRxCK4iBp-Am1y9vj6xpMoOxSNgYwAoNiCJCTCkojwxKRG6GMrI-HV-7Ay4ZRxnOloopakPNPUw7yK2jyfdfbQ9qHdp80wdtUOjTbxGrF2k-4Jr5qwBPJhNGtxk5IKR8'
    },
    {
      id: 2,
      name: 'Olivia Reed',
      role: 'Lead Actress',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBCuGVEZux6jb5uFEO5jOnULIERrQNuvhrCf1-b4IoVK5C5n1P_c6uoud2k_25yUTDEzwhs8F-Gla-bb-FfjiKNEvcUgbz9DF-J9RvmWmBY2FAX4EB3eMfJdjYwKXmpyUwGHzLzJPaqey3ekDJRFciam3NZZN5V5EzYParMfl3P_L5frVnvKSy28vNsgREoklxh9aO23nPjloL_Gv_6Bo2Zw7qOdiJjsqZ4BW65NlAwoa1lPjTtVotI8MrzFx8BweEN_lggCeFlcx0'
    },
    {
      id: 3,
      name: 'Marcus Thorne',
      role: 'Supporting Actor',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDMuIEMVI3Up4c_0GlN0UqxSRLOzReRPO48wkqigEG9uMD2K2jASIgxr0HbOoZeUESSwVUxHyYutaVN5bKZCkm0ZLU_3rHd7ggYPmKlasJJKWJeusoCEzvrn5P0oMBI7S34pRcu0fJtDPiYYvXOYXbeFkdM4ao47c_jdlRy4WcL2jMzC00v5RrsoNQjKNLqpYNVaO4VZjKH8aP0AxBvB2WuL9gu1zWSOZ6YgHcooRG0_-w_h4jO7qOzSOTEGZbf7zUuSafdYwVa1yE'
    },
    {
      id: 4,
      name: 'Sophia Hayes',
      role: 'Producer',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCfRJd2zWQzx2iqgyvJYY1dFKBsKssuXWI99duHWIsOOlYYi8UT73Y3lxGRx0v8pdFLx1F3jVXrIeo08w9XZsR99eFUX3YwaG9auPH-Sggri2wgNuQHFE5kAXWOKyuyFTIq2fNQKQMDfw7C2v0kmQxenHrC6yX8UkUHXbGdw7iaqSGnPYR-JGNZIl7wSGflQRoUV2pb0Py4pmjgxZT8rUTrPRHe0DOqcmpFDGPsGNB-cL4lOoFb1LQCdhRYabFQ-TOoY8K1-aZypM8'
    }
  ];

  useEffect(() => {
    const fetchMovieData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [details, movieCredits, movieVideos, similar] = await Promise.all([
          getMovieDetails(id),
          getMovieCredits(id),
          getMovieVideos(id),
          getSimilarMovies(id)
        ]);
        
        setMovieDetails(details);
        setCredits(movieCredits);
        setVideos(movieVideos);
        setSimilarMovies(similar);

        // Start progressive loading
        setTimeout(() => setLoadedSections(prev => ({ ...prev, header: true })), 100);
        setTimeout(() => setLoadedSections(prev => ({ ...prev, overview: true })), 300);
        setTimeout(() => setLoadedSections(prev => ({ ...prev, cast: true })), 500);
        setTimeout(() => setLoadedSections(prev => ({ ...prev, production: true })), 700);
        setTimeout(() => setLoadedSections(prev => ({ ...prev, similar: true })), 900);
      } catch (error) {
        console.error('Error fetching movie details:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchMovieData();
    }
  }, [id]);

  useEffect(() => {
    if (movieDetails) {
      // Store current scroll position and calculate modal position
      const scrollY = window.scrollY;
      scrollPositionRef.current = scrollY;
      
      // Calculate modal position relative to viewport
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const modalHeight = viewportHeight * 0.9; // 90vh
      const modalWidth = Math.min(viewportWidth * 0.9, 1100); // max-width: 1100px
      
      const top = Math.max(0, (viewportHeight - modalHeight) / 2);
      const left = Math.max(0, (viewportWidth - modalWidth) / 2);
      
      setModalPosition({ top, left });
      
      // Lock body scroll
      document.body.classList.add('modal-open');
      document.body.style.top = `-${scrollPositionRef.current}px`;
      
      // Show modal
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    }
    return () => {
      // Restore scroll position
      document.body.classList.remove('modal-open');
      document.body.style.top = '';
      window.scrollTo(0, scrollPositionRef.current);
      
      setIsVisible(false);
      setIsExiting(false);
      setIsContentReady(false);
      setIsMounted(false);
    };
  }, [movieDetails]);

  const handleClose = useCallback(() => {
    if (isExiting) return;
    setIsExiting(true);
    
    // Restore scroll position
    document.body.classList.remove('modal-open');
    document.body.style.top = '';
    window.scrollTo(0, scrollPositionRef.current);
    
    setIsContentReady(false);
    setTimeout(() => {
      navigate(-1);
    }, 300);
  }, [isExiting, navigate]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && !isExiting) {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [handleClose, isExiting]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (e.target.classList.contains('movie-details-overlay') && !isExiting) {
        handleClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClose, isExiting]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.offsetHeight;
    }

    setIsMounted(true);

    const mountTimer = setTimeout(() => {
      setIsVisible(true);
      
      const contentTimer = setTimeout(() => {
        setIsContentReady(true);
      }, 150);

      return () => clearTimeout(contentTimer);
    }, 50);

    return () => {
      clearTimeout(mountTimer);
      setIsVisible(false);
      setIsExiting(false);
      setIsContentReady(false);
      setIsMounted(false);
    };
  }, []);

  const handlePlayPause = () => {
    if (playerRef.current) {
      if (isPlaying) {
        playerRef.current.pauseVideo();
      } else {
        playerRef.current.playVideo();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleMute = () => {
    if (playerRef.current) {
      if (isMuted) {
        playerRef.current.unMute();
      } else {
        playerRef.current.mute();
      }
      setIsMuted(!isMuted);
    }
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Streaming handlers
  const handleStreamingClick = useCallback(() => {
    if (!movieDetails) return;
    
    const movie = {
      id: movieDetails.id,
      type: movieDetails.type || 'movie'
    };
    
    // Check if episode selection is needed for TV shows
    if (needsEpisodeSelection(movie)) {
      setShowEpisodeSelector(true);
      return;
    }
    
    const url = getStreamingUrl(movie);
    if (url) {
      setStreamingUrl(url);
      setShowStreamingPlayer(true);
    }
  }, [movieDetails]);

  const handleCloseStreaming = useCallback(() => {
    setShowStreamingPlayer(false);
    setStreamingUrl(null);
  }, []);

  const handleStreamingError = useCallback((error) => {
    console.error('Streaming error:', error);
    setShowStreamingPlayer(false);
    setStreamingUrl(null);
  }, []);

  const handleEpisodeSelect = useCallback((season, episode) => {
    if (!movieDetails) return;
    
    const movie = {
      id: movieDetails.id,
      type: movieDetails.type || 'movie',
      season,
      episode
    };
    
    const url = getStreamingUrl(movie);
    if (url) {
      setStreamingUrl(url);
      setShowStreamingPlayer(true);
    }
  }, [movieDetails]);

  const handleCloseEpisodeSelector = useCallback(() => {
    setShowEpisodeSelector(false);
  }, []);

  const renderDetailsTab = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-red-500 text-center py-8">
          Error loading movie details: {error}
        </div>
      );
    }

    if (!movieDetails) {
      return (
        <div className="text-white/60 text-center py-8">
          No details available for this movie.
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Production Details */}
        <div>
          <h2 className="text-white text-lg font-bold mb-4">Production Details</h2>
          <div className="space-y-4">
            {movieDetails?.production_companies && movieDetails.production_companies.length > 0 && (
              <div className="mt-8">
                <h3 className="text-xl font-semibold text-white mb-4">Production Companies</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                  {movieDetails.production_companies.map((company) => (
                    <div key={company.id} className="flex flex-col items-center">
                      <div className="w-full aspect-[3/2] bg-white rounded-lg p-4 flex items-center justify-center">
                        {company.logo_path ? (
                          <img
                            src={`https://image.tmdb.org/t/p/w185${company.logo_path}`}
                            alt={company.name}
                            className="max-w-full max-h-full object-contain"
                            onError={(e) => {
                              e.target.src = 'https://via.placeholder.com/185x123?text=No+Logo';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-[#1a1d21] text-sm font-medium text-center">{company.name}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-white text-sm mt-2 text-center">{company.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {movieDetails.production_countries && movieDetails.production_countries.length > 0 ? (
              <div>
                <h3 className="text-white/60 text-sm mb-2">Production Countries</h3>
                <div className="flex flex-wrap gap-2">
                  {movieDetails.production_countries.map(country => (
                    <span key={country.iso_3166_1} className="px-3 py-1 bg-white/5 rounded-full text-white text-sm">
                      {country.name}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-white/60 text-sm mb-2">Production Countries</h3>
                <span className="text-white/60">No production countries available</span>
              </div>
            )}
          </div>
        </div>

        {/* Additional Details */}
        <div>
          <h2 className="text-white text-lg font-bold mb-4">Additional Details</h2>
          <div className="space-y-4">
            {movieDetails.spoken_languages && movieDetails.spoken_languages.length > 0 ? (
              <div>
                <h3 className="text-white/60 text-sm mb-2">Spoken Languages</h3>
                <div className="flex flex-wrap gap-2">
                  {movieDetails.spoken_languages.map(lang => (
                    <span key={lang.iso_639_1} className="px-3 py-1 bg-white/5 rounded-full text-white text-sm">
                      {lang.english_name}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-white/60 text-sm mb-2">Spoken Languages</h3>
                <span className="text-white/60">No language information available</span>
              </div>
            )}

            <div>
              <h3 className="text-white/60 text-sm mb-2">Original Language</h3>
              <span className="text-white">{movieDetails.original_language?.toUpperCase() || 'N/A'}</span>
            </div>

            <div>
              <h3 className="text-white/60 text-sm mb-2">Budget</h3>
              <span className="text-white">
                {movieDetails.budget ? new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  notation: 'compact',
                  maximumFractionDigits: 1
                }).format(movieDetails.budget) : 'N/A'}
              </span>
            </div>

            <div>
              <h3 className="text-white/60 text-sm mb-2">Revenue</h3>
              <span className="text-white">
                {movieDetails.revenue ? new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  notation: 'compact',
                  maximumFractionDigits: 1
                }).format(movieDetails.revenue) : 'N/A'}
              </span>
            </div>

            {movieDetails.homepage && (
              <div>
                <h3 className="text-white/60 text-sm mb-2">Official Website</h3>
                <a 
                  href={movieDetails.homepage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white hover:text-white/80 transition-colors duration-300"
                >
                  {movieDetails.homepage}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="h-full flex items-center justify-center">
          <PageLoader />
        </div>
      );
    }

    if (error) {
      return (
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <h3 className="text-xl font-semibold text-white mb-2">Error Loading Content</h3>
            <p className="text-white/60">{error}</p>
          </div>
        </div>
      );
    }

    return (
      <>
        {/* Header Section */}
        <div className={`relative h-[60vh] transition-opacity duration-500 ${loadedSections.header ? 'opacity-100' : 'opacity-0'}`}>
          {movieDetails?.backdrop && (
            <div className="absolute inset-0">
              <img
                src={movieDetails.backdrop}
                alt={movieDetails.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1a1d21] to-transparent"></div>
            </div>
          )}
        </div>

        {/* Overview Section */}
        <div className={`transition-all duration-500 transform ${loadedSections.overview ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div className="md:col-span-2">
              <h2 className="text-white text-lg font-bold mb-3">Overview</h2>
              <p className="text-white/80 text-base leading-relaxed">
                {movieDetails?.overview}
              </p>
            </div>
            {/* Quick Info */}
            <div className="space-y-4">
              {/* ... your existing quick info content ... */}
            </div>
          </div>
        </div>

        {/* Cast Section */}
        <div className={`transition-all duration-500 transform ${loadedSections.cast ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <h2 className="text-white text-lg font-bold mb-4">Cast</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {credits?.cast?.slice(0, 6).map((person) => (
              <div key={person.id} className="flex flex-col items-center">
                {/* ... your existing cast card content ... */}
              </div>
            ))}
          </div>
        </div>

        {/* Production Details Section */}
        <div className={`transition-all duration-500 transform ${loadedSections.production ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Production Companies */}
            <div>
              <h2 className="text-white text-lg font-bold mb-4">Production Details</h2>
              <div className="space-y-4">
                {movieDetails?.production_companies && movieDetails.production_companies.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-xl font-semibold text-white mb-4">Production Companies</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                      {movieDetails.production_companies.map((company) => (
                        <div key={company.id} className="flex flex-col items-center">
                          {/* ... your existing production company content ... */}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Additional Details */}
            <div>
              <h2 className="text-white text-lg font-bold mb-4">Additional Details</h2>
              <div className="space-y-4">
                {/* ... your existing additional details content ... */}
              </div>
            </div>
          </div>
        </div>

        {/* Similar Movies Section */}
        <div className={`transition-all duration-500 transform ${loadedSections.similar ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <h2 className="text-white text-lg font-bold mb-4">Similar Movies</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {similarMovies?.map((movie) => (
              <div key={movie.id} className="flex flex-col">
                {/* ... your existing similar movie card content ... */}
              </div>
            ))}
          </div>
        </div>
      </>
    );
  };

  if (!movieDetails || !isMounted) return null;

  return (
    <>
      <div 
        className="movie-details-overlay"
        onClick={handleClose}
        style={{
          '--initial-top': `${modalPosition.top}px`,
          '--initial-left': `${modalPosition.left}px`,
          '--initial-width': '320px',
          '--initial-height': '262.5px'
        }}
      >
      <div 
        className="movie-details-content"
        onClick={e => e.stopPropagation()}
        ref={containerRef}
        style={{
          position: 'absolute',
          top: modalPosition.top,
          left: modalPosition.left
        }}
      >
        <div className="relative h-full flex flex-col">
          <button 
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
            onClick={handleClose}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div 
            className={`transition-opacity duration-300 ${
              isContentReady ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              willChange: 'opacity',
              transform: 'translateZ(0)'
            }}
          >
            {renderContent()}
          </div>
        </div>
      </div>
      
      {/* Streaming Player */}
      <StreamingPlayer
        streamingUrl={streamingUrl}
        title={movieDetails?.title || movieDetails?.name}
        isOpen={showStreamingPlayer}
        onClose={handleCloseStreaming}
        onError={handleStreamingError}
      />

      {/* TV Episode Selector */}
      <TVEpisodeSelector
        show={movieDetails}
        isOpen={showEpisodeSelector}
        onClose={handleCloseEpisodeSelector}
        onEpisodeSelect={handleEpisodeSelect}
      />
    </div>
    </>
  );
};

export default MovieDetails; 