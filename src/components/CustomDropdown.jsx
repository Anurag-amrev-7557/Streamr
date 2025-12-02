import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion'; // eslint-disable-line no-unused-vars
import { useRef, useEffect, useCallback, memo, useState } from 'react';

const CustomDropdown = ({
    value,
    options,
    onChange,
    isOpen,
    setIsOpen,
    buttonClassName = '',
    menuClassName = '',
    itemClassName = '',
    renderValue,
    renderOption
}) => {
    const dropdownRef = useRef(null);
    const listRef = useRef(null);
    const [canScrollDown, setCanScrollDown] = useState(false);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, setIsOpen]);

    const checkScroll = useCallback(() => {
        if (listRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = listRef.current;
            setCanScrollDown(scrollTop + clientHeight < scrollHeight - 1);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            // Small timeout to ensure rendering is complete
            const timer = setTimeout(checkScroll, 0);
            return () => clearTimeout(timer);
        }
    }, [isOpen, options, checkScroll]);

    const handleSelect = useCallback((option) => {
        onChange(option);
        setIsOpen(false);
    }, [onChange, setIsOpen]);

    const handleToggle = useCallback(() => {
        setIsOpen(!isOpen);
    }, [isOpen, setIsOpen]);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={handleToggle}
                className={`flex items-center justify-between gap-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-full px-6 py-2.5 text-sm text-white transition-all ${buttonClassName}`}
            >
                {renderValue ? renderValue(value) : value}
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className={`absolute top-full left-0 mt-2 w-full bg-[#181818] border border-white/5 rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col ${menuClassName}`}
                        style={{ maxHeight: '22vh' }}
                    >
                        <div
                            ref={listRef}
                            onScroll={checkScroll}
                            className="overflow-y-auto scrollbar-hide p-2 space-y-1 flex-1"
                        >
                            {options.map((option) => (
                                <button
                                    key={option.value || option}
                                    onClick={() => handleSelect(option.value || option)}
                                    className={`w-full text-left px-3 py-2 rounded-[0.6rem] text-sm transition ${(option.value || option) === value
                                        ? 'bg-white text-black font-semibold'
                                        : 'text-gray-300 hover:bg-white/10'
                                        } ${itemClassName}`}
                                >
                                    {renderOption ? renderOption(option) : (option.label || option)}
                                </button>
                            ))}
                        </div>

                        {/* Scroll Indicator */}
                        <AnimatePresence>
                            {canScrollDown && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#181818] to-transparent pointer-events-none flex items-end justify-center pb-1"
                                >
                                    <ChevronDown className="w-4 h-4 text-white/50 animate-bounce" />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default memo(CustomDropdown);
