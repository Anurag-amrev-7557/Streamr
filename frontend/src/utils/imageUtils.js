// Image utilities for handling TMDB images with CORS
export const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

// Get TMDB image URL with proper CORS handling
export const getTmdbImageUrl = (path, size = 'w500') => {
  if (!path) return null;
  
  // Ensure path starts with /
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${TMDB_IMAGE_BASE_URL}/${size}${cleanPath}`;
};

// Get image props with CORS handling
export const getImageProps = (path, size = 'w500', alt = 'Image', className = '') => {
  return {
    src: getTmdbImageUrl(path, size),
    alt,
    className,
    crossOrigin: 'anonymous',
    loading: 'lazy'
  };
};

// Get poster image props
export const getPosterProps = (movie, size = 'w500') => {
  return getImageProps(
    movie.poster_path,
    size,
    movie.title || movie.name || 'Movie poster',
    'movie-poster'
  );
};

// Get backdrop image props
export const getBackdropProps = (movie, size = 'w780') => {
  return getImageProps(
    movie.backdrop_path,
    size,
    `${movie.title || movie.name} backdrop`,
    'backdrop-image'
  );
};

// Get profile image props
export const getProfileProps = (person, size = 'w185') => {
  return getImageProps(
    person.profile_path,
    size,
    person.name || 'Profile image',
    'profile-image'
  );
}; 