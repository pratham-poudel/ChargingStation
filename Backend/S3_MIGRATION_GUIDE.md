# S3 SDK Migration Guide

This document describes the migration from MinIO native SDK to AWS S3 SDK for improved S3 compatibility.

## Overview

The application has been migrated from using the MinIO native SDK to the AWS S3 SDK (`@aws-sdk/client-s3`). This change provides better compatibility with all S3-compatible storage services including:

- Amazon S3
- MinIO
- DigitalOcean Spaces
- Wasabi
- Backblaze B2
- Any other S3-compatible storage

## Changes Made

### 1. Dependencies
- **Added**: `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` (already present)
- **Kept**: `minio` package (can be removed if desired, but keeping for compatibility)

### 2. Configuration Updates

#### Environment Variables
Updated `.env` file with new configuration:

```env
# S3-Compatible Storage Configuration
MINIO_ENDPOINT=127.0.0.1
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=mybucket
AWS_REGION=us-east-1
```

#### Key Changes:
- Added `AWS_REGION` for better S3 compatibility
- Enhanced comments to clarify S3 compatibility
- Maintained existing environment variable names for backward compatibility

### 3. Code Changes

#### Files Modified:
1. **`config/minio.js`** - Complete rewrite to use AWS S3 SDK
2. **`routes/files.js`** - Updated file serving logic
3. **`.env`** - Added AWS region configuration

#### Key Features:
- **S3Client**: Replaced MinIO Client with AWS S3Client
- **Command Pattern**: Using AWS SDK v3 command pattern
- **Stream Handling**: Improved file streaming for better performance
- **Error Handling**: Enhanced error handling for S3 compatibility
- **Presigned URLs**: Better presigned URL generation

### 4. New Methods Added

#### `getFileStream(objectName)`
- Returns a readable stream for file serving
- Improves performance by streaming files directly

#### Enhanced `bucketExists()`
- Uses proper S3 HeadBucket command
- Better error handling for different S3 implementations

## Configuration for Different S3 Services

### Amazon S3
```env
MINIO_ENDPOINT=s3.amazonaws.com
MINIO_PORT=443
MINIO_USE_SSL=true
MINIO_ACCESS_KEY=your_aws_access_key
MINIO_SECRET_KEY=your_aws_secret_key
MINIO_BUCKET_NAME=your-bucket-name
AWS_REGION=us-east-1
```

### MinIO (Local/Self-hosted)
```env
MINIO_ENDPOINT=127.0.0.1
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=mybucket
AWS_REGION=us-east-1
```

### DigitalOcean Spaces
```env
MINIO_ENDPOINT=nyc3.digitaloceanspaces.com
MINIO_PORT=443
MINIO_USE_SSL=true
MINIO_ACCESS_KEY=your_spaces_key
MINIO_SECRET_KEY=your_spaces_secret
MINIO_BUCKET_NAME=your-space-name
AWS_REGION=nyc3
```

### Wasabi
```env
MINIO_ENDPOINT=s3.wasabisys.com
MINIO_PORT=443
MINIO_USE_SSL=true
MINIO_ACCESS_KEY=your_wasabi_key
MINIO_SECRET_KEY=your_wasabi_secret
MINIO_BUCKET_NAME=your-bucket-name
AWS_REGION=us-east-1
```

## Testing

Run the migration test script to verify functionality:

```bash
node test-s3-migration.js
```

This script will:
1. Connect to your S3-compatible storage
2. Upload a test file
3. Check file existence
4. List files in the bucket
5. Generate presigned URLs
6. Verify folder structure

## Backward Compatibility

- All existing routes and API endpoints remain unchanged
- File URLs continue to work as before
- No database migrations required
- All existing files remain accessible

## Benefits of Migration

1. **Universal Compatibility**: Works with any S3-compatible service
2. **Better Performance**: Improved streaming and connection handling
3. **Enhanced Error Handling**: Better error messages and handling
4. **Future-Proof**: AWS SDK is actively maintained and updated
5. **Standardized**: Uses industry-standard S3 API patterns

## Troubleshooting

### Common Issues:

1. **Connection Errors**: Verify endpoint and credentials
2. **SSL Issues**: Check `MINIO_USE_SSL` setting
3. **Bucket Access**: Ensure bucket exists and has proper permissions
4. **Region Errors**: Verify `AWS_REGION` matches your service region

### Debug Mode:
Enable debug logging by setting:
```env
NODE_DEBUG=aws-sdk
```

## Migration Verification

After deployment, verify that:
- [x] File uploads work correctly
- [x] File downloads work through `/api/files/*` routes
- [x] Presigned URLs generate properly
- [x] Existing files remain accessible
- [x] All file operations (list, delete, metadata) work

## Next Steps

1. **Test thoroughly** with your specific S3 service
2. **Monitor performance** after deployment
3. **Consider removing** the `minio` package dependency if no longer needed
4. **Update documentation** for your team about the new configuration options

## Support

For issues or questions about this migration, refer to:
- AWS SDK for JavaScript v3 documentation
- Your S3 service provider's documentation
- This project's issue tracker
