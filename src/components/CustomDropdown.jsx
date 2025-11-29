import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion'; // eslint-disable-line no-unused-vars
import { useRef, useEffect, useCallback, memo } from 'react';

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
                        className={`absolute top-full max-h-[22vh] overflow-y-scroll scrollbar-hide left-0 mt-2 w-full bg-[#181818] border border-white/5 rounded-2xl shadow-2xl overflow-hidden z-50 ${menuClassName}`}
                    >
                        <div className="p-2 space-y-1">
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
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default memo(CustomDropdown);
