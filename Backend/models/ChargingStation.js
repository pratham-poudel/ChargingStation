const mongoose = require('mongoose');

const chargingStationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Station name cannot exceed 100 characters']
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      validate: {
        validator: function(coords) {
          return coords.length === 2 && 
                 coords[0] >= -180 && coords[0] <= 180 && // longitude
                 coords[1] >= -90 && coords[1] <= 90;     // latitude
        },
        message: 'Invalid coordinates'
      }
    }
  },
  address: {
    street: { type: String, required: true, trim: true },
    landmark: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { 
      type: String, 
      required: true, 
      match: [/^[0-9]{6}$/, 'Please enter a valid 6-digit pincode']
    },
    country: { type: String, default: 'India', trim: true }
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  amenities: [{
    type: String,
    enum: [
      'parking', 'restroom', 'cafe', 'wifi', 'atm', 
      'restaurant', 'shopping', 'waiting_area', 'cctv', 
      'security', 'car_wash', 'air_pump'
    ]
  }],
  operatingHours: {
    monday: { open: String, close: String, is24Hours: { type: Boolean, default: false } },
    tuesday: { open: String, close: String, is24Hours: { type: Boolean, default: false } },
    wednesday: { open: String, close: String, is24Hours: { type: Boolean, default: false } },
    thursday: { open: String, close: String, is24Hours: { type: Boolean, default: false } },
    friday: { open: String, close: String, is24Hours: { type: Boolean, default: false } },
    saturday: { open: String, close: String, is24Hours: { type: Boolean, default: false } },
    sunday: { open: String, close: String, is24Hours: { type: Boolean, default: false } }
  },  images: [{
    url: { type: String, required: true },
    caption: { type: String, trim: true },
    isPrimary: { type: Boolean, default: false },
    isThumbnail: { type: Boolean, default: false },
    objectName: { type: String }, // MinIO object name
    originalName: { type: String }, // Original file name
    uploadedAt: { type: Date, default: Date.now }
  }],
  stationMaster: {
    name: { 
      type: String, 
      required: true, 
      trim: true,
      maxlength: [100, 'Station master name cannot exceed 100 characters']
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
      match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number']
    },
    photo: {
      url: { type: String },
      objectName: { type: String }, // MinIO object name
      originalName: { type: String }, // Original file name
      uploadedAt: { type: Date }
    }
  },
  chargingPorts: [{
    portNumber: {
      type: String,
      required: true
    },
    connectorType: {
      type: String,
      required: true,
      enum: ['CCS', 'CHAdeMO', 'Type2', 'GB/T', 'Tesla', 'CCS2']
    },
    powerOutput: {
      type: Number, // in kW
      required: true,
      min: 1
    },
    chargingType: {
      type: String,
      required: true,
      enum: ['slow', 'fast', 'rapid'], // slow: <22kW, fast: 22-50kW, rapid: >50kW
    },
    pricePerUnit: {
      type: Number, // Price per kWh
      required: true,
      min: 0
    },
    isOperational: {
      type: Boolean,
      default: true
    },
    lastMaintenance: {
      type: Date,
      default: Date.now
    },
    currentStatus: {
      type: String,
      enum: ['available', 'occupied', 'maintenance', 'out_of_order'],
      default: 'available'
    }
  }],
  totalPorts: {
    type: Number,
    default: 0
  },
  availablePorts: {
    type: Number,
    default: 0
  },
  rating: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },  verificationDate: {
    type: Date
  },
  deactivationReason: {
    type: String,
    trim: true
  },
  deactivatedAt: {
    type: Date
  },
  dockitRecommended: {
    type: Boolean,
    default: false
  },
  // Dockit Premium subscription fields
  premiumSubscription: {
    isActive: {
      type: Boolean,
      default: false
    },
    type: {
      type: String,
      enum: ['monthly', 'yearly'],
      default: 'monthly'
    },
    startDate: {
      type: Date
    },
    endDate: {
      type: Date
    },
    lastPaymentDate: {
      type: Date
    },
    nextPaymentDate: {
      type: Date
    },
    autoRenew: {
      type: Boolean,
      default: false
    },
    paymentHistory: [{
      transactionId: { type: String },
      baseAmount: { type: Number },
      vatAmount: { type: Number },
      totalAmount: { type: Number },
      currency: { type: String, default: 'NPR' },
      paymentDate: { type: Date, default: Date.now },
      paymentMethod: { type: String },
      status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
      type: { type: String, enum: ['subscription', 'renewal'], default: 'subscription' }
    }],
    features: {
      priorityInSearch: { type: Boolean, default: true },
      specialBadge: { type: Boolean, default: true },
      advancedAnalytics: { type: Boolean, default: true },
      prioritySupport: { type: Boolean, default: true },
      customMapIcon: { type: Boolean, default: true },
      tripAIPriority: { type: Boolean, default: true }
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Geospatial index for location-based queries
chargingStationSchema.index({ location: '2dsphere' });

// Indexes for performance
chargingStationSchema.index({ vendor: 1 });
chargingStationSchema.index({ isActive: 1, isVerified: 1 });
chargingStationSchema.index({ 'address.city': 1 });
chargingStationSchema.index({ 'address.pincode': 1 });
chargingStationSchema.index({ 'chargingPorts.chargingType': 1 });
chargingStationSchema.index({ rating: -1 });
chargingStationSchema.index({ dockitRecommended: -1 });

// Virtual for formatted address
chargingStationSchema.virtual('formattedAddress').get(function() {
  const addr = this.address;
  return `${addr.street}${addr.landmark ? ', ' + addr.landmark : ''}, ${addr.city}, ${addr.state} - ${addr.pincode}`;
});

// Virtual for available ports count
chargingStationSchema.virtual('currentlyAvailable').get(function() {
  if (!this.chargingPorts || !Array.isArray(this.chargingPorts)) {
    return 0;
  }
  return this.chargingPorts.filter(port => 
    port.isOperational && port.currentStatus === 'available'
  ).length;
});

// Instance method to generate fresh URLs for images
chargingStationSchema.methods.getImagesWithFreshUrls = async function() {
  const { generateFreshUrl } = require('../config/minio');
  const imagesWithFreshUrls = [];
  
  for (const image of this.images) {
    if (image?.objectName) {
      try {
        const freshUrl = await generateFreshUrl(image.objectName, 3600);
        imagesWithFreshUrls.push({
          ...image.toObject(),
          freshUrl: freshUrl,
          url: image?.url // Keep the permanent URL structure
        });
      } catch (error) {
        console.error(`Error generating fresh URL for ${image.objectName}:`, error);
        // Keep the original image data even if fresh URL generation fails
        imagesWithFreshUrls.push(image.toObject());
      }
    } else {
      imagesWithFreshUrls.push(image?.toObject?.() || image);
    }
  }
  
  return imagesWithFreshUrls;
};

// Instance method to generate fresh URL for station master photo
chargingStationSchema.methods.getStationMasterPhotoWithFreshUrl = async function() {
  if (this.stationMaster && this.stationMaster.photo && this.stationMaster.photo.objectName) {
    try {
      const { generateFreshUrl } = require('../config/minio');
      const freshUrl = await generateFreshUrl(this.stationMaster.photo.objectName, 3600);
      return {
        ...this.stationMaster.photo.toObject(),
        freshUrl: freshUrl,
        url: this.stationMaster.photo.url // Keep the permanent URL structure
      };
    } catch (error) {
      console.error(`Error generating fresh URL for station master photo:`, error);
      return this.stationMaster.photo.toObject();
    }
  }
  return this.stationMaster.photo;
};

// Pre-save middleware to update port counts
chargingStationSchema.pre('save', function(next) {
  if (this.chargingPorts && Array.isArray(this.chargingPorts)) {
    this.totalPorts = this.chargingPorts.length;
    this.availablePorts = this.chargingPorts.filter(port => 
      port.isOperational && port.currentStatus === 'available'
    ).length;
  } else {
    this.totalPorts = 0;
    this.availablePorts = 0;
  }
    // Ensure only one primary image and one thumbnail
  if (this.images && Array.isArray(this.images)) {
    const primaryImages = this.images.filter(img => img.isPrimary);
    const thumbnailImages = this.images.filter(img => img.isThumbnail);
  
    if (primaryImages.length > 1) {
      this.images.forEach((img, index) => {
        img.isPrimary = index === 0;
      });
    } else if (primaryImages.length === 0 && this.images.length > 0) {
      this.images[0].isPrimary = true;
    }
    
    if (thumbnailImages.length > 1) {
      this.images.forEach((img, index) => {
        if (img.isThumbnail) {
          img.isThumbnail = index === 0;
        }
      });
    } else if (thumbnailImages.length === 0 && this.images.length > 0) {
      this.images[0].isThumbnail = true;
    }
  }
  
  next();
});

// Instance method to update port status
chargingStationSchema.methods.updatePortStatus = function(portId, status) {
  if (!this.chargingPorts || !Array.isArray(this.chargingPorts)) {
    throw new Error('No charging ports available');
  }
  const port = this.chargingPorts.id(portId);
  if (port) {
    port.currentStatus = status;
    return this.save();
  }
  throw new Error('Port not found');
};

// Instance method to check if station is open at given time
chargingStationSchema.methods.isOpenAt = function(dateTime = new Date()) {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = dayNames[dateTime.getDay()];
  const daySchedule = this.operatingHours[dayName];
  
  if (!daySchedule || daySchedule.is24Hours) {
    return daySchedule ? daySchedule.is24Hours : false;
  }
  
  if (!daySchedule.open || !daySchedule.close) {
    return false;
  }
  
  const currentTime = dateTime.getHours() * 60 + dateTime.getMinutes();
  const [openHour, openMin] = daySchedule.open.split(':').map(Number);
  const [closeHour, closeMin] = daySchedule.close.split(':').map(Number);
  const openTime = openHour * 60 + openMin;
  const closeTime = closeHour * 60 + closeMin;
  
  return currentTime >= openTime && currentTime <= closeTime;
};

// Instance method to update rating
chargingStationSchema.methods.updateRating = function(newRating) {
  const totalRating = (this.rating.average * this.rating.count) + newRating;
  this.rating.count += 1;
  this.rating.average = totalRating / this.rating.count;
  return this.save();
};

// Static method to find nearby stations
chargingStationSchema.statics.findNearby = function(longitude, latitude, maxDistance = 10000) {
  return this.find({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance // in meters
      }
    },
    isActive: true,
    isVerified: true
  });
};

// Static method to find stations with available ports
chargingStationSchema.statics.findWithAvailablePorts = function(chargingType = null) {
  const query = {
    isActive: true,
    isVerified: true,
    'chargingPorts.isOperational': true,
    'chargingPorts.currentStatus': 'available'
  };
  
  if (chargingType) {
    query['chargingPorts.chargingType'] = chargingType;
  }
  
  return this.find(query);
};

// Instance method to check if premium subscription is active
chargingStationSchema.methods.isPremiumActive = function() {
  return this.premiumSubscription && 
         this.premiumSubscription.isActive && 
         this.premiumSubscription.endDate > new Date();
};

// Instance method to get premium time until expiration
chargingStationSchema.methods.getPremiumTimeUntilExpiration = function() {
  if (!this.premiumSubscription || !this.premiumSubscription.endDate || this.premiumSubscription.endDate <= new Date()) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }
  
  const timeDiff = this.premiumSubscription.endDate.getTime() - new Date().getTime();
  const days = Math.floor(timeDiff / (1000 * 3600 * 24));
  const hours = Math.floor((timeDiff % (1000 * 3600 * 24)) / (1000 * 3600));
  const minutes = Math.floor((timeDiff % (1000 * 3600)) / (1000 * 60));
  const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
  
  return { days, hours, minutes, seconds };
};

// Instance method to activate premium subscription
chargingStationSchema.methods.activatePremium = async function(subscriptionType = 'monthly', transactionId = null) {
  try {
    const startDate = new Date();
    let endDate = new Date();
    let baseAmount = 0;
    const vatRate = 0.13; // 13% VAT
    
    if (subscriptionType === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
      baseAmount = 1000;
    } else if (subscriptionType === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
      baseAmount = 9999;
    }
    
    const vatAmount = Math.round(baseAmount * vatRate);
    const totalAmount = baseAmount + vatAmount;
    
    this.premiumSubscription.isActive = true;
    this.premiumSubscription.type = subscriptionType;
    this.premiumSubscription.startDate = startDate;
    this.premiumSubscription.endDate = endDate;
    this.premiumSubscription.lastPaymentDate = startDate;
    this.premiumSubscription.nextPaymentDate = endDate;
    this.dockitRecommended = true; // Update legacy field
    
    // Add payment history record
    this.premiumSubscription.paymentHistory.push({
      transactionId: transactionId || `txn_${Date.now()}`,
      baseAmount: baseAmount,
      vatAmount: vatAmount,
      totalAmount: totalAmount,
      currency: 'NPR',
      paymentDate: startDate,
      paymentMethod: 'dummy',
      status: 'completed',
      type: 'subscription'
    });
    
    await this.save();
    return this;
  } catch (error) {
    console.error('Error activating premium subscription:', error);
    throw error;
  }
};

// Instance method to deactivate premium subscription
chargingStationSchema.methods.deactivatePremium = async function() {
  try {
    this.premiumSubscription.isActive = false;
    this.dockitRecommended = false; // Update legacy field
    await this.save();
    return this;
  } catch (error) {
    console.error('Error deactivating premium subscription:', error);
    throw error;
  }
};

// Static method to find premium stations (for search prioritization)
chargingStationSchema.statics.findPremiumStations = function(query = {}) {
  return this.find({
    ...query,
    'premiumSubscription.isActive': true,
    'premiumSubscription.endDate': { $gt: new Date() },
    isActive: true,
    isVerified: true
  });
};

module.exports = mongoose.model('ChargingStation', chargingStationSchema);
