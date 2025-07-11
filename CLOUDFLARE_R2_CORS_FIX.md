# 🔧 Cloudflare R2 CORS Configuration Fix

## Problem
Direct S3 uploads to Cloudflare R2 are failing with CORS errors when uploading documents from the frontend (`http://localhost:5173`). This causes:

1. **CORS Error**: `Access to fetch at 'https://mybucket.d5fc0a8e568261b9d0293ce5090df3a1.r2.cloudflarestorage.com/...' from origin 'http://localhost:5173' has been blocked by CORS policy`
2. **Duplicate Uploads**: The fallback mechanism triggers, causing files to be uploaded twice
3. **Rate Limiting**: The duplicate uploads trigger rate limiting (429 errors)

## Solution Applied (Code Changes)

### 1. Fixed `uploadDocument` Method
- **Before**: Tried direct S3 upload first, then fallback to streaming
- **After**: Always use streaming upload for documents to avoid CORS issues

### 2. Fixed `smartUpload` Method
- Added special handling for Documents folder to always use streaming
- Prevents CORS issues while maintaining performance for other file types

### 3. Fixed `DocumentUpload.jsx` Component
- **Before**: Double upload (optimized API + merchant context)
- **After**: Single upload via optimized API only

## Cloudflare R2 CORS Configuration Required

To enable direct S3 uploads and improve performance, configure CORS in your Cloudflare R2 bucket:

### Step 1: Access Cloudflare R2 Dashboard
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to R2 Object Storage
3. Select your bucket: `mybucket`

### Step 2: Configure CORS Policy
Add this CORS configuration:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:5173",
      "http://localhost:3000",
      "https://your-production-domain.com"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST",
      "DELETE",
      "HEAD"
    ],
    "AllowedHeaders": [
      "*",
      "Authorization",
      "Content-Type",
      "Content-Length",
      "Content-MD5",
      "Cache-Control",
      "x-amz-content-sha256",
      "x-amz-date",
      "x-amz-security-token",
      "x-amz-user-agent",
      "x-amz-meta-*"
    ],
    "ExposeHeaders": [
      "ETag",
      "x-amz-meta-*",
      "x-amz-request-id",
      "x-amz-id-2"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

### Step 3: Update Frontend Domain
When deploying to production, add your production domain to `AllowedOrigins`.

## Current Workaround Status

✅ **Fixed**: Document uploads now work without CORS errors
✅ **Fixed**: No more duplicate uploads
✅ **Fixed**: No more rate limiting issues
⚠️ **Temporary**: Documents use streaming upload instead of direct S3
🎯 **Future**: Configure R2 CORS to enable direct uploads for better performance

## Performance Impact

| Upload Method | RAM Usage | Speed | Status |
|---------------|-----------|-------|--------|
| Direct S3 | 0 MB | Fastest | ❌ CORS blocked |
| Streaming | <1 MB | Fast | ✅ Working |
| Buffer Upload | 50+ MB | Slowest | ❌ Removed |

## Testing Results

- ✅ Documents upload successfully 
- ✅ No CORS errors
- ✅ No duplicate uploads
- ✅ Station master photos work
- ✅ Image uploads work
- ✅ Memory usage optimized

## Next Steps

1. **Configure R2 CORS** (recommended for production)
2. **Test direct uploads** after CORS configuration
3. **Update code** to re-enable direct uploads for documents once CORS is configured

## Files Modified

- `Frontend/src/services/optimizedUploadAPI.js` - Fixed upload logic
- `Frontend/src/components/DocumentUpload.jsx` - Removed duplicate upload
- `Backend/routes/uploads-optimized.js` - Added missing `/document-stream` endpoint
- `Backend/routes/vendor-stations.js` - Added `stationMasterPhotoUrl` support
