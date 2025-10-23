# Deploy TMDB 500 Error Fixes to Production

## Current Status
✅ **Local Backend Fixed**: Running on Node.js v20.11.0, TLS issues resolved
❌ **Production Backend**: Still experiencing 500 errors on Render

## What We Fixed Locally
1. **Node.js Version**: Downgraded from v22.17.1 to v20.11.0 LTS
2. **TLS Issues**: Resolved protocol conflicts
3. **Code Issues**: Fixed ES module compatibility
4. **Error Handling**: Enhanced TMDB route error handling

## Deployment Steps

### Step 1: Commit and Push Changes
```bash
# Navigate to project root
cd /Users/anuragverma/Downloads/Streamr-main

# Add all changes
git add .

# Commit the fixes
git commit -m "Fix TMDB 500 errors: Downgrade Node.js to v20.11.0, fix TLS issues, enhance error handling"

# Push to your repository
git push origin main
```

### Step 2: Update Render Configuration
1. **Go to Render Dashboard**: https://dashboard.render.com
2. **Select your backend service**: `streamr-jjj9`
3. **Go to Settings > Environment**
4. **Update Node.js version**:
   - Set `NODE_VERSION` to `20.11.0`
   - Or add to your `package.json`:
     ```json
     {
       "engines": {
         "node": "20.11.0"
       }
     }
     ```

### Step 3: Trigger Redeployment
1. **Go to your service dashboard**
2. **Click "Manual Deploy"**
3. **Select "Deploy latest commit"**
4. **Wait for deployment to complete**

### Step 4: Verify Fix
After deployment, test your endpoints:
```bash
# Test trending endpoint
curl "https://streamr-jjj9.onrender.com/api/tmdb/trending?media_type=movie&page=1"

# Test popular endpoint  
curl "https://streamr-jjj9.onrender.com/api/tmdb/popular?media_type=movie&page=1"

# Test top-rated endpoint
curl "https://streamr-jjj9.onrender.com/api/tmdb/top-rated?media_type=movie&page=1"
```

## Alternative: Quick Fix via Render Shell

If you prefer to fix it directly on Render:

1. **Go to your service dashboard**
2. **Click "Shell"**
3. **Run these commands**:
```bash
# Check current Node.js version
node --version

# If it's v22.x, install nvm and downgrade
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install 20.11.0
nvm use 20.11.0
nvm alias default 20.11.0

# Restart the service
```

## Expected Results
After deployment:
- ✅ TMDB endpoints return 200 status
- ✅ Movie data loads successfully
- ✅ No more 500 Internal Server Errors
- ✅ Frontend displays content properly

## Troubleshooting

### If deployment fails:
1. Check Render logs for errors
2. Verify Node.js version is set to 20.11.0
3. Ensure all environment variables are set
4. Check MongoDB connection

### If endpoints still return 500:
1. Check Render service logs
2. Verify TMDB_API_KEY is set
3. Test TMDB API directly
4. Check network connectivity

## Files Modified
- `src/controllers/authController.js` - Fixed ES module issues
- `src/middleware/auth.js` - Fixed import/export syntax  
- `src/routes/tmdb.js` - Enhanced error handling
- `package.json` - Node.js version specification (if added)

## Next Steps
1. Deploy fixes to production
2. Test all TMDB endpoints
3. Monitor for any remaining issues
4. Consider implementing monitoring/alerting

Your local backend is now working correctly. Once you deploy these fixes to production, your frontend should stop receiving 500 errors and display movie content properly. 