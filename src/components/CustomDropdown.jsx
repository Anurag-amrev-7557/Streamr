import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRef, useEffect, useCallback, memo, useState } from 'react';

// Memoized DropdownItem to prevent unnecessary re-renders
const DropdownItem = memo(({
    option,
    isSelected,
    onClick,
    renderOption,
    itemClassName
}) => {
    const handleClick = useCallback(() => {
        onClick(option.value || option);
    }, [onClick, option]);

    return (
        <button
            onClick={handleClick}
            className={`w-full text-left px-3 py-2 rounded-[0.6rem] text-sm transition-colors ${(option.value || option) === isSelected
                ? 'bg-white text-black font-semibold'
                : 'text-gray-300 hover:bg-white/10'
                } ${itemClassName}`}
        >
            {renderOption ? renderOption(option) : (option.label || option)}
        </button>
    );
});

DropdownItem.displayName = 'DropdownItem';

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
    const rafRef = useRef(null);
    const [canScrollDown, setCanScrollDown] = useState(false);

    // Optimized click outside handler
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside, { passive: true });
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, setIsOpen]);

    // Scroll handler using RequestAnimationFrame
    const checkScroll = useCallback(() => {
        if (rafRef.current) return;

        rafRef.current = requestAnimationFrame(() => {
            if (listRef.current) {
                const { scrollTop, scrollHeight, clientHeight } = listRef.current;
                // Add a small buffer (1px) to account for sub-pixel rendering
                setCanScrollDown(scrollTop + clientHeight < scrollHeight - 1);
            }
            rafRef.current = null;
        });
    }, []);

    // Cleanup RAF on unmount
    useEffect(() => {
        return () => {
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
            }
        };
    }, []);

    // Initial scroll check when opening
    useEffect(() => {
        if (isOpen) {
            // Small timeout to ensure rendering is complete before checking scroll
            const timer = setTimeout(checkScroll, 0);
            return () => clearTimeout(timer);
        }
    }, [isOpen, options, checkScroll]);

    const handleSelect = useCallback((optionValue) => {
        onChange(optionValue);
        setIsOpen(false);
    }, [onChange, setIsOpen]);

    const handleToggle = useCallback(() => {
        setIsOpen(prev => !prev);
    }, [setIsOpen]);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={handleToggle}
                className={`flex items-center justify-between gap-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-full px-6 py-2.5 text-sm text-white transition-all ${buttonClassName}`}
            >
                {renderValue ? renderValue(value) : value}
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className={`absolute top-full left-0 mt-2 w-full bg-[#181818] border border-white/5 rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col ${menuClassName}`}
                        style={{
                            maxHeight: '22vh',
                            willChange: 'transform, opacity'
                        }}
                    >
                        <div
                            ref={listRef}
                            onScroll={checkScroll}
                            className="overflow-y-auto scrollbar-hide p-2 space-y-1 flex-1"
                            style={{ contain: 'content' }}
                        >
                            {options.map((option) => (
                                <DropdownItem
                                    key={option.value || option}
                                    option={option}
                                    isSelected={value}
                                    onClick={handleSelect}
                                    renderOption={renderOption}
                                    itemClassName={itemClassName}
                                />
                            ))}
                        </div>

                        {/* Scroll Indicator */}
                        <AnimatePresence>
                            {canScrollDown && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.2 }}
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
