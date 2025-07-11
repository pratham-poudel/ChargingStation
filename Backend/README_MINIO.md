# MinIO File Storage Integration

This document describes the MinIO file storage integration for the Charging Station Backend.

## Overview

MinIO is configured to handle file uploads for the charging station platform with organized folder structure for different types of files.

## Folder Structure

```
mybucket/
├── Profiles/          # Profile pictures of station proprietors
├── Thumbnails/        # Station thumbnail/cover images
├── Documents/         # Legal documents and certifications
├── Images/           # Station images and photos
└── Uploads/          # General file uploads
```

## Configuration

### Environment Variables

Add these variables to your `.env` file:

```bash
# MinIO Configuration
MINIO_ENDPOINT=127.0.0.1
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=mybucket
```

### Starting MinIO Server

```bash
.\minio.exe server C:\charging\Data1 C:\charging\Data2 --address ":9000" --console-address ":9001"
```

## API Endpoints

### General Upload Endpoints

#### Get Available Folders
```http
GET /api/uploads/folders
```

#### Upload Single File
```http
POST /api/uploads/:folder/single
Content-Type: multipart/form-data

file: [file]
```

#### Upload Multiple Files
```http
POST /api/uploads/:folder/multiple
Content-Type: multipart/form-data

files: [file1, file2, ...]
```

### Specialized Upload Endpoints

#### Upload Profile Picture
```http
POST /api/uploads/profile
Content-Type: multipart/form-data

profile: [image file]
```

#### Upload Thumbnail
```http
POST /api/uploads/thumbnail
Content-Type: multipart/form-data

thumbnail: [image file]
```

#### Upload Station Images
```http
POST /api/uploads/station-images
Content-Type: multipart/form-data

images: [image1, image2, ...]
```

#### Upload Legal Documents
```http
POST /api/uploads/documents
Content-Type: multipart/form-data

documents: [doc1, doc2, ...]
```

### File Management Endpoints

#### List Files in Folder
```http
GET /api/uploads/:folder/list?limit=50
```

#### Get File URL
```http
GET /api/uploads/file/:objectName/url?expiry=3600
```

#### Get File Metadata
```http
GET /api/uploads/file/:objectName/metadata
```

#### Delete File
```http
DELETE /api/uploads/file/:objectName
```

## File Type Restrictions

### Profiles Folder
- **Allowed**: JPEG, JPG, PNG, WebP
- **Max Size**: 5MB

### Thumbnails Folder
- **Allowed**: JPEG, JPG, PNG, WebP
- **Max Size**: 5MB

### Images Folder
- **Allowed**: JPEG, JPG, PNG, WebP, GIF
- **Max Size**: 10MB

### Documents Folder
- **Allowed**: PDF, DOC, DOCX, JPEG, JPG, PNG
- **Max Size**: 20MB

### Uploads Folder
- **Allowed**: Images (JPEG, JPG, PNG, WebP, GIF), Documents (PDF, DOC, DOCX), Text files (TXT), JSON
- **Max Size**: 10MB

## Usage Examples

### Frontend JavaScript Example

```javascript
// Upload profile picture
const uploadProfile = async (file) => {
  const formData = new FormData();
  formData.append('profile', file);

  const response = await fetch('/api/uploads/profile', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  const result = await response.json();
  return result;
};

// Upload multiple station images
const uploadStationImages = async (files) => {
  const formData = new FormData();
  files.forEach(file => {
    formData.append('images', file);
  });

  const response = await fetch('/api/uploads/station-images', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  const result = await response.json();
  return result;
};
```

### Backend Service Usage

```javascript
const { fileService } = require('./services/FileService');

// Upload profile picture
const uploadProfilePicture = async (fileBuffer, fileName, proprietorId) => {
  const result = await fileService.uploadProfilePicture(
    fileBuffer, 
    fileName, 
    proprietorId
  );
  return result;
};

// Get all files for a station
const getStationFiles = async (stationId) => {
  const files = await fileService.getEntityFiles(stationId, 'station');
  return files;
};
```

## Testing

Run the MinIO test to verify everything is working:

```bash
npm run test:minio
```

## Security Features

1. **Authentication Required**: All upload endpoints require valid JWT token
2. **File Type Validation**: Only allowed file types can be uploaded
3. **File Size Limits**: Different limits for different folders
4. **Presigned URLs**: Secure file access with expirable URLs
5. **Input Validation**: Request validation middleware

## Error Handling

The system includes comprehensive error handling for:
- Connection failures
- File type violations
- Size limit exceeded
- Network timeouts
- Invalid requests

## Monitoring

File operations are logged with:
- Upload success/failure
- File sizes and types
- User authentication details
- Error messages

## Maintenance

### Cleanup Old Files

```javascript
const { fileService } = require('./services/FileService');

// Clean up files older than 30 days
const cleanupResult = await fileService.cleanupOldFiles(30);
```

### Backup Strategy

1. Use MinIO's built-in replication
2. Regular bucket snapshots
3. Export important files to external storage

## Troubleshooting

### Common Issues

1. **Connection Failed**
   - Check if MinIO server is running
   - Verify endpoint and port in .env
   - Check network connectivity

2. **Bucket Not Found**
   - Ensure bucket 'mybucket' exists
   - Check bucket permissions
   - Verify access credentials

3. **Upload Failed**
   - Check file size limits
   - Verify file type is allowed
   - Ensure sufficient disk space

4. **Authentication Error**
   - Verify JWT token is valid
   - Check token expiration
   - Ensure user has upload permissions

### Debug Commands

```bash
# Test MinIO connection
npm run test:minio

# Check server logs
node -e "const {connectMinIO} = require('./config/minio'); connectMinIO().then(console.log)"

# List bucket contents
node -e "const {listFiles} = require('./config/minio'); listFiles('Uploads').then(console.log)"
```

## Performance Considerations

1. **File Size**: Keep files under recommended limits
2. **Concurrent Uploads**: Limited to 5 files per request
3. **URL Caching**: Presigned URLs are cached for 1 hour by default
4. **Connection Pooling**: MinIO client handles connection pooling automatically

## Production Deployment

For production deployment:

1. Change default MinIO credentials
2. Enable SSL/TLS
3. Configure proper backup strategy
4. Set up monitoring and alerts
5. Implement proper access controls
6. Use environment-specific configuration
