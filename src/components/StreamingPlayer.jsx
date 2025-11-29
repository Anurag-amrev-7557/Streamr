import { useState, useEffect } from 'react';
import { X, Settings, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion'; // eslint-disable-line no-unused-vars
import { STREAMING_SERVICES, DEFAULT_STREAMING_SERVICE } from '../lib/constants';
import CustomDropdown from './CustomDropdown';

const StreamingPlayer = ({ movie, type = 'movie', season = 1, episode = 1, onClose }) => {
    const [currentService, setCurrentService] = useState(() => {
        return localStorage.getItem('preferredService') || DEFAULT_STREAMING_SERVICE;
    });
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [iframeUrl, setIframeUrl] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Validate props


    useEffect(() => {
        if (!movie || !movie.id) return;
        setIsLoading(true); // eslint-disable-line react-hooks/set-state-in-effect
        const service = STREAMING_SERVICES[currentService] || STREAMING_SERVICES[DEFAULT_STREAMING_SERVICE];
        let url = service.baseUrl;

        if (type === 'movie') {
            url += service.movieFormat.replace('{id}', movie.id);
        } else {
            url += service.tvFormat
                .replace('{id}', movie.id)
                .replace('{season}', season)
                .replace('{episode}', episode);
        }

        setIframeUrl(url);
        localStorage.setItem('preferredService', currentService);
    }, [currentService, movie, type, season, episode]);

    // Smart Prefetching for Next Episodes (TV Shows)
    useEffect(() => {
        // Placeholder for future prefetching logic
        if (type === 'tv' && movie?.id) {
            // Logic to prefetch next episode can be added here
        }
    }, [type, movie, season]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    if (!movie || !movie.id) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, pointerEvents: 'none' }}
            onClick={(e) => e.stopPropagation()}
            className="fixed inset-0 z-[100] bg-black"
        >
            {/* Loading Spinner */}
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                    <Loader2 className="w-10 h-10 text-white animate-spin" />
                </div>
            )}

            {/* Iframe Container */}
            <iframe
                src={iframeUrl || null}
                className={`w-full h-full border-none transition-opacity duration-500 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                referrerPolicy="no-referrer-when-downgrade"
                title="Streaming Player"
                onLoad={() => setIsLoading(false)}
            />

            {/* Service Toggler - Left */}
            <div className="absolute top-4 left-4 md:left-8 z-20" onClick={(e) => e.stopPropagation()}>
                <CustomDropdown
                    value={currentService}
                    options={Object.entries(STREAMING_SERVICES).map(([key, service]) => ({
                        value: key,
                        label: service.name,
                        description: service.description
                    }))}
                    onChange={setCurrentService}
                    isOpen={isDropdownOpen}
                    setIsOpen={setIsDropdownOpen}
                    buttonClassName="bg-black/60 hover:bg-black/80 text-white px-4 py-2 rounded-full border border-white/20 backdrop-blur-md"
                    menuClassName="w-64"
                    renderValue={(val) => (
                        <>
                            <Settings className="w-4 h-4" />
                            <span className="font-medium text-sm inline">
                                Server: {STREAMING_SERVICES[val].name}
                            </span>
                        </>
                    )}
                    renderOption={(option) => (
                        <div className="flex items-center justify-between w-full">
                            <span>{option.label}</span>
                            <span className={`text-xs ${currentService === option.value ? 'text-gray-600' : 'text-gray-500'}`}>
                                {option.description}
                            </span>
                        </div>
                    )}
                />
            </div>

            {/* Close Button - Right */}
            <div className="absolute top-4 right-4 md:right-8 z-20">
                <button
                    onClick={onClose}
                    className="bg-black/60 hover:bg-black/80 p-2 rounded-full transition text-white border border-white/20 backdrop-blur-md"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>
        </motion.div>
    );
};

export default StreamingPlayer;
