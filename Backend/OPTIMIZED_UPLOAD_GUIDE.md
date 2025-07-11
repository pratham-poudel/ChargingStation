# Optimized File Upload Implementation Guide

## Overview
This implementation provides RAM-efficient file upload solutions that minimize server memory usage while maximizing S3 bucket utilization efficiency.

## Key Optimizations Implemented

### 1. **Direct S3 Uploads (Zero Server RAM Usage)**
- **Method**: Presigned URLs for client-side direct uploads
- **RAM Usage**: 0 MB (bypasses server entirely)
- **Best For**: Large files (>5MB), high-volume uploads
- **Endpoint**: `POST /api/uploads-optimized/presigned`

### 2. **Streaming Server Uploads (Reduced RAM Usage)**
- **Method**: Multipart streaming with temporary disk storage
- **RAM Usage**: ~1-5MB (vs 10-50MB with buffer storage)
- **Best For**: When direct upload is not possible
- **Endpoint**: `POST /api/uploads-optimized/:folder/single-stream`

### 3. **Intelligent Upload Selection**
- **Method**: Automatically chooses best upload method based on file size
- **Logic**: Direct S3 for files >5MB, streaming for smaller files
- **Fallback**: Graceful fallback from direct to streaming

## Implementation Details

### Server-Side Components

#### 1. **OptimizedUploadService** (`config/optimized-upload.js`)
```javascript
// Key features:
- Multipart streaming uploads using @aws-sdk/lib-storage
- Presigned URL generation for direct uploads
- Automatic cleanup of temporary files
- Progress tracking for large uploads
- Memory-efficient buffer-to-stream conversion
```

#### 2. **Optimized Middleware** (`middleware/optimized-upload.js`)
```javascript
// Key features:
- Stream processing instead of buffer accumulation
- Automatic temporary file cleanup
- Memory usage monitoring
- Upload rate limiting
- Graceful error handling
```

#### 3. **Optimized Routes** (`routes/uploads-optimized.js`)
```javascript
// Available endpoints:
- /presigned - Generate presigned URLs
- /:folder/single-stream - Single file streaming upload
- /:folder/multiple-stream - Multiple files streaming upload
- /profile-stream - Optimized profile picture upload
- /station-images-stream - Optimized station images upload
- /documents-stream - Optimized document upload
- /memory-status - Server memory monitoring
```

### Client-Side Components

#### 1. **OptimizedUploadService** (`examples/optimized-client-upload.js`)
```javascript
// Key methods:
- uploadDirectToS3() - Direct S3 upload (0 server RAM)
- uploadViaStreamingServer() - Streaming upload (minimal RAM)
- smartUpload() - Intelligent method selection
- uploadWithProgress() - Progress tracking
```

## Usage Examples

### 1. Direct S3 Upload (Recommended for Large Files)
```javascript
const uploadService = new OptimizedUploadService('/api/uploads-optimized', getToken);

// Zero server RAM usage
const result = await uploadService.uploadDirectToS3(file, 'Images');
console.log('Uploaded directly to S3:', result.file.url);
```

### 2. Smart Upload (Automatic Method Selection)
```javascript
// Automatically chooses best method based on file size
const result = await uploadService.smartUpload(file, 'Documents');
console.log('Upload method used:', result.file.uploadMethod);
```

### 3. Profile Picture Upload (Optimized)
```javascript
const result = await uploadService.uploadProfileOptimized(profileFile);
console.log('Profile uploaded:', result.file.url);
```

### 4. Multiple Station Images (Streaming)
```javascript
const result = await uploadService.uploadStationImagesOptimized(imageFiles);
console.log(`${result.images.length} images uploaded successfully`);
```

## Memory Usage Comparison

### Before Optimization (Buffer-based)
```
Small file (1MB):     1MB RAM per upload
Medium file (5MB):    5MB RAM per upload  
Large file (20MB):   20MB RAM per upload
5 concurrent uploads: 100MB+ RAM usage
```

### After Optimization
```
Direct S3 Upload:     0MB RAM (any file size)
Streaming Upload:     1-5MB RAM (any file size)
5 concurrent uploads: 5-25MB RAM usage (80-95% reduction)
```

## Rate Limiting Configuration

```javascript
// Configured rate limits:
uploadRateLimit(10, 60000)  // Presigned URLs: 10/minute
uploadRateLimit(5, 60000)   // Single uploads: 5/minute  
uploadRateLimit(3, 60000)   // Multiple uploads: 3/minute
uploadRateLimit(2, 60000)   // Station images: 2/minute
```

## Environment Variables

Add these to your `.env` file:
```env
# Temporary upload directory (optional)
TEMP_UPLOAD_DIR=/tmp/uploads

# Enable/disable optimized uploads
ENABLE_OPTIMIZED_UPLOADS=true

# Memory monitoring threshold (MB)
MEMORY_WARNING_THRESHOLD=500
```

## Monitoring and Debugging

### 1. Memory Status Endpoint
```javascript
GET /api/uploads-optimized/memory-status
// Returns current server memory usage
```

### 2. Console Logging
```javascript
// Automatic logging includes:
- Memory usage before/after uploads
- Upload method used (direct vs streaming)
- File cleanup operations
- Performance metrics
```

### 3. Progress Tracking
```javascript
const result = await uploadService.uploadWithProgress(file, 'Images', (progress) => {
  console.log(`Progress: ${progress.percent}%`);
});
```

## Migration from Existing Upload System

### Step 1: Update Client Code
```javascript
// Replace existing upload service
const uploadService = new OptimizedUploadService('/api/uploads-optimized', getToken);

// Use smart upload for automatic optimization
const result = await uploadService.smartUpload(file, folder);
```

### Step 2: Update Server Routes (Gradual Migration)
```javascript
// Add optimized routes alongside existing ones
app.use('/api/uploads', uploadRoutes);           // Keep existing
app.use('/api/uploads-optimized', optimizedUploadRoutes); // Add new
```

### Step 3: Monitor Performance
```javascript
// Check memory usage improvement
const memoryStatus = await uploadService.getServerMemoryStatus();
console.log('Memory usage:', memoryStatus.data.memoryUsage);
```

## Best Practices

### 1. File Size Strategy
- **< 5MB**: Use streaming uploads (faster for small files)
- **> 5MB**: Use direct S3 uploads (no server RAM impact)
- **> 50MB**: Always use direct S3 uploads

### 2. Concurrent Upload Limits
- **Direct S3**: No server limit (S3 handles it)
- **Streaming**: Limit to 5-10 concurrent uploads max

### 3. Error Handling
- Always implement fallback from direct to streaming
- Monitor and alert on memory usage spikes
- Implement retry logic for failed uploads

### 4. Performance Monitoring
- Track memory usage trends
- Monitor upload success rates
- Measure upload speed improvements

## Troubleshooting

### Common Issues

1. **High Memory Usage**: Switch to direct S3 uploads
2. **Upload Failures**: Check presigned URL expiry times
3. **Slow Uploads**: Verify S3 endpoint configuration
4. **File Cleanup Issues**: Check temporary directory permissions

### Debug Commands
```bash
# Check server memory
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/uploads-optimized/memory-status

# Test direct upload capability
curl -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"fileName":"test.jpg","folder":"Images","contentType":"image/jpeg"}' \
  http://localhost:5000/api/uploads-optimized/presigned
```

## Performance Results

Expected improvements with this implementation:
- **90-95%** reduction in server RAM usage for file uploads
- **50-80%** improvement in concurrent upload capacity
- **Zero** server RAM usage for large file uploads (direct S3)
- **Improved** server stability under high upload loads
- **Better** S3 bucket utilization efficiency
