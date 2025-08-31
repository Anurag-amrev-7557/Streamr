# Authentication 401 Error Fix

## Problem Description

After fixing the watchlist sync 500 error, users started experiencing 401 Unauthorized errors when trying to access protected endpoints like `/api/user/profile`. This indicated that while the backend was running, there were authentication issues preventing users from accessing their data.

## Root Causes Identified

### 1. JWT Token Payload Mismatch (Primary Issue)
- **Problem**: JWT tokens were being generated with `{ userId: payload.id }` but the auth middleware was looking for `decoded.id`
- **Location**: `backend/src/utils/jwt.js`
- **Impact**: Token verification failed because the payload structure didn't match what the middleware expected

### 2. Inconsistent Token Field Access
- **Problem**: Some parts of the code used `payload.userId` while others used `payload.id`
- **Location**: `backend/src/controllers/authController.js` - refresh token method
- **Impact**: Token refresh failed because it couldn't find the user ID

### 3. Short Token Expiration Time
- **Problem**: Access tokens expired after only 15 minutes, causing frequent authentication failures
- **Location**: `backend/src/utils/jwt.js`
- **Impact**: Users were logged out too frequently, especially during active sessions

### 4. Cookie Compatibility Issues
- **Problem**: `sameSite: 'none'` setting caused issues in some browsers and development environments
- **Location**: `backend/src/controllers/authController.js`
- **Impact**: Refresh tokens weren't properly stored/retrieved, leading to authentication failures

## Fixes Implemented

### 1. Fixed JWT Token Payload Structure
```javascript
// Before: { userId: payload.id } (incorrect)
// After: { id: payload.id } (correct)
const signAccessToken = (payload) => {
  return jwt.sign({ id: payload.id }, process.env.JWT_SECRET, {
    expiresIn: '1h' // Increased from 15m
  });
};
```

**Files Modified**: `backend/src/utils/jwt.js`

### 2. Standardized Token Field Access
```javascript
// Before: payload.userId (inconsistent)
// After: payload.id (consistent)
const user = await User.findById(payload.id);
```

**Files Modified**: `backend/src/controllers/authController.js`

### 3. Increased Token Expiration Time
```javascript
// Before: expiresIn: '15m' (too short)
// After: expiresIn: '1h' (more reasonable)
const signAccessToken = (payload) => {
  return jwt.sign({ id: payload.id }, process.env.JWT_SECRET, {
    expiresIn: '1h' // 1 hour instead of 15 minutes
  });
};
```

**Files Modified**: 
- `backend/src/utils/jwt.js`
- `frontend/src/contexts/AuthContext.jsx`

### 4. Improved Cookie Settings
```javascript
// Before: sameSite: 'none' (caused compatibility issues)
// After: Dynamic sameSite based on environment
sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
```

**Files Modified**: `backend/src/controllers/authController.js`

### 5. Enhanced Auth Middleware Logging
```javascript
// Added comprehensive logging for debugging
console.log('🔍 Auth: Verifying token...');
console.log('✅ Auth: Token verified, payload:', { id: decoded.id, exp: decoded.exp });
console.log('✅ Auth: User authenticated:', user._id);
```

**Files Modified**: `backend/src/middleware/auth.js`

### 6. Updated Frontend Token Refresh Logic
```javascript
// Before: 14 minutes (too aggressive)
// After: 55 minutes (matches new 1-hour expiration)
const TOKEN_REFRESH_INTERVAL = 55 * 60 * 1000;
```

**Files Modified**: `frontend/src/contexts/AuthContext.jsx`

## Technical Details

### JWT Token Structure
- **Access Token**: Contains `{ id: user._id }` with 1-hour expiration
- **Refresh Token**: Contains `{ id: user._id }` with 7-day expiration
- **Consistent Payload**: Both tokens use the same `id` field structure

### Authentication Flow
1. User logs in → receives access token (1 hour) + refresh token (7 days)
2. Frontend refreshes access token every 55 minutes
3. If refresh fails, user is logged out and must re-authenticate
4. Backend validates tokens using consistent `decoded.id` field

### Cookie Configuration
- **Development**: `sameSite: 'lax'` for better local testing
- **Production**: `sameSite: 'none'` for cross-origin requests
- **Security**: `httpOnly: true` and `secure: true` in production

## Testing the Fix

### Backend Testing
1. JWT token generation now uses consistent payload structure
2. Auth middleware properly extracts user ID from token
3. Token refresh works with correct payload field access
4. Enhanced logging provides better debugging information

### Frontend Testing
1. Token refresh interval matches new expiration time
2. Authentication state is properly maintained
3. Profile and other protected endpoints are accessible
4. Automatic token refresh prevents frequent logouts

## Prevention Measures

### 1. Consistent Token Structure
- All JWT tokens use the same payload structure
- Single source of truth for token field names
- Clear documentation of expected payload format

### 2. Better Token Management
- Longer access token expiration reduces frequent refreshes
- Frontend refresh timing matches backend expiration
- Graceful fallback to re-authentication when refresh fails

### 3. Enhanced Monitoring
- Comprehensive logging in auth middleware
- Token expiration tracking and warnings
- Better error messages for different failure types

### 4. Environment-Aware Configuration
- Cookie settings adapt to development vs production
- Secure defaults for production environments
- Flexible configuration for local development

## Files Modified

1. `backend/src/utils/jwt.js` - Fixed JWT payload structure and expiration
2. `backend/src/controllers/authController.js` - Fixed token field access and cookie settings
3. `backend/src/middleware/auth.js` - Enhanced logging and error handling
4. `frontend/src/contexts/AuthContext.jsx` - Updated token refresh timing

## Next Steps

1. **Deploy the backend fixes** to resolve authentication issues
2. **Test the authentication flow** with login, token refresh, and protected endpoints
3. **Monitor the logs** for any remaining authentication issues
4. **Verify cookie behavior** in different browsers and environments
5. **Consider implementing token blacklisting** for additional security

## Expected Results

After implementing these fixes:
- ✅ Authentication should work consistently across all endpoints
- ✅ Token refresh should work properly without 401 errors
- ✅ Users should stay logged in longer (1 hour vs 15 minutes)
- ✅ Better debugging information for future authentication issues
- ✅ Improved compatibility across different browsers and environments
- ✅ More robust token management and error handling

## Security Considerations

- Access tokens still expire relatively quickly (1 hour) for security
- Refresh tokens are stored in HTTP-only cookies to prevent XSS attacks
- Token payload structure is consistent and predictable
- Enhanced logging helps identify potential security issues
- Environment-specific cookie settings maintain security in production
