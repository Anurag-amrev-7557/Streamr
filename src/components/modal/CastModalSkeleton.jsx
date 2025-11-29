import Skeleton from '../Skeleton';

const CastModalSkeleton = () => {
    return (
        <div className="w-full h-full flex flex-col md:flex-row">
            {/* LEFT SIDEBAR - Desktop Only */}
            <div className="hidden md:flex w-[320px] lg:w-[380px] bg-[#1a1a1a] border-r border-white/5 flex-col h-full min-h-[100vh] md:min-h-[96vh] overflow-y-auto custom-scrollbar shrink-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden p-8">
                <div className="flex flex-col items-center text-center">
                    {/* Profile Image Skeleton */}
                    <Skeleton className="w-48 h-72 rounded-2xl mb-6" />

                    {/* Name & Dept Skeleton */}
                    <Skeleton className="w-3/4 h-8 mb-2" />
                    <Skeleton className="w-1/3 h-6 rounded-full" />

                    {/* Social Links Skeleton */}
                    <div className="flex items-center gap-3 mt-6">
                        <Skeleton className="w-10 h-10 rounded-full" />
                        <Skeleton className="w-10 h-10 rounded-full" />
                        <Skeleton className="w-10 h-10 rounded-full" />
                    </div>
                </div>

                {/* Navigation Options Skeleton */}
                <div className="mt-8 space-y-2">
                    <Skeleton className="w-full h-12 rounded-xl" />
                    <Skeleton className="w-full h-12 rounded-xl" />
                    <Skeleton className="w-full h-12 rounded-xl" />
                </div>

                {/* Personal Info Skeleton */}
                <div className="mt-auto space-y-6 pt-6 border-t border-white/5">
                    <Skeleton className="w-1/3 h-4 mb-4" />
                    <div className="space-y-4">
                        <div>
                            <Skeleton className="w-1/4 h-3 mb-1" />
                            <Skeleton className="w-1/2 h-4" />
                        </div>
                        <div>
                            <Skeleton className="w-1/4 h-3 mb-1" />
                            <Skeleton className="w-2/3 h-4" />
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT CONTENT - Main Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#101010]">
                {/* Header Image Skeleton */}
                <div className="relative h-64 md:h-64 shrink-0 w-full">
                    <Skeleton className="w-full h-full rounded-none" />

                    <div className="absolute bottom-0 left-0 p-6 md:p-8 w-full z-10">
                        <div className="flex items-end gap-4 md:block">
                            {/* Mobile Profile Image Skeleton */}
                            <Skeleton className="md:hidden w-24 h-36 rounded-xl shrink-0" />

                            <div className="w-full">
                                <Skeleton className="w-3/4 h-8 md:h-10 mb-2" />
                                <Skeleton className="w-1/2 h-4 md:h-5" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Scrollable Content Skeleton */}
                <div className="flex-1 p-4 md:p-8 space-y-8 overflow-hidden">
                    {/* Biography Skeleton */}
                    <div className="space-y-3">
                        <Skeleton className="w-1/4 h-6 mb-4" />
                        <Skeleton className="w-full h-4" />
                        <Skeleton className="w-full h-4" />
                        <Skeleton className="w-full h-4" />
                        <Skeleton className="w-3/4 h-4" />
                        <Skeleton className="w-full h-4" />
                        <Skeleton className="w-5/6 h-4" />
                    </div>

                    {/* Mobile Personal Info Skeleton */}
                    <div className="md:hidden space-y-4 p-4 rounded-xl border border-white/5 bg-[#1a1a1a]/50">
                        <Skeleton className="w-1/3 h-4 mb-2" />
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Skeleton className="w-1/2 h-3 mb-1" />
                                <Skeleton className="w-3/4 h-4" />
                            </div>
                            <div>
                                <Skeleton className="w-1/2 h-3 mb-1" />
                                <Skeleton className="w-3/4 h-4" />
                            </div>
                        </div>
                    </div>

                    {/* Also Known As / Grid Skeleton */}
                    <div className="space-y-4">
                        <Skeleton className="w-1/3 h-6" />
                        <div className="flex flex-wrap gap-2">
                            <Skeleton className="w-24 h-8 rounded-lg" />
                            <Skeleton className="w-32 h-8 rounded-lg" />
                            <Skeleton className="w-20 h-8 rounded-lg" />
                            <Skeleton className="w-28 h-8 rounded-lg" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CastModalSkeleton;
