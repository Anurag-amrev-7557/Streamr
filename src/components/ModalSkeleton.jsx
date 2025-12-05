import { memo } from 'react';
import Skeleton from './Skeleton';

const ModalSkeleton = memo(() => {
    return (
        <div className="w-full bg-[#1a1a1a]">
            {/* Hero Section Skeleton */}
            <div className="relative h-[55vh] md:h-[65vh] lg:h-[700px] w-full">
                {/* Hero Image Skeleton */}
                <Skeleton className="absolute inset-0 w-full h-full rounded-none" />

                {/* Hero Content Overlay Skeleton */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#101010] via-[#101010]/60 to-transparent z-10" />
                <div className="absolute inset-0 z-20 p-4 md:p-12 flex flex-col justify-end">
                    <div className="space-y-3 md:space-y-8">
                        {/* Logo/Title Skeleton */}
                        <Skeleton className="w-64 md:w-96 h-16 md:h-24" />

                        {/* Metadata Row Skeleton */}
                        <div className="flex items-center gap-3 flex-wrap">
                            <Skeleton className="w-24 h-5" />
                            <Skeleton className="w-16 h-5" />
                            <Skeleton className="w-20 h-5" />
                        </div>

                        {/* Buttons Skeleton */}
                        <div className="flex gap-2 md:gap-3 flex-wrap">
                            <Skeleton className="w-36 h-10 md:h-11 rounded-full" />
                            <Skeleton className="w-28 h-10 md:h-11 rounded-full" />
                            <Skeleton className="w-32 h-10 md:h-11 rounded-full" />
                        </div>

                        {/* Description Skeleton */}
                        <div className="space-y-2 max-w-3xl">
                            <Skeleton className="w-full h-4" />
                            <Skeleton className="w-4/5 h-4" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Episodes Section Skeleton (for TV shows) */}
            <div className="px-4 md:px-12 py-6 bg-[#101010]">
                <Skeleton className="w-32 h-6 mb-4" />
                <div className="grid grid-cols-1 gap-3">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex gap-3 p-3 rounded-lg bg-[#1a1a1a]">
                            <Skeleton className="w-32 h-20 rounded flex-shrink-0" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="w-3/4 h-5" />
                                <Skeleton className="w-full h-3" />
                                <Skeleton className="w-2/3 h-3" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Bottom Section Skeleton */}
            <div className="px-4 md:px-12 py-6 bg-[#101010]">
                {/* Tab Buttons Skeleton */}
                <div className="flex gap-6 border-b border-white/10 mb-6">
                    <Skeleton className="w-32 h-8 mb-3" />
                    <Skeleton className="w-24 h-8 mb-3" />
                </div>

                {/* Similar Movies Grid Skeleton */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="space-y-2">
                            <Skeleton className="w-full aspect-video rounded" />
                            <Skeleton className="w-3/4 h-4" />
                            <Skeleton className="w-1/2 h-3" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
});

ModalSkeleton.displayName = 'ModalSkeleton';

export default ModalSkeleton;

