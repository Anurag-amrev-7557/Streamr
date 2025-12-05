import { memo } from 'react';
import Skeleton from './Skeleton';
import clsx from 'clsx';
import useIsMobile from '../hooks/useIsMobile';

const RowSkeleton = ({ count = 1 }) => {
    const isMobile = useIsMobile();

    // Match dimensions from Row.jsx
    // mobile: { width: 170, height: 255 } -> aspect-[2/3]
    // desktop: { width: 360, height: 203 } -> aspect-[16/9]

    return (
        <>
            {[...Array(count)].map((_, i) => (
                <div key={i} className="mb-4 md:mb-6 group relative">
                    {/* Title Skeleton */}
                    <div className="flex items-center justify-between px-4 md:px-12 mb-2 md:mb-3">
                        <Skeleton className="h-4 md:h-6 w-32 md:w-48" />
                    </div>

                    {/* Cards Skeleton Row */}
                    <div className="flex gap-2 md:gap-2 overflow-hidden px-3 md:px-6 py-4 md:py-6">
                        {[...Array(6)].map((_, j) => (
                            <div
                                key={j}
                                className={clsx(
                                    "flex-shrink-0 w-[170px] md:w-[240px] lg:w-[280px] xl:w-[360px] rounded-lg overflow-hidden relative",
                                    // Default to standard card aspect ratio, matching Row.jsx logic
                                    "aspect-[2/3] md:aspect-[16/9]"
                                )}
                            >
                                <Skeleton className="w-full h-full absolute inset-0" />
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </>
    );
};

export default memo(RowSkeleton);
