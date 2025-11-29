import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion'; // eslint-disable-line no-unused-vars
import { X, ShieldCheck } from 'lucide-react';

const AdBlockerToast = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [isDesktop, setIsDesktop] = useState(false);

    useEffect(() => {
        // Check if user is on desktop (width >= 768px)
        const checkDesktop = () => {
            setIsDesktop(window.innerWidth >= 768);
        };

        // Initial check
        checkDesktop();

        // Listen for window resize
        window.addEventListener('resize', checkDesktop);

        // Check if toast has been shown before
        const hasSeenToast = localStorage.getItem('adBlockerToastShown');

        // Show toast only if:
        // 1. User hasn't seen it before
        // 2. User is on desktop
        if (!hasSeenToast && window.innerWidth >= 768) {
            // Delay to show toast after page loads
            const timer = setTimeout(() => {
                setIsVisible(true);
            }, 2000);

            return () => {
                clearTimeout(timer);
                window.removeEventListener('resize', checkDesktop);
            };
        }

        return () => window.removeEventListener('resize', checkDesktop);
    }, []);

    const handleDismiss = () => {
        setIsVisible(false);
        localStorage.setItem('adBlockerToastShown', 'true');
    };

    // Don't render anything if not desktop
    if (!isDesktop) return null;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{
                        opacity: 0,
                        x: 60,
                        y: -30,
                        scale: 0.9
                    }}
                    animate={{
                        opacity: 1,
                        x: 0,
                        y: 0,
                        scale: 1
                    }}
                    exit={{
                        opacity: 0,
                        x: 60,
                        scale: 0.95,
                        transition: {
                            duration: 0.3,
                            ease: [0.4, 0, 1, 1]
                        }
                    }}
                    transition={{
                        type: "spring",
                        stiffness: 260,
                        damping: 20,
                        mass: 0.8
                    }}
                    className="fixed top-20 right-6 z-[60] w-[420px] bg-black/40 backdrop-blur-xl backdrop-saturate-150 border border-white/20 rounded-2xl shadow-2xl overflow-hidden"
                    style={{ backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}
                >
                    {/* Close Button */}
                    <button
                        onClick={handleDismiss}
                        className="absolute top-4 right-4 text-white/60 hover:text-white hover:bg-white/10 rounded-full p-1.5 transition-all duration-200 z-10"
                        aria-label="Close notification"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    {/* Content */}
                    <div className="p-6 pr-12">
                        {/* Icon and Title */}
                        <div className="flex items-center gap-3 mb-3">
                            <div className="flex-shrink-0 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center ring-1 ring-white/20">
                                <ShieldCheck className="w-5 h-5 text-white" />
                            </div>
                            <h3 className="text-white font-bold text-lg leading-tight">
                                Enjoy Ad-Free Streaming
                            </h3>
                        </div>

                        {/* Message */}
                        <p className="text-gray-300 text-sm leading-relaxed mb-5">
                            For the best viewing experience, install an ad blocker to watch content without interruptions.
                        </p>

                        {/* Action Buttons */}
                        <div className="flex gap-2.5">
                            <a
                                href="https://chromewebstore.google.com/detail/ublock-origin/cjpalhdlnbpafiamejdnhcphjbkeiagm"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center w-full bg-white hover:bg-white/90 text-black font-semibold text-sm px-4 py-2.5 rounded-full transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <ShieldCheck className="w-4 h-4 mr-2" />
                                uBlock Origin
                            </a>
                            <a
                                href="https://chromewebstore.google.com/detail/ublock-origin-lite/ddkjiahejlhfcafbddmgiahcphecmpfh"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center w-full bg-white/10 hover:bg-white/20 text-white font-medium text-sm px-4 py-2.5 rounded-full transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] border border-white/20"
                            >
                                uBlock Origin Lite
                            </a>
                        </div>
                    </div>

                    {/* Decorative Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default AdBlockerToast;
