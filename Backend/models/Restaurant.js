const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Menu item name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative']
  },
  category: {
    type: String,
    required: true,
    enum: ['appetizer', 'main_course', 'dessert', 'beverage', 'snack', 'breakfast', 'lunch', 'dinner'],
    default: 'main_course'
  },
  images: [{
    url: { type: String, required: true },
    caption: { type: String, trim: true },
    objectName: { type: String }, // MinIO object name
    originalName: { type: String }, // Original file name
    uploadedAt: { type: Date, default: Date.now }
  }],
  isAvailable: {
    type: Boolean,
    default: true
  },
  preparationTime: {
    type: Number, // in minutes
    default: 15,
    min: [1, 'Preparation time must be at least 1 minute']
  },
  allergens: [{
    type: String,
    enum: ['nuts', 'dairy', 'gluten', 'shellfish', 'eggs', 'soy', 'fish']
  }],
  isVegetarian: {
    type: Boolean,
    default: false
  },
  isVegan: {
    type: Boolean,
    default: false
  },
  isSpicy: {
    type: Boolean,
    default: false
  },
  displayOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

const restaurantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Restaurant name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  chargingStation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChargingStation',
    required: true,
    unique: true, // One restaurant per charging station
    index: true
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true,
    index: true
  },
  cuisine: [{
    type: String,
    enum: [
      'indian', 'chinese', 'continental', 'italian', 'mexican', 
      'thai', 'japanese', 'american', 'mediterranean', 'local'
    ]
  }],
  images: [{
    url: { type: String, required: true },
    caption: { type: String, trim: true },
    isPrimary: { type: Boolean, default: false },
    objectName: { type: String }, // MinIO object name
    originalName: { type: String }, // Original file name
    uploadedAt: { type: Date, default: Date.now }
  }],
  contactInfo: {
    phoneNumber: {
      type: String,
      trim: true,
      match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number']
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    }
  },
  operatingHours: {
    monday: { 
      isOpen: { type: Boolean, default: true },
      open: { type: String, default: '09:00' }, 
      close: { type: String, default: '22:00' }
    },
    tuesday: { 
      isOpen: { type: Boolean, default: true },
      open: { type: String, default: '09:00' }, 
      close: { type: String, default: '22:00' }
    },
    wednesday: { 
      isOpen: { type: Boolean, default: true },
      open: { type: String, default: '09:00' }, 
      close: { type: String, default: '22:00' }
    },
    thursday: { 
      isOpen: { type: Boolean, default: true },
      open: { type: String, default: '09:00' }, 
      close: { type: String, default: '22:00' }
    },
    friday: { 
      isOpen: { type: Boolean, default: true },
      open: { type: String, default: '09:00' }, 
      close: { type: String, default: '22:00' }
    },
    saturday: { 
      isOpen: { type: Boolean, default: true },
      open: { type: String, default: '09:00' }, 
      close: { type: String, default: '22:00' }
    },
    sunday: { 
      isOpen: { type: Boolean, default: true },
      open: { type: String, default: '09:00' }, 
      close: { type: String, default: '22:00' }
    }
  },
  menu: [menuItemSchema],
  
  // Restaurant verification and management
  isVerified: {
    type: Boolean,
    default: false,
    index: true
  },
  isActive: {
    type: Boolean,
    default: false,
    index: true
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },
  verificationDate: {
    type: Date
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  rejectionReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Rejection reason cannot exceed 500 characters']
  },
  
  // Restaurant staff
  manager: {
    name: {
      type: String,
      trim: true,
      maxlength: [100, 'Manager name cannot exceed 100 characters']
    },
    phoneNumber: {
      type: String,
      trim: true,
      match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number']
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    }
  },
  
  // Business details
  licenses: {
    fssaiLicense: {
      number: { type: String, trim: true },
      expiryDate: { type: Date },
      documentUrl: { type: String }
    },
    gstNumber: {
      type: String,
      trim: true
    }
  },
  
  // Rating and reviews (future enhancement)
  rating: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0, min: 0 }
  },
  
  // Order management settings
  acceptingOrders: {
    type: Boolean,
    default: false
  },
  averagePreparationTime: {
    type: Number, // in minutes
    default: 30,
    min: [5, 'Average preparation time must be at least 5 minutes']
  },
  minimumOrderAmount: {
    type: Number,
    default: 0,
    min: [0, 'Minimum order amount cannot be negative']
  },
  deliveryRadius: {
    type: Number, // in kilometers (for future delivery feature)
    default: 0,
    min: [0, 'Delivery radius cannot be negative']
  },
  dockitRecommended: {
    type: Boolean,
    default: false
  },
  
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  lastMenuUpdate: {
    type: Date,
    default: Date.now
  },
  totalOrders: {
    type: Number,
    default: 0,
    min: 0
  },
  totalRevenue: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
restaurantSchema.index({ chargingStation: 1, vendor: 1 });
restaurantSchema.index({ isVerified: 1, isActive: 1 });
restaurantSchema.index({ verificationStatus: 1 });
restaurantSchema.index({ 'menu.isAvailable': 1 });
restaurantSchema.index({ createdAt: -1 });

// Virtual for restaurant status
restaurantSchema.virtual('status').get(function() {
  if (!this.isVerified) return 'pending_verification';
  if (!this.isActive) return 'inactive';
  if (!this.acceptingOrders) return 'not_accepting_orders';
  return 'active';
});

// Virtual for total menu items
restaurantSchema.virtual('totalMenuItems').get(function() {
  return this.menu ? this.menu.length : 0;
});

// Virtual for available menu items
restaurantSchema.virtual('availableMenuItems').get(function() {
  return this.menu ? this.menu.filter(item => item.isAvailable).length : 0;
});

// Method to check if restaurant is currently open
restaurantSchema.methods.isCurrentlyOpen = function() {
  const now = new Date();
  const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
  const currentTime = now.toTimeString().slice(0, 5); // Format: HH:MM
  
  const daySchedule = this.operatingHours[currentDay];
  if (!daySchedule || !daySchedule.isOpen) return false;
  
  // Check if it's 24 hours (open and close both 00:00)
  if (daySchedule.open === '00:00' && daySchedule.close === '00:00') {
    return true;
  }
  
  return currentTime >= daySchedule.open && currentTime <= daySchedule.close;
};

// Method to get menu by category
restaurantSchema.methods.getMenuByCategory = function(category = null) {
  let menu = this.menu.filter(item => item.isAvailable);
  
  if (category) {
    menu = menu.filter(item => item.category === category);
  }
  
  return menu.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
};

// Method to update menu item availability
restaurantSchema.methods.updateMenuItemAvailability = function(itemId, isAvailable) {
  const menuItem = this.menu.id(itemId);
  if (menuItem) {
    menuItem.isAvailable = isAvailable;
    this.lastMenuUpdate = new Date();
    return true;
  }
  return false;
};

// Pre-save middleware to update lastMenuUpdate when menu is modified
restaurantSchema.pre('save', function(next) {
  if (this.isModified('menu')) {
    this.lastMenuUpdate = new Date();
  }
  next();
});

// Static method to find restaurants by charging station
restaurantSchema.statics.findByChargingStation = function(stationId, includeInactive = false) {
  const query = { chargingStation: stationId };
  if (!includeInactive) {
    query.isVerified = true;
    query.isActive = true;
  }
  return this.findOne(query).populate('chargingStation vendor');
};

// Static method to find restaurants by vendor
restaurantSchema.statics.findByVendor = function(vendorId, includeInactive = false) {
  const query = { vendor: vendorId };
  if (!includeInactive) {
    query.isVerified = true;
    query.isActive = true;
  }
  return this.find(query).populate('chargingStation vendor');
};

const Restaurant = mongoose.model('Restaurant', restaurantSchema);

module.exports = Restaurant;
