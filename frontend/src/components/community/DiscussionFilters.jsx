import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const sortOptions = [
  {
    value: 'latest',
    label: 'Latest',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    value: 'popular',
    label: 'Most Popular',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
  },
  {
    value: 'trending',
    label: 'Trending',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
];

const DiscussionFilters = ({
  sortBy,
  onSortChange,
  selectedCategory,
  onCategoryChange,
  selectedTag,
  onTagChange,
  categories,
  topTags,
  onClearFilters,
}) => {
  const [openFilter, setOpenFilter] = useState(null);
  const sortRef = useRef(null);
  const categoryRef = useRef(null);
  const tagRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        sortRef.current &&
        !sortRef.current.contains(event.target) &&
        categoryRef.current &&
        !categoryRef.current.contains(event.target) &&
        tagRef.current &&
        !tagRef.current.contains(event.target)
      ) {
        setOpenFilter(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedSort = sortOptions.find((option) => option.value === sortBy) || sortOptions[0];

  return (
    <div className="flex items-center gap-2">
      {/* Sort Filter */}
      <div className="relative" ref={sortRef}>
        <button
          onClick={() => setOpenFilter(openFilter === 'sort' ? null : 'sort')}
          className="flex items-center gap-2 px-3 py-2 bg-[#1a1d24] border border-[#2a2d34] rounded-full hover:bg-[#2a2d34] transition-colors"
        >
          {selectedSort.icon}
          <span className="text-sm text-white/90">{selectedSort.label}</span>
          <svg
            className={`w-4 h-4 transition-transform duration-200 text-white/60 ${
              openFilter === 'sort' ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        <AnimatePresence>
          {openFilter === 'sort' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute z-50 mt-2 w-56 bg-[#1a1d24] border border-[#2a2d34] rounded-lg shadow-lg overflow-hidden"
            >
              <div className="py-1">
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      onSortChange(option.value);
                      setOpenFilter(null);
                    }}
                    className={`w-full px-4 py-2.5 text-left text-sm hover:bg-[#2a2d34] flex items-center gap-3 ${
                      sortBy === option.value ? 'text-white bg-[#2a2d34]' : 'text-white/70'
                    }`}
                  >
                    {option.icon}
                    {option.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Category Filter */}
      <div className="relative" ref={categoryRef}>
        <button
          onClick={() => setOpenFilter(openFilter === 'category' ? null : 'category')}
          className="flex items-center gap-2 px-3 py-2 bg-[#1a1d24] border border-[#2a2d34] rounded-full hover:bg-[#2a2d34] transition-colors"
        >
          <svg
            className="w-4 h-4 text-white/90"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
            />
          </svg>
          <span className="text-sm text-white/90">{selectedCategory || 'Category'}</span>
          <svg
            className={`w-4 h-4 transition-transform duration-200 text-white/60 ${
              openFilter === 'category' ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        <AnimatePresence>
          {openFilter === 'category' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute z-50 mt-2 w-56 bg-[#1a1d24] border border-[#2a2d34] rounded-lg shadow-lg overflow-hidden"
            >
              <div className="py-1">
                <button
                  onClick={() => {
                    onCategoryChange('');
                    setOpenFilter(null);
                  }}
                  className={`w-full px-4 py-2.5 text-left text-sm hover:bg-[#2a2d34] flex items-center gap-3 ${
                    !selectedCategory ? 'text-white bg-[#2a2d34]' : 'text-white/70'
                  }`}
                >
                  <svg className="w-4 h-4 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  All Categories
                </button>
                {categories.map((category) => (
                  <button
                    key={category.name}
                    onClick={() => {
                      onCategoryChange(category.name);
                      setOpenFilter(null);
                    }}
                    className={`w-full px-4 py-2.5 text-left text-sm hover:bg-[#2a2d34] flex items-center justify-between ${
                      selectedCategory === category.name ? 'text-white bg-[#2a2d34]' : 'text-white/70'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <svg className="w-4 h-4 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      {category.name}
                    </div>
                    <span className="text-white/50 text-xs">({category.count})</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Tags Filter */}
      <div className="relative" ref={tagRef}>
        <button
          onClick={() => setOpenFilter(openFilter === 'tags' ? null : 'tags')}
          className="flex items-center gap-2 px-3 py-2 bg-[#1a1d24] border border-[#2a2d34] rounded-full hover:bg-[#2a2d34] transition-colors"
        >
          <svg
            className="w-4 h-4 text-white/90"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
            />
          </svg>
          <span className="text-sm text-white/90">{selectedTag || 'Tags'}</span>
          <svg
            className={`w-4 h-4 transition-transform duration-200 text-white/60 ${
              openFilter === 'tags' ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        <AnimatePresence>
          {openFilter === 'tags' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute z-50 mt-2 w-56 bg-[#1a1d24] border border-[#2a2d34] rounded-lg shadow-lg overflow-hidden"
            >
              <div className="py-1">
                <button
                  onClick={() => {
                    onTagChange('');
                    setOpenFilter(null);
                  }}
                  className={`w-full px-4 py-2.5 text-left text-sm hover:bg-[#2a2d34] flex items-center gap-3 ${
                    !selectedTag ? 'text-white bg-[#2a2d34]' : 'text-white/70'
                  }`}
                >
                  <svg className="w-4 h-4 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  All Tags
                </button>
                {topTags.map((tag) => (
                  <button
                    key={tag.name}
                    onClick={() => {
                      onTagChange(tag.name);
                      setOpenFilter(null);
                    }}
                    className={`w-full px-4 py-2.5 text-left text-sm hover:bg-[#2a2d34] flex items-center justify-between ${
                      selectedTag === tag.name ? 'text-white bg-[#2a2d34]' : 'text-white/70'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <svg className="w-4 h-4 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      {tag.name}
                    </div>
                    <span className="text-white/50 text-xs">({tag.count})</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Active Filters */}
      {(selectedCategory || selectedTag) && (
        <div className="flex items-center gap-2">
          {selectedCategory && (
            <div className="flex items-center gap-1 px-2 py-1 bg-[#1a1d24] border border-[#2a2d34] rounded-full">
              <span className="text-sm text-white/70">Category:</span>
              <span className="text-sm text-white/90">{selectedCategory}</span>
              <button
                onClick={() => onCategoryChange('')}
                className="p-1 hover:bg-[#2a2d34] rounded-full transition-colors"
              >
                <svg
                  className="w-3 h-3 text-white/70"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          )}
          {selectedTag && (
            <div className="flex items-center gap-1 px-2 py-1 bg-[#1a1d24] border border-[#2a2d34] rounded-full">
              <span className="text-sm text-white/70">Tag:</span>
              <span className="text-sm text-white/90">{selectedTag}</span>
              <button
                onClick={() => onTagChange('')}
                className="p-1 hover:bg-[#2a2d34] rounded-full transition-colors"
              >
                <svg
                  className="w-3 h-3 text-white/70"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          )}
          <button
            onClick={onClearFilters}
            className="flex items-center gap-1 px-2 py-1 text-sm text-white/70 hover:text-white/90 hover:bg-[#2a2d34] rounded-full transition-colors"
          >
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            Clear all
          </button>
        </div>
      )}
    </div>
  );
};

export default DiscussionFilters; 