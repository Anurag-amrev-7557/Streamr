import React, { useMemo } from 'react';
import EnhancedDropdown from './EnhancedDropdown';

const GenreDropdown = ({
  genres = [],
  selectedGenre,
  onGenreSelect,
  multiSelect = false,
  className = "",
  disabled = false
}) => {
  // Sort genres alphabetically
  const enhancedGenres = useMemo(() => {
    if (!genres || genres.length === 0) return [];

    // Create a copy and sort by name for consistency
    const sortedGenres = [...genres].sort((a, b) => a.name.localeCompare(b.name));
    
    return sortedGenres.map(genre => ({
      ...genre,
      value: genre.id,
      label: genre.name
    }));
  }, [genres]);


  // Handle genre selection
  const handleGenreSelect = (option) => {
    if (multiSelect) {
      const currentGenres = Array.isArray(selectedGenre) ? selectedGenre : [];
      const isSelected = currentGenres.some(genre => 
        (typeof genre === 'object' ? genre.id : genre) === option.id
      );
      
      if (isSelected) {
        // Remove from selection
        const newGenres = currentGenres.filter(genre => 
          (typeof genre === 'object' ? genre.id : genre) !== option.id
        );
        onGenreSelect(newGenres);
      } else {
        // Add to selection
        onGenreSelect([...currentGenres, option]);
      }
    } else {
      onGenreSelect(option);
    }
  };

  // Custom render for genre options
  const renderGenreOption = (option, index) => {
    return (
      <div className="flex items-center justify-between">
        <span className="truncate">{option.name}</span>
      </div>
    );
  };

  // Custom render for selected genre(s)
  const renderSelectedGenre = (selected) => {
    if (multiSelect && Array.isArray(selected)) {
      if (selected.length === 0) {
        return <span>Genre</span>;
      }
      if (selected.length === 1) {
        const genre = selected[0];
        return <span>{genre.name}</span>;
      }
      return <span>{selected.length} genres</span>;
    }
    
    if (!selected) {
      return <span>Genre</span>;
    }
    
    return <span>{selected.name}</span>;
  };

  // Check if genre is selected
  const isGenreSelected = (option) => {
    if (multiSelect && Array.isArray(selectedGenre)) {
      return selectedGenre.some(genre => 
        (typeof genre === 'object' ? genre.id : genre) === option.id
      );
    }
    
    if (!selectedGenre) return false;
    
    return (typeof selectedGenre === 'object' ? selectedGenre.id : selectedGenre) === option.id;
  };

  return (
    <EnhancedDropdown
      options={enhancedGenres}
      selectedValue={selectedGenre}
      onSelect={handleGenreSelect}
      placeholder="Genre"
      searchable={false}
      searchPlaceholder="Search genres..."
      multiSelect={multiSelect}
      className={className}
      disabled={disabled}
      groupBy={null}
      renderOption={renderGenreOption}
      renderSelected={renderSelectedGenre}
      emptyMessage="No genres found"
      icon={
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      }
    />
  );
};

export default GenreDropdown;
