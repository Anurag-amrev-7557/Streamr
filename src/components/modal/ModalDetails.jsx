import React, { memo, useCallback } from 'react';
import ImageWithPlaceholder from '../ImageWithPlaceholder';
import useModalStore from '../../store/useModalStore';

// --- Helper Components ---

const InfoSection = memo(({ title, content, children }) => {
    if (!content && !children) return null;
    return (
        <div>
            <p className="text-sm text-gray-500 mb-1">{title}</p>
            {children || <p className="text-base text-white font-medium">{content}</p>}
        </div>
    );
});
InfoSection.displayName = 'InfoSection';

const GenreList = memo(({ genres }) => {
    if (!genres?.length) return null;
    return (
        <div>
            <p className="text-sm text-gray-500 mb-1">Genres</p>
            <div className="flex flex-wrap gap-2">
                {genres.map((genre, index) => (
                    <span key={`${genre.id}-${index}`} className="text-xs px-2 py-1 bg-white/10 rounded-md text-gray-200">
                        {genre.name}
                    </span>
                ))}
            </div>
        </div>
    );
});
GenreList.displayName = 'GenreList';

const StatsItem = memo(({ label, value, children }) => (
    <div>
        <p className="text-sm text-gray-500 mb-1">{label}</p>
        {children || <p className="text-sm text-white font-medium">{value}</p>}
    </div>
));
StatsItem.displayName = 'StatsItem';

const ProductionCompanies = memo(({ companies }) => {
    if (!companies?.length) return null;

    const withLogo = companies.filter(c => c.logo_path).slice(0, 4);
    const withoutLogo = companies.filter(c => !c.logo_path).slice(0, 3);

    return (
        <div className="col-span-1 md:col-span-2">
            <p className="text-sm text-gray-500 mb-3">Production</p>
            <div className="flex flex-wrap items-center gap-6">
                {withLogo.map((company, index) => (
                    <div key={`${company.id}-${index}`} className="bg-white/90 p-2 rounded h-8 flex items-center justify-center relative w-auto min-w-[60px]">
                        <ImageWithPlaceholder
                            src={`https://image.tmdb.org/t/p/w200${company.logo_path}`}
                            placeholderSrc={`https://image.tmdb.org/t/p/w45${company.logo_path}`}
                            alt={company.name}
                            className="h-full w-auto"
                            imgClassName="object-contain"
                        />
                    </div>
                ))}
                {withoutLogo.map((company, index) => (
                    <span key={`${company.id}-${index}`} className="text-sm text-gray-400">
                        {company.name}
                    </span>
                ))}
            </div>
        </div>
    );
});
ProductionCompanies.displayName = 'ProductionCompanies';

const ModalSkeleton = () => (
    <div className="animate-pulse space-y-4">
        <div className="h-4 bg-white/10 rounded w-1/4"></div>
        <div className="h-4 bg-white/10 rounded w-3/4"></div>
        <div className="h-4 bg-white/10 rounded w-1/4"></div>
        <div className="h-4 bg-white/10 rounded w-1/2"></div>
    </div>
);

// --- Main Component ---

const ModalDetails = memo(({ isLoading, cast, movieDetails, movie, director, creators }) => {
    const openCastModal = useCallback((person) => {
        useModalStore.getState().openCastModal(person);
    }, []);

    if (isLoading) return <ModalSkeleton />;

    const getYear = (dateString) => dateString?.substring(0, 4) || 'N/A';
    const originalTitle = movieDetails?.original_title || movieDetails?.original_name;
    const currentTitle = movie.title || movie.name;
    const showOriginalTitle = originalTitle && originalTitle !== currentTitle;

    return (
        <div className="space-y-8 max-w-3xl">
            {/* Main Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column */}
                <div className="space-y-6">
                    <InfoSection title="Director" content={director?.name} />

                    <InfoSection title="Creators">
                        {creators?.length > 0 && (
                            <p className="text-base text-white font-medium">
                                {creators.map(c => c.name).join(', ')}
                            </p>
                        )}
                    </InfoSection>

                    <InfoSection title="Cast">
                        {cast?.length > 0 && (
                            <div className="flex flex-wrap gap-x-2 gap-y-1">
                                {cast.map((person, index) => (
                                    <span key={`${person.id}-${index}`} className="text-sm text-gray-300">
                                        <button
                                            onClick={() => openCastModal(person)}
                                            className="hover:text-white hover:underline transition-colors text-left"
                                        >
                                            {person.name}
                                        </button>
                                        {index < cast.length - 1 && <span className="text-gray-500">,</span>}
                                    </span>
                                ))}
                            </div>
                        )}
                    </InfoSection>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    <GenreList genres={movieDetails?.genres} />

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <StatsItem label="Maturity Rating">
                            <span className="inline-block px-2 py-0.5 border border-white/40 rounded text-xs font-medium text-white">
                                {movie.adult ? '18+' : '13+'}
                            </span>
                        </StatsItem>

                        <StatsItem
                            label="Original Language"
                            value={movie.original_language?.toUpperCase() || 'EN'}
                        />

                        <StatsItem
                            label="Release Year"
                            value={getYear(movie.release_date || movie.first_air_date)}
                        />

                        <StatsItem label="Rating">
                            <p className="text-sm text-white font-medium flex items-center gap-1">
                                <span className="text-yellow-400">★</span>
                                {movie.vote_average?.toFixed(1) || 'N/A'}
                            </p>
                        </StatsItem>
                    </div>
                </div>
            </div>

            {/* Additional Info */}
            <div className="pt-6 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-8">
                {showOriginalTitle && (
                    <InfoSection title="Original Title">
                        <p className="text-sm text-gray-400 italic">{originalTitle}</p>
                    </InfoSection>
                )}

                <InfoSection title="Status" content={movieDetails?.status} />

                <ProductionCompanies companies={movieDetails?.production_companies} />
            </div>
        </div>
    );
});

ModalDetails.displayName = 'ModalDetails';

export default ModalDetails;
