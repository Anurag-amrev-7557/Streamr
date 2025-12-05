import React, { memo } from 'react';
import { Play, Plus, Check, Tv, Download } from 'lucide-react';
import clsx from 'clsx';
import ImageWithPlaceholder from '../ImageWithPlaceholder';
import useModalStore from '../../store/useModalStore';

export const HeroBackground = memo(({ movie, isMobile }) => {
    const imagePath = movie.backdrop_path || movie.poster_path;

    return (
        <div className={clsx("relative w-full bg-[#101010]", isMobile ? "h-[55vh]" : "h-full")}>
            <div className="absolute inset-0 bg-gradient-to-t from-[#101010] via-transparent to-transparent z-10" />
            {!isMobile && (
                <div className="absolute inset-0 bg-gradient-to-r from-[#101010] via-transparent to-transparent z-10" />
            )}

            <ImageWithPlaceholder
                src={`https://image.tmdb.org/t/p/w1280${imagePath}`}
                placeholderSrc={`https://image.tmdb.org/t/p/w300${imagePath}`}
                alt={movie.title || movie.name}
                className="absolute inset-0 w-full h-full"
                imgClassName="object-cover"
                loading="eager"
            />
        </div>
    );
});
HeroBackground.displayName = 'HeroBackground';

export const HeroTitle = memo(({ movie, logoPath, isMobile }) => {
    if (isMobile) {
        return logoPath ? (
            <ImageWithPlaceholder
                src={`https://image.tmdb.org/t/p/w500${logoPath}`}
                placeholderSrc={`https://image.tmdb.org/t/p/w92${logoPath}`}
                alt={movie.title || movie.name}
                className="max-w-[70%] h-24 origin-left mb-4"
                imgClassName="object-contain object-bottom"
                loading="eager"
            />
        ) : (
            <h2 className="text-4xl font-black text-white leading-none tracking-tight">
                {movie.title || movie.name}
            </h2>
        );
    }

    return (
        <div className="transition-opacity duration-300">
            {logoPath ? (
                <div className="max-w-[220px] md:max-w-sm h-24 mb-4">
                    <ImageWithPlaceholder
                        src={`https://image.tmdb.org/t/p/w500${logoPath}`}
                        placeholderSrc={`https://image.tmdb.org/t/p/w92${logoPath}`}
                        alt={movie.title || movie.name}
                        className="w-full h-full"
                        imgClassName="object-contain object-bottom drop-shadow-2xl"
                    />
                </div>
            ) : (
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white drop-shadow-2xl leading-tight mb-4">
                    {movie.title || movie.name}
                </h2>
            )}
        </div>
    );
});
HeroTitle.displayName = 'HeroTitle';

export const HeroMetadata = memo(({ movie, movieDetails, isMobile }) => {
    if (isMobile) {
        return (
            <div className="flex items-center gap-3 text-sm font-medium flex-wrap">
                <span className="text-[#46d369] font-bold">{Math.round(movie.vote_average * 10)}% Match</span>
                <span className="text-gray-400">{movie.release_date?.substring(0, 4) || movie.first_air_date?.substring(0, 4)}</span>
                <span className="bg-[#333] text-gray-200 px-1.5 py-0.5 text-xs rounded border border-white/10">
                    {movie.adult ? '18+' : '13+'}
                </span>
                <span className="text-gray-400">
                    {movieDetails?.runtime
                        ? `${Math.floor(movieDetails.runtime / 60)}h ${movieDetails.runtime % 60}m`
                        : (movieDetails?.number_of_seasons ? `${movieDetails.number_of_seasons} Seasons` : '')
                    }
                </span>
                {movieDetails?.status && (
                    <span className="text-gray-500 text-xs border border-white/10 px-1.5 py-0.5 rounded">{movieDetails.status}</span>
                )}
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center md:justify-start gap-2 md:gap-3 text-sm md:text-base flex-wrap">
            {movieDetails?.number_of_seasons && (
                <>
                    <span className="flex items-center gap-1 text-gray-300">
                        <span className="text-white font-semibold">
                            {movieDetails.number_of_seasons} {movieDetails.number_of_seasons === 1 ? 'Season' : 'Seasons'}
                        </span>
                    </span>
                    <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
                </>
            )}
            {movieDetails?.status && (
                <>
                    <span className="text-gray-300">{movieDetails.status}</span>
                    <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
                </>
            )}
            {movieDetails?.runtime && (
                <>
                    <span className="text-gray-300">
                        {Math.floor(movieDetails.runtime / 60)}h {movieDetails.runtime % 60}m
                    </span>
                    <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
                </>
            )}
            <span className="flex items-center gap-1 text-white">
                <span>★</span>
                <span className="font-semibold">{movie.vote_average?.toFixed(1) || '8.0'}</span>
            </span>
        </div>
    );
});
HeroMetadata.displayName = 'HeroMetadata';

export const HeroActions = memo(({
    onPlay,
    handleTrailerOpen,
    handleListToggle,
    inList,
    trailerKey,
    isMobile,
    hasHistory,
    onDownload
}) => {
    if (isMobile) {
        return (
            <div className="relative -mt-8 z-30 px-4 mb-6 flex flex-col gap-3">
                <button
                    onClick={onPlay}
                    className="w-full bg-white text-black py-3 rounded-full font-bold flex items-center justify-center gap-2 active:scale-95 transition"
                >
                    <Play className="w-5 h-5 fill-black" />
                    <span>{hasHistory ? 'Resume' : 'Watch Now'}</span>
                </button>

                <button
                    onClick={onDownload}
                    className="w-full bg-[#2a2a2a] text-white py-3 rounded-full font-bold flex items-center justify-center gap-2 active:scale-95 transition border border-white/10"
                >
                    <Download className="w-5 h-5" />
                    <span>Download</span>
                </button>

                <div className="flex gap-3">
                    <button
                        onClick={handleTrailerOpen}
                        disabled={!trailerKey}
                        className="flex-1 bg-white/8 text-white py-3 rounded-full font-semibold flex items-center justify-center gap-2 active:scale-95 transition disabled:opacity-50"
                    >
                        <Tv className="w-5 h-5" />
                        <span>Trailer</span>
                    </button>

                    <button
                        onClick={handleListToggle}
                        className="flex-1 bg-white/8 text-white py-3 rounded-full font-semibold flex items-center justify-center gap-2 active:scale-95 transition"
                    >
                        {inList ? (
                            <>
                                <Check className="w-5 h-5" />
                                <span>Added</span>
                            </>
                        ) : (
                            <>
                                <Plus className="w-5 h-5" />
                                <span>My List</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex justify-center md:justify-start gap-2 md:gap-3 flex-wrap w-full md:w-auto">
            <button
                onClick={onPlay}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white text-black px-6 py-3 md:px-6 md:py-2.5 text-base md:text-base rounded-full hover:bg-white/90 transition duration-300 ease-out"
            >
                <Play className="w-5 h-5 fill-current" strokeWidth={2} />
                <span className="hidden sm:inline">{hasHistory ? 'Resume' : 'Watch Now'}</span>
                <span className="sm:hidden">{hasHistory ? 'Resume' : 'Play'}</span>
            </button>
            <button
                onClick={handleTrailerOpen}
                disabled={!trailerKey}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white/10 text-white px-6 py-3 md:px-6 md:py-2.5 text-base md:text-base rounded-full hover:bg-white/20 transition duration-300 ease-out border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Play className="w-5 h-5" strokeWidth={1.5} /> <span className="hidden sm:inline">Trailer</span><span className="sm:hidden">Trailer</span>
            </button>
            <button
                onClick={onDownload}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white/10 text-white px-6 py-3 md:px-6 md:py-2.5 text-base md:text-base rounded-full hover:bg-white/20 transition duration-300 ease-out border border-white/10"
            >
                <Download className="w-5 h-5" /> <span className="hidden sm:inline">Download</span><span className="sm:hidden">Download</span>
            </button>
            <button
                onClick={handleListToggle}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white/10 text-white px-6 py-3 md:px-6 md:py-2.5 text-base md:text-base rounded-full hover:bg-white/20 transition duration-300 ease-out border border-white/10"
            >
                {inList ? (
                    <>
                        <Check className="w-5 h-5" strokeWidth={1.5} /> <span className="hidden sm:inline">In My List</span><span className="sm:hidden">Added</span>
                    </>
                ) : (
                    <>
                        <Plus className="w-5 h-5" /> <span className="hidden sm:inline">Add to List</span><span className="sm:hidden">Add</span>
                    </>
                )}
            </button>
        </div>
    );
});
HeroActions.displayName = 'HeroActions';

export const HeroCast = memo(({ cast, isMobile }) => {
    const openCastModal = useModalStore((state) => state.openCastModal);

    if (!cast || cast.length === 0) return null;

    if (isMobile) {
        return (
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-white font-bold text-lg">Cast & Crew</h3>
                </div>
                <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide -mx-5 px-5">
                    {cast.map((person) => (
                        <div
                            key={person.id}
                            className="flex-shrink-0 w-32 flex flex-col items-center gap-2 cursor-pointer group"
                            onClick={() => openCastModal(person)}
                        >
                            <div className="w-32 h-36 rounded-xl overflow-hidden bg-[#333] shadow-lg border border-white/10 relative transition-transform group-active:scale-95">
                                {person.profile_path ? (
                                    <ImageWithPlaceholder
                                        src={`https://image.tmdb.org/t/p/w185${person.profile_path}`}
                                        placeholderSrc={`https://image.tmdb.org/t/p/w45${person.profile_path}`}
                                        alt={person.name}
                                        className="w-full h-full"
                                        imgClassName="object-cover object-[top_40%]"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-500 text-lg font-bold bg-white/5">
                                        {person.name.charAt(0)}
                                    </div>
                                )}
                            </div>
                            <div className="text-center w-full">
                                <p className="text-sm text-white font-semibold leading-tight line-clamp-1 group-hover:text-primary transition-colors">
                                    {person.name}
                                </p>
                                {person.character && (
                                    <p className="text-[12px] text-gray-400 leading-tight line-clamp-1 mt-0.5">
                                        {person.character}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="hidden md:flex flex-col items-end gap-4">
            <div className="flex space-x-2">
                {cast.slice(0, 5).map((person) => (
                    <div
                        key={person.id}
                        className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 border-2 border-[#101010] overflow-hidden relative cursor-pointer hover:scale-110 hover:border-white transition-all duration-200 z-0 hover:z-10"
                        title={person.name}
                        onClick={() => openCastModal(person)}
                    >
                        {person.profile_path ? (
                            <ImageWithPlaceholder
                                src={`https://image.tmdb.org/t/p/w185${person.profile_path}`}
                                placeholderSrc={`https://image.tmdb.org/t/p/w45${person.profile_path}`}
                                alt={person.name}
                                className="w-full h-full"
                                imgClassName="object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-gray-700 flex items-center justify-center text-gray-400 text-xs">
                                {person.name.charAt(0)}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
});
HeroCast.displayName = 'HeroCast';

export const HeroGenres = memo(({ movieDetails, isMobile }) => {
    if (!movieDetails?.genres || movieDetails.genres.length === 0) return null;

    if (isMobile) {
        return (
            <div className="flex flex-wrap gap-2 mt-2">
                {movieDetails.genres.slice(0, 3).map((genre) => (
                    <span key={genre.id} className="text-xs text-gray-300 flex items-center gap-2">
                        {genre.name}
                        <span className="w-1 h-1 bg-gray-500 rounded-full last:hidden"></span>
                    </span>
                ))}
            </div>
        );
    }

    return (
        <div className="flex gap-2 flex-wrap justify-end">
            {movieDetails.genres.slice(0, 3).map((genre) => (
                <span
                    key={genre.id}
                    className="px-3 py-1 bg-white/10 border border-white/20 rounded-full text-sm text-white"
                >
                    {genre.name}
                </span>
            ))}
        </div>
    );
});
HeroGenres.displayName = 'HeroGenres';

export const HeroInfo = memo(({ director, creators }) => {
    return (
        <div className="flex flex-col gap-1">
            {director && (
                <div className="text-sm">
                    <span className="text-gray-500">Director: </span>
                    <span className="text-gray-300">{director.name}</span>
                </div>
            )}
            {creators && creators.length > 0 && (
                <div className="text-sm">
                    <span className="text-gray-500">Creators: </span>
                    <span className="text-gray-300">
                        {creators.map(c => c.name).join(', ')}
                    </span>
                </div>
            )}
        </div>
    );
});
HeroInfo.displayName = 'HeroInfo';

