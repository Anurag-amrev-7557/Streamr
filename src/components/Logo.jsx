import { memo } from 'react';
import { Link } from 'react-router-dom';

const Logo = memo(({ className = "", showText = true, isSmall = false, textClassName = "" }) => (
    <Link to="/" className={`flex items-center gap-2 group ${className}`}>
        <svg
            width={isSmall ? "20" : "22"}
            height={isSmall ? "20" : "22"}
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={`${isSmall ? "w-5 h-5" : "w-6 h-6 md:w-[26px] md:h-[26px]"} group-hover:scale-110 transition-transform`}
        >
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M24 4H42V17.3333V30.6667H24V44H6V30.6667V17.3333H24V4Z"
                fill="#fff"
            />
        </svg>
        {showText && (
            <span className={`${isSmall ? "text-base" : "text-xl md:text-[1.5rem]"} font-bold text-white tracking-tighter block ${textClassName}`}>
                Streamr
            </span>
        )}
    </Link>
));

Logo.displayName = 'Logo';

export default Logo;
