import { motion, AnimatePresence } from 'framer-motion'; // eslint-disable-line no-unused-vars
import { AlertTriangle } from 'lucide-react';
import { useEffect, useCallback, memo, useState } from 'react';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel' }) => {
    const [isProcessing, setIsProcessing] = useState(false);

    // Lock body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = 'unset';
            };
        }
    }, [isOpen]);

    const handleConfirm = useCallback(() => {
        if (isProcessing) return;
        setIsProcessing(true);
        onConfirm();
        setIsProcessing(false);
        onClose();
    }, [isProcessing, onConfirm, onClose]);

    const handleClose = useCallback(() => {
        if (!isProcessing) {
            onClose();
        }
    }, [isProcessing, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, pointerEvents: 'none' }}
                    onClick={handleClose}
                    className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-[#181818] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl"
                    >
                        <div className="flex items-start gap-4 mb-6">
                            <div className="flex-shrink-0 w-12 h-12 bg-white-600/10 border border-white-300/20 rounded-full flex items-center justify-center">
                                <AlertTriangle className="w-6 h-6 text-white-300" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                                <p className="text-sm text-gray-400">{message}</p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleClose}
                                disabled={isProcessing}
                                className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-white font-medium transition-all"
                            >
                                {cancelText}
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleConfirm}
                                disabled={isProcessing}
                                className="flex-1 px-4 py-2.5 bg-white hover:bg-white/90 rounded-full text-black font-medium transition-all shadow-lg shadow-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {confirmText}
                            </motion.button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default memo(ConfirmModal);
