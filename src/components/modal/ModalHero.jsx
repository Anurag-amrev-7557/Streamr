import React from 'react';
import clsx from 'clsx';
import {
    HeroBackground,
    HeroTitle,
    HeroMetadata,
    HeroActions,
    HeroCast,
    HeroGenres,
    HeroInfo
} from './ModalHeroComponents';

const ModalHero = ({
    movie,
    movieDetails,
    logoPath,
    cast,
    isMobile,
    activeTab,
    handleListToggle,
    inList,
    handleTrailerOpen,
    trailerKey,
    onPlay,
    getHistoryItem,
    director,
    creators,
    onDownload
}) => {
    const hasHistory = !!getHistoryItem(movie.id);

    const handlePlay = () => {
        const historyItem = getHistoryItem(movie.id);
        const season = historyItem?.season || 1;
        const episode = historyItem?.episode || 1;
        onPlay(season, episode);
    };

    return (
        <>
            {/* MOBILE LAYOUT - OVERVIEW TAB */}
            <div className={clsx(
                "relative w-full bg-[#101010]",
                isMobile ? (activeTab === 'overview' ? "min-h-screen pb-20" : "hidden") : "hidden"
            )}>
                {/* Hero Image Section */}
                <div className="relative h-[55vh] w-full">
                    <HeroBackground movie={movie} isMobile={true} />

                    {/* Hero Content Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-5 pb-12 z-20 flex flex-col items-start gap-3">
                        <HeroTitle movie={movie} logoPath={logoPath} isMobile={true} />
                        <HeroGenres movieDetails={movieDetails} isMobile={true} />
                    </div>
                </div>

                {/* Action Buttons */}
                <HeroActions
                    onPlay={handlePlay}
                    handleTrailerOpen={handleTrailerOpen}
                    handleListToggle={handleListToggle}
                    inList={inList}
                    trailerKey={trailerKey}
                    isMobile={true}
                    hasHistory={hasHistory}
                    onDownload={onDownload}
                />

                {/* Info Section */}
                <div className="px-5 space-y-6">
                    <HeroMetadata movie={movie} movieDetails={movieDetails} isMobile={true} />

                    {/* Description */}
                    <div>
                        <p className="text-gray-100 text-sm leading-relaxed line-clamp-4">
                            {movie.overview}
                        </p>
                    </div>

                    <HeroInfo director={director} creators={creators} />
                    <HeroCast cast={cast} isMobile={true} />
                </div>
            </div>

            {/* DESKTOP LAYOUT */}
            <div className={clsx(
                "relative md:h-[55vh] lg:h-[65vh] xl:h-[700px]",
                isMobile ? "hidden" : "h-[400px]"
            )}>
                <HeroBackground movie={movie} isMobile={false} />

                {/* Content Grid */}
                <div className="absolute inset-0 z-20 p-4 md:p-12 flex flex-col justify-end">
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 md:gap-6 items-end">
                        {/* Left Side - Title, Metadata, Buttons, Description */}
                        <div className="space-y-3 md:space-y-8 flex flex-col items-center md:items-start text-center md:text-left">
                            <HeroTitle movie={movie} logoPath={logoPath} isMobile={false} />
                            <HeroMetadata movie={movie} movieDetails={movieDetails} isMobile={false} />

                            <HeroActions
                                onPlay={handlePlay}
                                handleTrailerOpen={handleTrailerOpen}
                                handleListToggle={handleListToggle}
                                inList={inList}
                                trailerKey={trailerKey}
                                isMobile={false}
                                hasHistory={hasHistory}
                                onDownload={onDownload}
                            />

                            {/* Description */}
                            <p className="text-xs md:text-base text-gray-300 leading-relaxed max-w-3xl line-clamp-2 md:line-clamp-3">
                                {movie.overview}
                            </p>
                        </div>

                        {/* Right Side - Genre Tags and Cast */}
                        <div className="hidden md:flex flex-col items-end gap-4">
                            <HeroGenres movieDetails={movieDetails} isMobile={false} />
                            <HeroCast cast={cast} isMobile={false} />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ModalHero;
