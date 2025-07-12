import React, { useState, useEffect } from 'react';
import { directUploadAPI } from '../../../services/directS3Upload';
import { merchantAPI } from '../../../services/merchantAPI';
import { stationManagementService } from '../../../services/stationManagementAPI';
import UploadProgress from '../../../components/UploadProgress';
import uploadService from '../../../services/uploadService';

// Helper function to safely get station master photo URL
const getStationMasterPhotoUrl = (photo) => {
  if (!photo) return null;
  
  if (typeof photo === 'string') {
    return photo;
  }
  
  if (typeof photo === 'object' && photo.url) {
    return photo.url;
  }
  
  return null;
};

const EditStationModal = ({ station, isOpen, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: {
      street: '',
      landmark: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India'
    },
    location: {
      coordinates: [0, 0]
    },
    stationMaster: {
      name: '',
      phoneNumber: '',
      photo: null
    },
    amenities: [],
    operatingHours: {
      monday: { open: '09:00', close: '18:00', is24Hours: false },
      tuesday: { open: '09:00', close: '18:00', is24Hours: false },
      wednesday: { open: '09:00', close: '18:00', is24Hours: false },
      thursday: { open: '09:00', close: '18:00', is24Hours: false },
      friday: { open: '09:00', close: '18:00', is24Hours: false },
      saturday: { open: '09:00', close: '18:00', is24Hours: false },
      sunday: { open: '09:00', close: '18:00', is24Hours: false }
    },
    chargingPorts: [],
    totalSlots: 1,
    availableSlots: 1,
    pricePerHour: 0,
    isActive: true
  });  
  const [images, setImages] = useState([]);
  const [stationMasterPhoto, setStationMasterPhoto] = useState(null);
  const [existingImages, setExistingImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Upload progress states
  const [uploadProgress, setUploadProgress] = useState({
    isVisible: false,
    files: [],
    currentStep: 'preparing',
    progress: { overall: 0, completed: 0, files: [], currentFile: null },
    error: null,
    batchId: null
  });
  
  const amenityOptions = [
    'parking', 'restroom', 'cafe', 'wifi', 'restaurant', 
    'atm', 'waiting_area', 'security', 'cctv', 'air_pump'
  ];
  useEffect(() => {
    if (station && isOpen) {
      console.log('Station data received:', station);
      console.log('Station address:', station.address);
      console.log('Station location:', station.location);
      console.log('Station stationMaster:', station.stationMaster);
      console.log('Station stationMaster photo:', station.stationMaster?.photo);
      console.log('Station stationMaster photo type:', typeof station.stationMaster?.photo);
      
      setFormData({
        name: station.name || '',
        description: station.description || '',
        address: {
          street: station.address?.street || '',
          landmark: station.address?.landmark || '',
          city: station.address?.city || '',
          state: station.address?.state || '',
          pincode: station.address?.pincode || '',
          country: station.address?.country || 'India'
        },
        location: {
          coordinates: station.location?.coordinates || [0, 0]
        },
        stationMaster: {
          name: station.stationMaster?.name || '',
          phoneNumber: station.stationMaster?.phoneNumber || '',
          photo: (station.stationMaster?.photo && typeof station.stationMaster.photo === 'object' && station.stationMaster.photo?.url) 
                 ? station.stationMaster.photo 
                 : (typeof station.stationMaster?.photo === 'string' ? station.stationMaster.photo : null)
        },        amenities: station.amenities || [],
        operatingHours: (() => {
          // Handle both operatingHours object and timing array formats
          if (station.operatingHours && typeof station.operatingHours === 'object') {
            return station.operatingHours;
          } else if (station.timing && Array.isArray(station.timing)) {
            // Convert timing array to operatingHours object
            const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
            const operatingHours = {};
            days.forEach((day, index) => {
              if (station.timing[index]) {
                operatingHours[day] = {
                  open: station.timing[index].open || '09:00',
                  close: station.timing[index].close || '18:00',
                  is24Hours: station.timing[index].is24Hours || false
                };
              } else {
                operatingHours[day] = { open: '09:00', close: '18:00', is24Hours: false };
              }
            });
            return operatingHours;
          } else {
            // Default operating hours
            return {
              monday: { open: '09:00', close: '18:00', is24Hours: false },
              tuesday: { open: '09:00', close: '18:00', is24Hours: false },
              wednesday: { open: '09:00', close: '18:00', is24Hours: false },
              thursday: { open: '09:00', close: '18:00', is24Hours: false },
              friday: { open: '09:00', close: '18:00', is24Hours: false },
              saturday: { open: '09:00', close: '18:00', is24Hours: false },
              sunday: { open: '09:00', close: '18:00', is24Hours: false }
            };
          }
        })(),
        chargingPorts: station.chargingPorts || [],
        totalSlots: station.totalSlots || station.totalPorts || 1,
        availableSlots: station.availableSlots || station.availablePorts || 1,
        pricePerHour: station.pricePerHour || 0,
        isActive: station.isActive !== false
      });
      
      console.log('Mapped formData:', {
        name: station.name || '',
        description: station.description || '',
        address: {
          street: station.address?.street || '',
          landmark: station.address?.landmark || '',
          city: station.address?.city || '',
          state: station.address?.state || '',
          pincode: station.address?.pincode || '',
          country: station.address?.country || 'India'
        },
        location: {
          coordinates: station.location?.coordinates || [0, 0]
        },
        stationMaster: {
          name: station.stationMaster?.name || '',
          phoneNumber: station.stationMaster?.phoneNumber || '',
          photo: station.stationMaster?.photo || null
        },
        amenities: station.amenities || [],
        totalSlots: station.totalSlots || station.totalPorts || 1,
        availableSlots: station.availableSlots || station.availablePorts || 1,
        pricePerHour: station.pricePerHour || 0,
        isActive: station.isActive !== false
      });
      
      setExistingImages(station.images?.map(img => typeof img === 'string' ? img : (img?.url || '')) || []);
      setImages([]);
      setStationMasterPhoto(null);
      setErrors({});
    }
  }, [station, isOpen]);  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : type === 'number' ? parseFloat(value) || 0 : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  // Handle nested form data updates
  const updateNestedFormData = (parent, field, value) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: value
      }
    }));
  };

  // Handle address changes
  const handleAddressChange = (field, value) => {
    updateNestedFormData('address', field, value);
  };

  // Handle location changes
  const handleLocationChange = (coordinates) => {
    updateNestedFormData('location', 'coordinates', coordinates);
  };

  // Handle station master changes
  const handleStationMasterChange = (field, value) => {
    updateNestedFormData('stationMaster', field, value);
  };

  // Handle operating hours changes
  const handleOperatingHoursChange = (day, field, value) => {
    setFormData(prev => ({
      ...prev,
      operatingHours: {
        ...prev.operatingHours,
        [day]: {
          ...prev.operatingHours[day],
          [field]: value
        }
      }
    }));
  };

  // Handle charging ports changes
  const updateChargingPort = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      chargingPorts: prev.chargingPorts.map((port, i) => 
        i === index ? { ...port, [field]: value } : port
      )
    }));
  };

  const handleAmenityChange = (amenity) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const maxAllowedNewImages = 10 - existingImages.length;
    
    if (files.length > maxAllowedNewImages) {
      setErrors(prev => ({ 
        ...prev, 
        images: `You can only add ${maxAllowedNewImages} more images. You currently have ${existingImages.length} existing images (max total: 10).` 
      }));
      return;
    }
    
    if (files.length > 5) {
      setErrors(prev => ({ ...prev, images: 'Maximum 5 images can be uploaded at once' }));
      return;
    }
    
    setImages(files);
    if (errors.images) {
      setErrors(prev => ({ ...prev, images: null }));
    }
  };

  const handleStationMasterPhotoChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, stationMasterPhoto: 'File size must be less than 5MB' }));
        return;
      }
      
      try {
        console.log('🔄 Starting presigned upload for station master photo:', file.name);
        setUploadingPhoto(true);
        
        // Upload directly to S3 using presigned URL
        const uploadResult = await directUploadAPI.uploadProfilePicture(file);
        
        console.log('✅ Station master photo uploaded successfully:', uploadResult);
        
        if (uploadResult && uploadResult.url) {
          // Update form data with the uploaded photo URL
          setFormData(prev => ({
            ...prev,
            stationMaster: {
              ...prev.stationMaster,
              photo: {
                url: uploadResult.url,
                objectName: uploadResult.objectName,
                originalName: uploadResult.originalName,
                uploadedAt: uploadResult.uploadedAt || new Date().toISOString()
              }
            }
          }));
          
          // Clear any previous file state since we now have the uploaded URL
          setStationMasterPhoto(null);
          
          // Clear any errors
          if (errors.stationMasterPhoto) {
            setErrors(prev => ({ ...prev, stationMasterPhoto: null }));
          }
          
          console.log('📸 Station master photo URL set in form data:', uploadResult.url);
        } else {
          throw new Error('Upload failed - no URL returned');
        }
      } catch (error) {
        console.error('❌ Station master photo upload failed:', error);
        setErrors(prev => ({ 
          ...prev, 
          stationMasterPhoto: `Upload failed: ${error.message}` 
        }));
      } finally {
        setUploadingPhoto(false);
      }
    }
  };

  const removeExistingImage = (imageUrl) => {
    setExistingImages(prev => prev.filter(img => img !== imageUrl));
  };  const validateForm = () => {
    const newErrors = {};
    
    console.log('Validating form with data:', formData);
    
    if (!formData.name.trim()) newErrors.name = 'Station name is required';
    if (!formData.address.street.trim()) newErrors.address = 'Street address is required';
    if (!formData.address.city.trim()) newErrors.city = 'City is required';
    if (!formData.address.state.trim()) newErrors.state = 'State is required';
    if (!formData.address.pincode.trim()) newErrors.pincode = 'Pincode is required';
    if (!formData.stationMaster.name.trim()) newErrors.stationMasterName = 'Station master name is required';
    if (!formData.stationMaster.phoneNumber.trim()) newErrors.stationMasterPhone = 'Station master phone is required';
    
    // Fix coordinate validation - allow 0 coordinates but check for valid numbers
    const lat = formData.location.coordinates[1];
    const lng = formData.location.coordinates[0];
    if (lat === undefined || lat === null || isNaN(lat) || lat < -90 || lat > 90) {
      newErrors.latitude = 'Valid latitude (-90 to 90) is required';
    }
    if (lng === undefined || lng === null || isNaN(lng) || lng < -180 || lng > 180) {
      newErrors.longitude = 'Valid longitude (-180 to 180) is required';
    }
    
    if (!formData.totalSlots || formData.totalSlots < 1) newErrors.totalSlots = 'Total slots must be at least 1';
    if (formData.availableSlots === undefined || formData.availableSlots === null || formData.availableSlots < 0) newErrors.availableSlots = 'Available slots cannot be negative';
    if (parseInt(formData.availableSlots) > parseInt(formData.totalSlots)) {
      newErrors.availableSlots = 'Available slots cannot exceed total slots';
    }
    if (formData.pricePerHour === undefined || formData.pricePerHour === null || formData.pricePerHour < 0) newErrors.pricePerHour = 'Valid price per hour is required';

    console.log('Validation errors:', newErrors);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Form submitted with data:', formData);
      if (!validateForm()) {
      console.log('Validation failed with errors:', errors);
      alert('Please fix the validation errors before submitting. Check console for details.');
      return;
    }

    console.log('Validation passed, starting submission...');
    setLoading(true);
    
    try {
      let uploadedImageUrls = [];
      
      // Upload new images if any with progress tracking
      if (images.length > 0) {
        setUploadProgress({
          isVisible: true,
          files: Array.from(images),
          currentStep: 'preparing',
          progress: { overall: 0, completed: 0, files: images.map(() => ({ status: 'pending', progress: 0 })), currentFile: null },
          error: null
        });

        try {
          const uploadResult = await uploadService.uploadFiles(images, {
            onProgress: (progress) => {
              setUploadProgress(prev => ({
                ...prev,
                progress
              }));
            },
            onStepChange: (step) => {
              setUploadProgress(prev => ({
                ...prev,
                currentStep: step
              }));
            }
          });

          uploadedImageUrls = uploadResult.urls;
          setUploadProgress(prev => ({ ...prev, batchId: uploadResult.batchId }));
          console.log('✅ Images uploaded successfully:', uploadedImageUrls);

        } catch (uploadError) {
          console.error('❌ Image upload failed:', uploadError);
          setUploadProgress(prev => ({
            ...prev,
            error: uploadError.message,
            currentStep: 'error'
          }));
          return;
        }
      }

      const submitData = new FormData();
        // Add basic fields
      submitData.append('name', formData.name);
      submitData.append('description', formData.description);
      
      // Add nested objects as JSON strings (same as AddStationModal)
      submitData.append('address', JSON.stringify(formData.address));
      submitData.append('location', JSON.stringify({
        type: 'Point',
        coordinates: [
          parseFloat(formData.location.coordinates[0]),
          parseFloat(formData.location.coordinates[1])
        ]
      }));
      submitData.append('stationMaster', JSON.stringify(formData.stationMaster));
        // Add other fields (ensure numeric fields are numbers)
      submitData.append('amenities', JSON.stringify(formData.amenities));
      submitData.append('operatingHours', JSON.stringify(formData.operatingHours));
      submitData.append('chargingPorts', JSON.stringify(formData.chargingPorts));
      submitData.append('totalSlots', parseInt(formData.totalSlots));
      submitData.append('availableSlots', parseInt(formData.availableSlots));
      submitData.append('pricePerHour', parseFloat(formData.pricePerHour));
      submitData.append('isActive', formData.isActive);

      // Add existing images that weren't removed
      if (existingImages.length > 0) {
        submitData.append('existingImages', JSON.stringify(existingImages));
      }

      // Add uploaded image URLs instead of files
      if (uploadedImageUrls.length > 0) {
        submitData.append('uploadedImages', JSON.stringify(uploadedImageUrls));
      }

      // Prepare station master photo URL if uploaded
      let stationMasterPhotoUrl = null;
      if (formData.stationMaster.photo && typeof formData.stationMaster.photo === 'object' && formData.stationMaster.photo.url) {
        stationMasterPhotoUrl = formData.stationMaster.photo.url;
        console.log('📸 Including station master photo URL:', stationMasterPhotoUrl);
      }

      // Add station master photo URL to FormData if available
      if (stationMasterPhotoUrl) {
        submitData.append('stationMasterPhotoUrl', stationMasterPhotoUrl);
      }

      // Add station master photo file if provided (fallback)
      if (stationMasterPhoto) {
        submitData.append('stationMasterPhoto', stationMasterPhoto);
      }

      console.log('Calling updateStation API with ID:', station._id);
      
      // Determine which API to use based on user type
      const vendorToken = localStorage.getItem('merchantToken');
      const employeeToken = localStorage.getItem('employeeToken');
      
      let response;
      if (vendorToken) {
        // Use merchant API for vendors
        response = await merchantAPI.updateStation(station._id, submitData);
      } else if (employeeToken) {
        // Use station management API for employees
        response = await stationManagementService.updateStation(station._id, submitData);
      } else {
        throw new Error('No valid authentication token found');
      }
      
      console.log('API response:', response);      if (response.success) {
        console.log('Update successful, calling onUpdate and onClose');
        console.log('Response station data:', response.data);
        console.log('Response station _id:', response.data?._id);
        
        // Update the local form data to reflect the new photo immediately
        if (stationMasterPhoto && response.data?.stationMaster?.photo) {
          setFormData(prev => ({
            ...prev,
            stationMaster: {
              ...prev.stationMaster,
              photo: response.data.stationMaster.photo
            }
          }));
        }
        
        onUpdate(response.data);
        
        // Hide upload progress after successful submission
        setUploadProgress(prev => ({ ...prev, isVisible: false }));
        onClose();
      } else {
        console.log('Update failed:', response.message);
        setErrors({ submit: response.message || 'Failed to update station' });
      }
    } catch (error) {
      console.error('Error updating station:', error);
      setErrors({ submit: error.message || 'Failed to update station' });
      setUploadProgress(prev => ({
        ...prev,
        error: error.message,
        currentStep: 'error'
      }));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">Edit Station</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
            disabled={loading}
          >
            ×
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <form onSubmit={handleSubmit} className="space-y-6">
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-red-600">{errors.submit}</p>
              </div>
            )}            {/* Basic Information */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Station Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter station name"
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter station description"
                />
              </div>
            </div>            {/* Station Master Information */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Station Master Name *
                </label>
                <input
                  type="text"
                  value={formData.stationMaster.name}
                  onChange={(e) => handleStationMasterChange('name', e.target.value)}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.stationMasterName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter station master name"
                />
                {errors.stationMasterName && <p className="text-red-500 text-sm mt-1">{errors.stationMasterName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Station Master Phone *
                </label>
                <input
                  type="tel"
                  value={formData.stationMaster.phoneNumber}
                  onChange={(e) => handleStationMasterChange('phoneNumber', e.target.value)}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.stationMasterPhone ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter 10-digit phone number"
                  maxLength={10}
                />
                {errors.stationMasterPhone && <p className="text-red-500 text-sm mt-1">{errors.stationMasterPhone}</p>}
              </div>
            </div>{/* Address Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Address Information</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    value={formData.address.street}
                    onChange={(e) => handleAddressChange('street', e.target.value)}
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.address ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter street address"
                  />
                  {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Landmark
                  </label>
                  <input
                    type="text"
                    value={formData.address.landmark}
                    onChange={(e) => handleAddressChange('landmark', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter landmark (optional)"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    value={formData.address.city}
                    onChange={(e) => handleAddressChange('city', e.target.value)}
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.city ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter city"
                  />
                  {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State *
                  </label>
                  <input
                    type="text"
                    value={formData.address.state}
                    onChange={(e) => handleAddressChange('state', e.target.value)}
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.state ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter state"
                  />
                  {errors.state && <p className="text-red-500 text-sm mt-1">{errors.state}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pincode *
                  </label>
                  <input
                    type="text"
                    value={formData.address.pincode}
                    onChange={(e) => handleAddressChange('pincode', e.target.value)}
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.pincode ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter 6-digit pincode"
                    maxLength={6}
                  />
                  {errors.pincode && <p className="text-red-500 text-sm mt-1">{errors.pincode}</p>}
                </div>
              </div>
            </div>            {/* Location Coordinates */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Latitude *
                </label>
                <input
                  type="number"
                  value={formData.location.coordinates[1]}
                  onChange={(e) => handleLocationChange([formData.location.coordinates[0], parseFloat(e.target.value) || 0])}
                  step="any"
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.latitude ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter latitude"
                />
                {errors.latitude && <p className="text-red-500 text-sm mt-1">{errors.latitude}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Longitude *
                </label>
                <input
                  type="number"
                  value={formData.location.coordinates[0]}
                  onChange={(e) => handleLocationChange([parseFloat(e.target.value) || 0, formData.location.coordinates[1]])}
                  step="any"
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.longitude ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter longitude"
                />
                {errors.longitude && <p className="text-red-500 text-sm mt-1">{errors.longitude}</p>}
              </div>
            </div>

            {/* Slots and Pricing */}
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Slots *
                </label>
                <input
                  type="number"
                  name="totalSlots"
                  value={formData.totalSlots}
                  onChange={handleInputChange}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.totalSlots ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter total slots"
                  min="1"
                />
                {errors.totalSlots && <p className="text-red-500 text-sm mt-1">{errors.totalSlots}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Available Slots *
                </label>
                <input
                  type="number"
                  name="availableSlots"
                  value={formData.availableSlots}
                  onChange={handleInputChange}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.availableSlots ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter available slots"
                  min="0"
                />
                {errors.availableSlots && <p className="text-red-500 text-sm mt-1">{errors.availableSlots}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price Per Hour *
                </label>
                <input
                  type="number"
                  name="pricePerHour"
                  value={formData.pricePerHour}
                  onChange={handleInputChange}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.pricePerHour ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter price per hour"
                  min="0"
                  step="0.01"
                />
                {errors.pricePerHour && <p className="text-red-500 text-sm mt-1">{errors.pricePerHour}</p>}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="4"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter station description (optional)"
              />
            </div>            {/* Amenities */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amenities
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {amenityOptions.map(amenity => (
                  <label key={amenity} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.amenities.includes(amenity)}
                      onChange={() => handleAmenityChange(amenity)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{amenity}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Operating Hours */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Operating Hours
              </label>
              <div className="space-y-3">
                {Object.keys(formData.operatingHours).map(day => (
                  <div key={day} className="flex items-center gap-4">
                    <div className="w-24">
                      <span className="text-sm font-medium text-gray-700 capitalize">{day}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.operatingHours[day].is24Hours}
                          onChange={(e) => handleOperatingHoursChange(day, 'is24Hours', e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">24 Hours</span>
                      </label>
                    </div>

                    {!formData.operatingHours[day].is24Hours && (
                      <>
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-gray-600">Open:</label>
                          <input
                            type="time"
                            value={formData.operatingHours[day].open}
                            onChange={(e) => handleOperatingHoursChange(day, 'open', e.target.value)}
                            className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-gray-600">Close:</label>
                          <input
                            type="time"
                            value={formData.operatingHours[day].close}
                            onChange={(e) => handleOperatingHoursChange(day, 'close', e.target.value)}
                            className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Charging Ports */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  Charging Ports
                </label>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    chargingPorts: [...prev.chargingPorts, {
                      portNumber: (prev.chargingPorts.length + 1).toString(),
                      connectorType: 'CCS',
                      powerOutput: 22,
                      chargingType: 'fast',
                      pricePerUnit: 10,
                      isOperational: true,
                      currentStatus: 'available'
                    }]
                  }))}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                >
                  Add Port
                </button>
              </div>
              
              {formData.chargingPorts.length === 0 ? (
                <p className="text-gray-500 text-sm">No charging ports configured. Add at least one port.</p>
              ) : (
                <div className="space-y-4">
                  {formData.chargingPorts.map((port, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-medium text-gray-900">Port {port.portNumber}</h4>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            chargingPorts: prev.chargingPorts.filter((_, i) => i !== index)
                          }))}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </div>
                      
                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Connector Type
                          </label>
                          <select
                            value={port.connectorType}
                            onChange={(e) => updateChargingPort(index, 'connectorType', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            {['CCS', 'CHAdeMO', 'Type2', 'GB/T', 'Tesla', 'CCS2'].map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Power Output (kW)
                          </label>
                          <input
                            type="number"
                            value={port.powerOutput}
                            onChange={(e) => updateChargingPort(index, 'powerOutput', parseFloat(e.target.value) || 0)}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            min="1"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Charging Type
                          </label>
                          <select
                            value={port.chargingType}
                            onChange={(e) => updateChargingPort(index, 'chargingType', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="slow">Slow (&lt;22kW)</option>
                            <option value="fast">Fast (22-50kW)</option>
                            <option value="rapid">Rapid (&gt;50kW)</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Price per kWh (₹)
                          </label>
                          <input
                            type="number"
                            value={port.pricePerUnit}
                            onChange={(e) => updateChargingPort(index, 'pricePerUnit', parseFloat(e.target.value) || 0)}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Status
                          </label>
                          <select
                            value={port.currentStatus}
                            onChange={(e) => updateChargingPort(index, 'currentStatus', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="available">Available</option>
                            <option value="occupied">Occupied</option>
                            <option value="maintenance">Maintenance</option>
                            <option value="out_of_order">Out of Order</option>
                          </select>
                        </div>
                        
                        <div className="flex items-center">
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={port.isOperational}
                              onChange={(e) => updateChargingPort(index, 'isOperational', e.target.checked)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">Operational</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Existing Images */}
            {existingImages.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Images
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {existingImages.map((imageUrl, index) => (
                    <div key={index} className="relative">
                      <img
                        src={imageUrl}
                        alt={`Station ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={() => removeExistingImage(imageUrl)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New Images */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload New Images (Max 5)
              </label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageChange}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.images ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.images && <p className="text-red-500 text-sm mt-1">{errors.images}</p>}
              {images.length > 0 && (
                <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Array.from(images).map((file, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Station Master Photo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Station Master Photo
              </label>
              
              {/* Show current photo if exists */}
              {formData.stationMaster.photo && !stationMasterPhoto && getStationMasterPhotoUrl(formData.stationMaster.photo) ? (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">Current Photo:</p>
                  <img
                    src={getStationMasterPhotoUrl(formData.stationMaster.photo)}
                    alt="Current Station Master"
                    className="w-32 h-32 object-cover rounded-lg border"
                    onError={(e) => {
                      console.log('Error loading station master photo');
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              ) : !stationMasterPhoto ? (
                <div className="mb-4 p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
                  <p className="text-sm text-gray-500">No current photo available</p>
                </div>
              ) : null}
              
              <input
                type="file"
                accept="image/*"
                onChange={handleStationMasterPhotoChange}
                disabled={uploadingPhoto}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.stationMasterPhoto ? 'border-red-500' : 'border-gray-300'
                } ${uploadingPhoto ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
              <p className="text-sm text-gray-500 mt-1">
                {uploadingPhoto 
                  ? 'Uploading photo...' 
                  : formData.stationMaster.photo 
                    ? 'Upload a new photo to replace the current one' 
                    : 'Upload station master photo'
                }
              </p>
              {errors.stationMasterPhoto && <p className="text-red-500 text-sm mt-1">{errors.stationMasterPhoto}</p>}
              
              {/* Show upload progress */}
              {uploadingPhoto && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <p className="text-sm text-blue-700">Uploading photo...</p>
                  </div>
                </div>
              )}
              
              {/* Show upload success message if photo was just uploaded */}
              {!uploadingPhoto && formData.stationMaster.photo && typeof formData.stationMaster.photo === 'object' && formData.stationMaster.photo.url && !getStationMasterPhotoUrl(station?.stationMaster?.photo) && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-700">✅ Photo uploaded successfully! Changes will be saved when you submit the form.</p>
                </div>
              )}
            </div>

            {/* Status */}
            <div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Station is Active</span>
              </label>
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-4 pt-6 border-t">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
              >
                {loading && (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                <span>{loading ? 'Updating...' : 'Update Station'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
      
      {/* Upload Progress Modal */}
      <UploadProgress
        isVisible={uploadProgress.isVisible}
        files={uploadProgress.files}
        currentStep={uploadProgress.currentStep}
        progress={uploadProgress.progress}
        error={uploadProgress.error}
        onCancel={() => {
          const currentBatchId = uploadProgress.batchId;
          setUploadProgress(prev => ({ ...prev, isVisible: false }));
          // Cancel any ongoing uploads
          uploadService.cancelUpload(currentBatchId);
        }}
      />
    </div>
  );
};

export default EditStationModal;
