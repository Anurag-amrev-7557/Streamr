import { motion, AnimatePresence } from 'framer-motion'; // eslint-disable-line no-unused-vars
import { LogOut, Loader2, X } from 'lucide-react';
// import clsx from 'clsx';

const LogoutModal = ({ isOpen, onClose, onConfirm, isLoggingOut }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={!isLoggingOut ? onClose : undefined}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
                    >
                        {/* Modal Content */}
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#181818] border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden relative"
                        >
                            {/* Close Button */}
                            {!isLoggingOut && (
                                <button
                                    onClick={onClose}
                                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            )}

                            <div className="p-6 flex flex-col items-center text-center">
                                <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-4">
                                    <LogOut className="w-8 h-8 text-white" />
                                </div>

                                <h3 className="text-xl font-bold text-white mb-2">Sign Out?</h3>
                                <p className="text-gray-400 mb-8">
                                    Are you sure you want to sign out? You'll need to sign in again to access your list and watch history.
                                </p>

                                <div className="flex gap-3 w-full">
                                    <button
                                        onClick={onClose}
                                        disabled={isLoggingOut}
                                        className="flex-1 px-4 py-3 rounded-full font-medium text-gray-300 hover:text-white bg-white/10 hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={onConfirm}
                                        disabled={isLoggingOut}
                                        className="flex-1 px-4 py-3 rounded-full font-medium bg-white/90 hover:bg-white/80 text-black transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        {isLoggingOut ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Signing Out...
                                            </>
                                        ) : (
                                            'Sign Out'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default LogoutModal;
