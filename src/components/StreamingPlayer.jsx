import { useState, useEffect } from 'react';
import { X, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { STREAMING_SERVICES, DEFAULT_STREAMING_SERVICE } from '../lib/constants';
import CustomDropdown from './CustomDropdown';

const StreamingPlayer = ({ movie, type = 'movie', season = 1, episode = 1, onClose }) => {
    const [currentService, setCurrentService] = useState(DEFAULT_STREAMING_SERVICE);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [iframeUrl, setIframeUrl] = useState('');

    useEffect(() => {
        const service = STREAMING_SERVICES[currentService];
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
    }, [currentService, movie, type, season, episode]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, pointerEvents: 'none' }}
            onClick={(e) => e.stopPropagation()}
            className="fixed inset-0 z-[100] bg-black"
        >
            {/* Iframe Container */}
            <iframe
                src={iframeUrl}
                className="w-full h-full border-none"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                title="Streaming Player"
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
                            <span className="font-medium text-sm hidden md:inline">
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
