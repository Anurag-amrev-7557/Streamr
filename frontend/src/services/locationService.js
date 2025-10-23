import { getApiUrl } from '../config/api';
import { detectUserLocation, getFormattedLocation } from '../utils/locationDetection';
import { toast } from 'react-hot-toast';

/**
 * Update user's location in the database
 * @param {Object} detectedLocation - Location data from detection
 * @param {Function} setUser - State setter for user object
 * @returns {Promise<Object>} Result with success status and location data
 */
export const updateUserLocation = async (detectedLocation, setUser) => {
  if (!detectedLocation) {
    console.warn('⚠️ No location data provided for update');
    return { success: false, error: 'No location data' };
  }

  const formattedLocation = getFormattedLocation(detectedLocation, 'full');
  
  const token = localStorage.getItem('accessToken');
  if (!token) {
    console.warn('⚠️ No access token available for location update');
    return { success: false, error: 'No access token' };
  }

  try {
    const response = await fetch(`${getApiUrl()}/user/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ location: formattedLocation })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.warn('⚠️ Failed to update location - HTTP error:', response.status, errorText);
      return { success: false, error: `HTTP error: ${response.status}` };
    }
    
    const locationUpdateResponse = await response.json();
    
    if (locationUpdateResponse.success) {
      // Update local user state
      if (setUser) {
        setUser(prevUser => ({
          ...prevUser,
          location: formattedLocation
        }));
      }
      
      return { 
        success: true, 
        location: formattedLocation,
        details: detectedLocation
      };
    } else {
      console.warn('⚠️ Failed to update location in database:', locationUpdateResponse);
      return { success: false, error: 'Database update failed' };
    }
  } catch (error) {
    console.warn('⚠️ Failed to update location:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Detect and update user location with toast notifications
 * @param {Function} setUser - State setter for user object
 * @param {boolean} showToast - Whether to show toast notifications
 * @returns {Promise<Object>} Result with success status and location data
 */
export const detectAndUpdateUserLocation = async (setUser, showToast = true) => {
  try {
    const detectedLocation = await detectUserLocation();
    
    if (!detectedLocation) {
      if (showToast) {
        toast.error('Location detection failed. Please check your browser permissions.');
      }
      return { success: false, error: 'Location detection failed' };
    }

    const result = await updateUserLocation(detectedLocation, setUser);
    
    if (result.success && showToast) {
      const formattedLocation = result.location;
      
      // Build toast message with detailed location info
      let toastMessage = `Location detected: ${formattedLocation}`;
      if (detectedLocation.city && detectedLocation.state) {
        toastMessage += `\n📍 ${detectedLocation.city}, ${detectedLocation.state}`;
        if (detectedLocation.country && detectedLocation.country !== detectedLocation.state) {
          toastMessage += `, ${detectedLocation.country}`;
        }
      }
      
      // Add note about postal code if not available
      if (!detectedLocation.postalCode) {
        toastMessage += `\n💡 Postal code not available for this area`;
      }
      
      toast.success(toastMessage, {
        duration: 4000,
        icon: '📍'
      });
    } else if (!result.success && showToast) {
      toast.error('Failed to update location. Please try again.');
    }
    
    return result;
  } catch (error) {
    console.error('❌ Location detection/update failed:', error);
    if (showToast) {
      toast.error('Location detection failed. Please try again.');
    }
    return { success: false, error: error.message };
  }
};
