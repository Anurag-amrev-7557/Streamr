import React, { useState, useMemo, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion'; // eslint-disable-line no-unused-vars
import { Filter, X, ChevronDown, ChevronUp, Calendar, Star, Film, Tv } from 'lucide-react';
import clsx from 'clsx';

// Genre list (common movie/TV genres from TMDB)
const GENRES = [
    { id: 28, name: 'Action' },
    { id: 12, name: 'Adventure' },
    { id: 16, name: 'Animation' },
    { id: 35, name: 'Comedy' },
    { id: 80, name: 'Crime' },
    { id: 18, name: 'Drama' },
    { id: 14, name: 'Fantasy' },
    { id: 27, name: 'Horror' },
    { id: 10749, name: 'Romance' },
    { id: 878, name: 'Sci-Fi' },
    { id: 53, name: 'Thriller' },
];

const SearchFilters = ({
    filters = {},
    onFiltersChange,
    onClear,
    className = ''
}) => {
    const [expanded, setExpanded] = useState(false);
    const currentYear = new Date().getFullYear();

    const handleMediaTypeChange = useCallback((type) => {
        onFiltersChange({ ...filters, mediaType: type });
    }, [filters, onFiltersChange]);

    const handleYearStartChange = useCallback((e) => {
        onFiltersChange({
            ...filters,
            yearStart: e.target.value ? parseInt(e.target.value) : null
        });
    }, [filters, onFiltersChange]);

    const handleYearEndChange = useCallback((e) => {
        onFiltersChange({
            ...filters,
            yearEnd: e.target.value ? parseInt(e.target.value) : null
        });
    }, [filters, onFiltersChange]);

    const handleMinRatingChange = useCallback((rating) => {
        onFiltersChange({
            ...filters,
            minRating: filters.minRating === rating ? null : rating
        });
    }, [filters, onFiltersChange]);

    const handleGenreToggle = useCallback((genreId) => {
        const currentGenres = filters.genres || [];
        const newGenres = currentGenres.includes(genreId)
            ? currentGenres.filter(id => id !== genreId)
            : [...currentGenres, genreId];
        onFiltersChange({ ...filters, genres: newGenres });
    }, [filters, onFiltersChange]);

    // Count active filters
    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (filters.mediaType && filters.mediaType !== 'all') count++;
        if (filters.yearStart || filters.yearEnd) count++;
        if (filters.minRating) count++;
        if (filters.genres && filters.genres.length > 0) count += filters.genres.length;
        return count;
    }, [filters]);

    const hasActiveFilters = activeFilterCount > 0;

    return (
        <div className={clsx("space-y-3", className)}>
            {/* Filter Header */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="flex items-center gap-2 text-sm font-medium text-white/90 hover:text-white transition-colors group"
                >
                    <Filter className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    <span>Filters</span>
                    {activeFilterCount > 0 && (
                        <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">
                            {activeFilterCount}
                        </span>
                    )}
                    {expanded ? (
                        <ChevronUp className="w-4 h-4" />
                    ) : (
                        <ChevronDown className="w-4 h-4" />
                    )}
                </button>
                {hasActiveFilters && (
                    <button
                        onClick={onClear}
                        className="text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1"
                    >
                        <X className="w-3 h-3" />
                        Clear all
                    </button>
                )}
            </div>

            {/* Quick Filters (Always Visible) */}
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={() => handleMediaTypeChange('all')}
                    className={clsx(
                        "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                        filters.mediaType === 'all' || !filters.mediaType
                            ? "bg-white text-black"
                            : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
                    )}
                >
                    All
                </button>
                <button
                    onClick={() => handleMediaTypeChange('movie')}
                    className={clsx(
                        "px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1",
                        filters.mediaType === 'movie'
                            ? "bg-white text-black"
                            : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
                    )}
                >
                    <Film className="w-3 h-3" />
                    Movies
                </button>
                <button
                    onClick={() => handleMediaTypeChange('tv')}
                    className={clsx(
                        "px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1",
                        filters.mediaType === 'tv'
                            ? "bg-white text-black"
                            : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
                    )}
                >
                    <Tv className="w-3 h-3" />
                    TV Shows
                </button>
            </div>

            {/* Advanced Filters (Expandable) */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden space-y-4 pt-2"
                    >
                        {/* Year Range */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-400 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Release Year
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    placeholder="From"
                                    min="1900"
                                    max={currentYear}
                                    value={filters.yearStart || ''}
                                    onChange={handleYearStartChange}
                                    className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/30"
                                />
                                <span className="text-gray-500">to</span>
                                <input
                                    type="number"
                                    placeholder="To"
                                    min="1900"
                                    max={currentYear}
                                    value={filters.yearEnd || ''}
                                    onChange={handleYearEndChange}
                                    className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/30"
                                />
                            </div>
                        </div>

                        {/* Rating */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-400 flex items-center gap-1">
                                <Star className="w-3 h-3" />
                                Minimum Rating
                            </label>
                            <div className="flex gap-2">
                                {[6, 7, 8, 9].map(rating => (
                                    <button
                                        key={rating}
                                        onClick={() => handleMinRatingChange(rating)}
                                        className={clsx(
                                            "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                                            filters.minRating === rating
                                                ? "bg-amber-500 text-black"
                                                : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
                                        )}
                                    >
                                        {rating}+
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Genres */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-400">
                                Genres
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {GENRES.map(genre => (
                                    <button
                                        key={genre.id}
                                        onClick={() => handleGenreToggle(genre.id)}
                                        className={clsx(
                                            "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                                            (filters.genres || []).includes(genre.id)
                                                ? "bg-blue-600 text-white"
                                                : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
                                        )}
                                    >
                                        {genre.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default memo(SearchFilters);
