// Location Detection Utility
// Automatically detects user location and converts coordinates to detailed readable location information

/**
 * Detects user location using browser geolocation API
 * @returns {Promise<object|null>} Detailed location object or null if detection fails
 */
export const detectUserLocation = async () => {
  try {
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported by this browser');
      return null;
    }

    // Get current position
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000 // Cache for 1 minute
      });
    });

    const { latitude, longitude } = position.coords;
    console.log('Location detected:', { latitude, longitude });

    // Convert coordinates to detailed location information using reverse geocoding
    const locationDetails = await reverseGeocode(latitude, longitude);
    return locationDetails;

  } catch (error) {
    console.error('Location detection failed:', error);
    
    // Provide user-friendly error messages
    if (error.code === 1) {
      console.warn('Location access denied by user');
    } else if (error.code === 2) {
      console.warn('Location unavailable');
    } else if (error.code === 3) {
      console.warn('Location request timed out');
    }
    
    return null;
  }
};

/**
 * Converts coordinates to detailed location information using reverse geocoding
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {Promise<object>} Detailed location object
 */
const reverseGeocode = async (latitude, longitude) => {
  try {
    // Use BigDataCloud API for reverse geocoding (free tier available)
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
    );

    if (!response.ok) {
      throw new Error('Failed to get location information from geocoding service');
    }

    const data = await response.json();
    console.log('Reverse geocoding result:', data);
    console.log('Available postal code fields:', {
      postcode: data.postcode,
      postalCode: data.postalCode,
      zipCode: data.zipCode,
      zip: data.zip
    });
    
    // Extract detailed location information
    const locationDetails = {
      // Primary location identifiers
      city: data.locality || data.city || null,
      state: data.principalSubdivision || data.administrativeArea || null,
      country: data.countryName || null,
      postalCode: data.postcode || data.postalCode || data.zipCode || data.zip || null,
      
      // Additional location details
      county: data.county || data.subAdministrativeArea || null,
      neighborhood: data.neighbourhood || null,
      street: data.street || null,
      
      // Coordinates
      latitude: latitude,
      longitude: longitude,
      
      // Formatted display strings
      shortName: null, // Will be set below
      fullName: null,  // Will be set below
      detailedName: null // Will be set below
    };
    
    // Create formatted display strings
    const parts = [];
    if (locationDetails.city) parts.push(locationDetails.city);
    if (locationDetails.state) parts.push(locationDetails.state);
    if (locationDetails.country) parts.push(locationDetails.country);
    
    // Short name (City, State)
    if (locationDetails.city && locationDetails.state) {
      locationDetails.shortName = `${locationDetails.city}, ${locationDetails.state}`;
    } else if (locationDetails.city) {
      locationDetails.shortName = locationDetails.city;
    } else if (locationDetails.state) {
      locationDetails.shortName = locationDetails.state;
    } else if (locationDetails.country) {
      locationDetails.shortName = locationDetails.country;
    }
    
    // Full name (City, State, Country)
    if (parts.length > 0) {
      locationDetails.fullName = parts.join(', ');
    }
    
    // Detailed name with postal code if available
    if (locationDetails.postalCode && locationDetails.fullName) {
      locationDetails.detailedName = `${locationDetails.fullName} ${locationDetails.postalCode}`;
    } else {
      locationDetails.detailedName = locationDetails.fullName;
    }
    
    // Log the extracted location details for debugging
    console.log('Extracted location details:', {
      city: locationDetails.city,
      state: locationDetails.state,
      country: locationDetails.country,
      postalCode: locationDetails.postalCode,
      shortName: locationDetails.shortName,
      fullName: locationDetails.fullName,
      detailedName: locationDetails.detailedName
    });
    
    // Fallback if no structured data available
    if (!locationDetails.shortName) {
      locationDetails.shortName = data.locality || data.city || data.principalSubdivision || data.countryName || 'Unknown location';
      locationDetails.fullName = locationDetails.shortName;
      locationDetails.detailedName = locationDetails.shortName;
    }
    
    console.log('Processed location details:', locationDetails);
    return locationDetails;

  } catch (error) {
    console.error('Reverse geocoding failed:', error);
    
    // Fallback to coordinates if geocoding fails
    const fallbackLocation = {
      city: null,
      state: null,
      country: null,
      postalCode: null,
      county: null,
      neighborhood: null,
      street: null,
      latitude: latitude,
      longitude: longitude,
      shortName: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
      fullName: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
      detailedName: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
    };
    
    console.log('Using fallback location:', fallbackLocation);
    return fallbackLocation;
  }
};

/**
 * Checks if location detection is available and permitted
 * @returns {Promise<boolean>} True if location detection is available
 */
export const isLocationDetectionAvailable = async () => {
  if (!navigator.geolocation) {
    return false;
  }

  try {
    // Check if we can get the current position
    await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        timeout: 5000,
        maximumAge: 60000
      });
    });
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Gets a formatted location string for display
 * @param {object} locationDetails - Location details object
 * @param {string} format - Format type: 'short', 'full', 'detailed', or 'custom'
 * @returns {string} Formatted location string
 */
export const getFormattedLocation = (locationDetails, format = 'short') => {
  if (!locationDetails) return 'Unknown location';
  
  switch (format) {
    case 'short':
      return locationDetails.shortName || 'Unknown location';
    case 'full':
      return locationDetails.fullName || locationDetails.shortName || 'Unknown location';
    case 'detailed':
      return locationDetails.detailedName || locationDetails.fullName || locationDetails.shortName || 'Unknown location';
    case 'custom':
      // Custom format: City, State (Country)
      const parts = [];
      if (locationDetails.city) parts.push(locationDetails.city);
      if (locationDetails.state) parts.push(locationDetails.state);
      if (locationDetails.country && locationDetails.country !== locationDetails.state) {
        parts.push(`(${locationDetails.country})`);
      }
      return parts.length > 0 ? parts.join(', ') : 'Unknown location';
    case 'withPostalCode':
      // Format with postal code if available
      if (locationDetails.postalCode && locationDetails.fullName) {
        return `${locationDetails.fullName} ${locationDetails.postalCode}`;
      }
      return locationDetails.fullName || locationDetails.shortName || 'Unknown location';
    default:
      return locationDetails.shortName || 'Unknown location';
  }
};

/**
 * Gets location coordinates as a formatted string
 * @param {object} locationDetails - Location details object
 * @param {number} precision - Decimal places for coordinates (default: 4)
 * @returns {string} Formatted coordinates string
 */
export const getFormattedCoordinates = (locationDetails, precision = 4) => {
  if (!locationDetails || !locationDetails.latitude || !locationDetails.longitude) {
    return 'Coordinates unavailable';
  }
  
  return `${locationDetails.latitude.toFixed(precision)}, ${locationDetails.longitude.toFixed(precision)}`;
}; 