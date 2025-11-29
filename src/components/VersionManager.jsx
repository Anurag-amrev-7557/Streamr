import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion'; // eslint-disable-line no-unused-vars
import { RefreshCw, X } from 'lucide-react';
import clsx from 'clsx';

const POLLING_INTERVAL = 60 * 1000; // Check every minute

const VersionManager = () => {
    const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
    const isCheckingRef = useRef(false);

    const checkForUpdate = useCallback(async () => {
        if (isCheckingRef.current) return;

        try {
            isCheckingRef.current = true;
            // Append timestamp to prevent caching of the version file itself
            const response = await fetch(`/version.json?t=${Date.now()}`);
            if (!response.ok) return;

            const data = await response.json();
            const currentVersion = __APP_VERSION__; // Defined in vite.config.js
            const latestVersion = data.version;

            // If versions differ, an update is available
            // We use string comparison as timestamps are strings
            if (latestVersion && currentVersion && latestVersion !== currentVersion) {
                console.log(`New version detected: ${latestVersion} (Current: ${currentVersion})`);
                setIsUpdateAvailable(true);
            }
        } catch (error) {
            console.error('Failed to check for updates:', error);
        } finally {
            isCheckingRef.current = false;
        }
    }, []);

    useEffect(() => {
        // Initial check
        checkForUpdate();

        // Poll for updates
        const intervalId = setInterval(checkForUpdate, POLLING_INTERVAL);

        // Also check when window regains focus
        const handleFocus = () => checkForUpdate();
        window.addEventListener('focus', handleFocus);

        return () => {
            clearInterval(intervalId);
            window.removeEventListener('focus', handleFocus);
        };
    }, [checkForUpdate]);

    const handleUpdate = async () => {
        // Unregister service worker to ensure fresh content
        if ('serviceWorker' in navigator) {
            try {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const registration of registrations) {
                    await registration.unregister();
                }
            } catch (e) {
                console.error('Failed to unregister SW:', e);
            }
        }

        // Clear all caches (Cache API)
        if ('caches' in window) {
            try {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => caches.delete(name)));
                console.log('Caches cleared');
            } catch (e) {
                console.error('Failed to clear caches:', e);
            }
        }

        // Force reload with timestamp to bypass browser cache for index.html
        const url = new URL(window.location.href);
        url.searchParams.set('t', Date.now());
        window.location.href = url.toString();
    };

    const handleDismiss = () => {
        setIsUpdateAvailable(false);
    };

    const location = useLocation();
    const currentPath = location.pathname;
    const isNavbarHidden = ['/login', '/signup', '/watch'].some(path => currentPath.includes(path));
    const isNavbarVisible = !isNavbarHidden;

    return (
        <AnimatePresence>
            {isUpdateAvailable && (
                <motion.div
                    initial={{ y: 100, opacity: 0, x: '-50%' }}
                    animate={{ y: 0, opacity: 1, x: '-50%' }}
                    exit={{ y: 100, opacity: 0, x: '-50%' }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className={clsx(
                        "fixed left-1/2 z-[100] flex items-center gap-4 bg-black/60 border border-white/10 pl-4 pr-2 py-2 rounded-full shadow-2xl backdrop-blur-xl backdrop-saturate-150",
                        isNavbarVisible
                            ? "bottom-24 w-full max-w-[320px] justify-between"
                            : "bottom-6 w-auto max-w-[90vw]"
                    )}
                >
                    {/* Icon & Text */}
                    <div className="flex items-center gap-3">
                        <div className="relative flex items-center justify-center w-8 h-8 bg-white/10 rounded-full -ml-2">
                            <RefreshCw className="w-4 h-4 text-white animate-spin-slow" />
                            <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 border-2 border-black rounded-full">
                                <span className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75"></span>
                            </span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-white text-sm font-medium leading-none">New Update</span>
                            <span className="text-white/50 text-[10px] font-medium leading-tight mt-0.5">Version available</span>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="w-px h-8 bg-white/10 mx-1"></div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleUpdate}
                            className="px-4 py-1.5 bg-white text-black text-xs font-bold rounded-full hover:bg-gray-200 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                        >
                            Update
                        </button>
                        <button
                            onClick={handleDismiss}
                            className="p-2 hover:bg-white/10 rounded-full text-white/60 hover:text-white transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default VersionManager;
