import React, { memo } from 'react';

// Static data outside component to prevent recreation
const LOADING_LETTERS = ['L', 'O', 'A', 'D', 'I', 'N', 'G', '.', '.', '.'];

// Loading component with enhanced Netflix-style animation - GPU optimized
const PageLoader = memo(() => {
    return (
        <div
            className="fixed inset-0 w-full bg-black overflow-hidden z-50 pageloader-container"
            style={{
                transform: 'translateZ(0)', // Force GPU acceleration
                backfaceVisibility: 'hidden',
                perspective: 1000
            }}
        >
            {/* Radial gradient background - static, no animation */}
            <div className="absolute inset-0 bg-gradient-radial from-white/5 via-transparent to-transparent opacity-50"></div>

            {/* Animated Logo - absolutely centered */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                    {/* Outer glow ring - slow pulse - optimized */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div
                            className="w-32 h-32 bg-white/3 rounded-full animate-ping-optimized"
                            style={{
                                animationDuration: '3s',
                                willChange: 'transform, opacity',
                                transform: 'translateZ(0)'
                            }}
                        ></div>
                    </div>

                    {/* Middle glow ring - medium pulse - optimized */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div
                            className="w-24 h-24 bg-white/5 rounded-full animate-ping-optimized"
                            style={{
                                animationDuration: '2s',
                                willChange: 'transform, opacity',
                                transform: 'translateZ(0)'
                            }}
                        ></div>
                    </div>

                    {/* Inner glow - fast pulse - optimized */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div
                            className="w-16 h-16 bg-white/10 rounded-full animate-pulse-optimized"
                            style={{
                                animationDuration: '1.5s',
                                willChange: 'opacity',
                                transform: 'translateZ(0)'
                            }}
                        ></div>
                    </div>

                    {/* Main logo with breathing animation and shadow - optimized */}
                    <div
                        className="relative z-10 drop-shadow-2xl"
                        style={{
                            willChange: 'opacity',
                            transform: 'translateZ(0)'
                        }}
                    >
                        <svg
                            width="80"
                            height="80"
                            viewBox="0 0 48 48"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="animate-pulse-optimized filter drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]"
                            style={{
                                animationDuration: '2s',
                                willChange: 'opacity'
                            }}
                        >
                            <path
                                fillRule="evenodd"
                                clipRule="evenodd"
                                d="M24 4H42V17.3333V30.6667H24V44H6V30.6667V17.3333H24V4Z"
                                fill="#fff"
                            />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Enhanced loading text - absolutely positioned - optimized */}
            <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{
                    marginTop: '140px',
                    transform: 'translateZ(0)'
                }}
            >
                <div className="flex items-center gap-1.5">
                    {LOADING_LETTERS.map((letter, index) => (
                        <span
                            key={index}
                            className="text-gray-300 text-sm font-semibold tracking-wider animate-pulse-optimized"
                            style={{
                                animationDuration: '2s',
                                animationDelay: `${index * 0.1}s`,
                                textShadow: '0 0 10px rgba(255,255,255,0.3)',
                                willChange: 'opacity',
                                transform: 'translateZ(0)'
                            }}
                        >
                            {letter}
                        </span>
                    ))}
                </div>
            </div>

            {/* Subtle loading bar - absolutely positioned - optimized */}
            <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{
                    marginTop: '200px',
                    transform: 'translateZ(0)'
                }}
            >
                <div className="w-48 h-0.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-transparent via-white/60 to-transparent w-1/3 animate-[shimmer_1.5s_ease-in-out_infinite]"
                        style={{
                            willChange: 'transform',
                            transform: 'translateZ(0)'
                        }}
                    ></div>
                </div>
            </div>
        </div>
    );
});

PageLoader.displayName = 'PageLoader';

export default PageLoader;
