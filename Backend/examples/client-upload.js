// Example client-side code for using MinIO upload endpoints

/**
 * Upload service for handling file uploads to MinIO
 */
class UploadService {
  constructor(baseURL = '/api/uploads', getAuthToken) {
    this.baseURL = baseURL;
    this.getAuthToken = getAuthToken; // Function that returns auth token
  }

  /**
   * Get authorization headers
   */
  getHeaders() {
    const token = this.getAuthToken();
    return {
      'Authorization': `Bearer ${token}`
    };
  }

  /**
   * Upload profile picture
   * @param {File} file - Profile image file
   * @returns {Promise<Object>} - Upload result
   */
  async uploadProfile(file) {
    const formData = new FormData();
    formData.append('profile', file);

    const response = await fetch(`${this.baseURL}/profile`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Upload station thumbnail
   * @param {File} file - Thumbnail image file
   * @returns {Promise<Object>} - Upload result
   */
  async uploadThumbnail(file) {
    const formData = new FormData();
    formData.append('thumbnail', file);

    const response = await fetch(`${this.baseURL}/thumbnail`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Upload multiple station images
   * @param {FileList|Array} files - Array of image files
   * @returns {Promise<Object>} - Upload result
   */
  async uploadStationImages(files) {
    const formData = new FormData();
    
    for (let i = 0; i < files.length; i++) {
      formData.append('images', files[i]);
    }

    const response = await fetch(`${this.baseURL}/station-images`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Upload legal documents
   * @param {FileList|Array} files - Array of document files
   * @returns {Promise<Object>} - Upload result
   */
  async uploadDocuments(files) {
    const formData = new FormData();
    
    for (let i = 0; i < files.length; i++) {
      formData.append('documents', files[i]);
    }

    const response = await fetch(`${this.baseURL}/documents`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Upload single file to specific folder
   * @param {File} file - File to upload
   * @param {string} folder - Target folder
   * @returns {Promise<Object>} - Upload result
   */
  async uploadSingleFile(file, folder) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseURL}/${folder}/single`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Upload multiple files to specific folder
   * @param {FileList|Array} files - Files to upload
   * @param {string} folder - Target folder
   * @returns {Promise<Object>} - Upload result
   */
  async uploadMultipleFiles(files, folder) {
    const formData = new FormData();
    
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    const response = await fetch(`${this.baseURL}/${folder}/multiple`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get available folders
   * @returns {Promise<Object>} - Folders information
   */
  async getFolders() {
    const response = await fetch(`${this.baseURL}/folders`, {
      method: 'GET'
    });

    if (!response.ok) {
      throw new Error(`Failed to get folders: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * List files in a folder
   * @param {string} folder - Folder name
   * @param {number} limit - Maximum number of files to retrieve
   * @returns {Promise<Object>} - Files list
   */
  async listFiles(folder, limit = 50) {
    const response = await fetch(`${this.baseURL}/${folder}/list?limit=${limit}`, {
      method: 'GET',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to list files: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get file URL
   * @param {string} objectName - Object name in storage
   * @param {number} expiry - URL expiry time in seconds
   * @returns {Promise<Object>} - File URL
   */
  async getFileUrl(objectName, expiry = 3600) {
    const encodedObjectName = encodeURIComponent(objectName);
    const response = await fetch(`${this.baseURL}/file/${encodedObjectName}/url?expiry=${expiry}`, {
      method: 'GET',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to get file URL: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Delete file
   * @param {string} objectName - Object name in storage
   * @returns {Promise<Object>} - Delete result
   */
  async deleteFile(objectName) {
    const encodedObjectName = encodeURIComponent(objectName);
    const response = await fetch(`${this.baseURL}/file/${encodedObjectName}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to delete file: ${response.statusText}`);
    }

    return await response.json();
  }
}

/**
 * React Hook for file uploads
 */
function useFileUpload(getAuthToken) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  const uploadService = new UploadService('/api/uploads', getAuthToken);

  const uploadFiles = useCallback(async (files, uploadType, options = {}) => {
    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      let result;

      switch (uploadType) {
        case 'profile':
          result = await uploadService.uploadProfile(files[0]);
          break;
        case 'thumbnail':
          result = await uploadService.uploadThumbnail(files[0]);
          break;
        case 'station-images':
          result = await uploadService.uploadStationImages(files);
          break;
        case 'documents':
          result = await uploadService.uploadDocuments(files);
          break;
        case 'single':
          result = await uploadService.uploadSingleFile(files[0], options.folder);
          break;
        case 'multiple':
          result = await uploadService.uploadMultipleFiles(files, options.folder);
          break;
        default:
          throw new Error(`Unknown upload type: ${uploadType}`);
      }

      setProgress(100);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setUploading(false);
    }
  }, [getAuthToken]);

  return {
    uploadFiles,
    uploading,
    error,
    progress,
    setError
  };
}

/**
 * Example React component for profile picture upload
 */
function ProfileUpload({ onUploadSuccess, getAuthToken }) {
  const { uploadFiles, uploading, error, setError } = useFileUpload(getAuthToken);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = async (files) => {
    if (!files || files.length === 0) return;

    const file = files[0];

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    try {
      const result = await uploadFiles([file], 'profile');
      onUploadSuccess(result);
    } catch (err) {
      console.error('Upload failed:', err);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  return (
    <div className="upload-container">
      <div 
        className={`upload-zone ${dragOver ? 'drag-over' : ''} ${uploading ? 'uploading' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          type="file"
          accept="image/*"
          onChange={(e) => handleFileSelect(e.target.files)}
          disabled={uploading}
          style={{ display: 'none' }}
          id="profile-upload"
        />
        <label htmlFor="profile-upload" className="upload-label">
          {uploading ? (
            <div>Uploading...</div>
          ) : (
            <div>
              <div>Drop image here or click to select</div>
              <div className="upload-hint">PNG, JPG, WebP up to 5MB</div>
            </div>
          )}
        </label>
      </div>
      
      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}
    </div>
  );
}

/**
 * Example usage
 */
function App() {
  const [authToken, setAuthToken] = useState(localStorage.getItem('token'));
  
  const getAuthToken = () => authToken;

  const handleProfileUploadSuccess = (result) => {
    console.log('Profile uploaded successfully:', result);
    // Update user profile with new image URL
    // You can store result.file.url in your user state
  };

  return (
    <div>
      <h1>File Upload Example</h1>
      <ProfileUpload 
        onUploadSuccess={handleProfileUploadSuccess}
        getAuthToken={getAuthToken}
      />
    </div>
  );
}

// Export for use in other modules
export { 
  UploadService, 
  useFileUpload, 
  ProfileUpload 
};
