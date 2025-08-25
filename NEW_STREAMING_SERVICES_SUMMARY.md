# New Streaming Services Added

## Overview
Two new streaming services have been successfully integrated into the Streamr application following the existing pattern and architecture. **111Movies is set as the default streaming service**.

## New Services

### 1. RiveStream (RIVESTREAM)
- **Base URL**: `https://rivestream.net/embed`
- **Description**: Download, Dubbed streaming service
- **Quality**: 1080p
- **Features**: 
  - Download capability
  - Dubbed content support
  - Autoplay enabled
  - Metadata preloading
  - High bandwidth optimization
- **URL Format**:
  - Movies: `?type=movie&id={id}`
  - TV Shows: `?type=tv&id={id}&season={season}&episode={episode}`

### 2. Cinemaos (CINEMAOS)
- **Base URL**: `https://cinemaos.tech/player`
- **Description**: Download, Dubbed streaming service
- **Quality**: 1080p
- **Features**:
  - Download capability
  - Dubbed content support
  - Autoplay enabled
  - Auto preloading
  - High bandwidth optimization
- **URL Format**:
  - Movies: `/{id}`
  - TV Shows: `/{id}/{season}/{episode}`

## Service Order
The streaming services are now ordered by priority:

1. **MOVIES111** - Fastest (Default) ⭐
2. **RIVESTREAM** - Download, Dubbed ⭐
3. **CINEMAOS** - Download, Dubbed ⭐
4. **VIDEASY** - Fast
5. **VIDJOY** - Dubbed
6. **VIDFAST** - Ad-free

## Integration Details

### Files Updated
1. **`frontend/src/services/streamingService.js`**
   - Added new services to `STREAMING_SERVICES` object
   - Updated service descriptions to include "Download, Dubbed"
   - Moved RIVESTREAM and CINEMAOS below MOVIES111
   - **Default service remains MOVIES111**
   - Updated `getBestStreamingService()` function to include new services
   - Fixed URL parameter handling for services with existing query parameters

2. **`frontend/src/services/iframeProgressService.js`**
   - Added new domains to `allowedDomains` array
   - Updated `getServiceName()` function with new service names

3. **`frontend/src/components/StreamingPlayer.jsx`**
   - Added new domains to allowed domains list for postMessage handling

4. **`frontend/src/utils/testIframeProgress.js`**
   - Updated test URLs and origins to include new services

5. **`frontend/src/components/MovieDetails.jsx`**
   - Updated to use `DEFAULT_STREAMING_SERVICE` instead of hardcoded 'MOVIES111'

6. **`frontend/src/components/MovieDetailsOverlay.jsx`**
   - Updated to use `DEFAULT_STREAMING_SERVICE` instead of hardcoded 'MOVIES111'

7. **`frontend/src/components/StreamingServiceSelector.jsx`**
   - Updated to preselect the default service when opening

8. **`frontend/src/components/StreamingServiceToggler.jsx`**
   - Updated to auto-select the default service when none is set

### Network-Based Service Selection
The new services are integrated into the intelligent service selection system:

- **50+ Mbps**: Cinemaos (Download, Dubbed - Premium quality)
- **25-50 Mbps**: RiveStream (Download, Dubbed - High quality)
- **15-25 Mbps**: VidFast (High quality)
- **10-15 Mbps**: 111Movies (Balanced - Default)
- **5-10 Mbps**: Videasy (Lower quality, faster)
- **<5 Mbps**: VidJoy (Lowest quality, fastest)

### Default Service
**111Movies remains the default streaming service**, which means:
- It will be automatically selected when no specific service is chosen
- It appears first in the streaming service selector
- It's used as the fallback service in all streaming functions
- The new services (RiveStream and Cinemaos) are available as premium alternatives

### URL Generation
Both services support:
- Movie streaming with TMDB/IMDB IDs
- TV show streaming with season/episode numbers
- Quality parameters (1080p)
- Performance optimization parameters
- Proper query parameter handling
- Download capabilities
- Dubbed content support

## Testing
All new services have been tested and verified to work correctly:
- ✅ URL generation for movies
- ✅ URL generation for TV shows
- ✅ Parameter handling
- ✅ Integration with existing streaming service infrastructure
- ✅ Network-based service selection
- ✅ Iframe progress tracking support
- ✅ Default service functionality (111Movies)
- ✅ Service ordering
- ✅ Component integration with DEFAULT_STREAMING_SERVICE

## Usage
The new services are automatically available in:
- Streaming service selector (111Movies appears first as default)
- Movie details overlay
- TV episode streaming
- Network-optimized service selection
- All existing streaming functionality

## Example URLs Generated
- **111Movies Movie (Default)**: `https://111movies.com/movie/tt0111161?quality=1080p&autoplay=1&preload=metadata&bandwidth=high`
- **RiveStream Movie**: `https://rivestream.net/embed?type=movie&id=tt0111161&quality=1080p&autoplay=1&preload=metadata&bandwidth=high`
- **Cinemaos Movie**: `https://cinemaos.tech/player/tt0111161?quality=1080p&autoplay=1&preload=auto&bandwidth=high`
- **111Movies TV (Default)**: `https://111movies.com/tv/tt0944947/1/1?quality=1080p&autoplay=1&preload=metadata&bandwidth=high&season=1&episode=1`
- **RiveStream TV**: `https://rivestream.net/embed?type=tv&id=tt0944947&season=1&episode=1&quality=1080p&autoplay=1&preload=metadata&bandwidth=high`
- **Cinemaos TV**: `https://cinemaos.tech/player/tt0944947/1/1?quality=1080p&autoplay=1&preload=auto&bandwidth=high`

## Key Changes Made
1. **Service Descriptions**: Updated to highlight "Download, Dubbed" capabilities
2. **Service Order**: Moved RIVESTREAM and CINEMAOS below MOVIES111 for priority
3. **Default Service**: **Kept 111Movies as the default streaming service**
4. **Enhanced Features**: Both new services now support downloads and dubbed content
5. **Component Integration**: All components now use `DEFAULT_STREAMING_SERVICE` instead of hardcoded values

## Notes
- **111Movies remains the default streaming service**
- Both new services follow the existing streaming service pattern
- They are automatically included in all streaming-related functionality
- Network-based selection prioritizes them for high-speed connections
- All existing features (progress tracking, quality selection, etc.) work with the new services
- Download and dubbed content support is now prominently featured
- Components automatically use the default service without hardcoded references 