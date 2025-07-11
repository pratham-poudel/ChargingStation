const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'recipientModel'
  },
  recipientModel: {
    type: String,
    required: true,
    enum: ['User', 'Vendor']
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  type: {
    type: String,
    required: true,
    enum: [
      'info',
      'success', 
      'warning',
      'error',
      'booking',
      'payment',
      'station',
      'verification',
      'maintenance',
      'system'
    ]
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  data: {
    type: mongoose.Schema.Types.Mixed, // Additional data related to notification
    default: {}
  },
  actionUrl: {
    type: String, // URL to redirect when notification is clicked
    trim: true
  },
  actionText: {
    type: String, // Text for action button
    trim: true,
    maxlength: [50, 'Action text cannot exceed 50 characters']
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  expiresAt: {
    type: Date,
    index: { expireAfterSeconds: 0 } // TTL index for automatic deletion
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
notificationSchema.index({ recipient: 1, recipientModel: 1 });
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ priority: 1 });
notificationSchema.index({ createdAt: -1 });

// Virtual for time ago
notificationSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diff = now - this.createdAt;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return this.createdAt.toLocaleDateString();
});

// Instance method to mark as read
notificationSchema.methods.markAsRead = function() {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

// Static method to create notification
notificationSchema.statics.createNotification = async function(notificationData) {
  const {
    recipient,
    recipientModel,
    title,
    message,
    type,
    priority = 'medium',
    data = {},
    actionUrl,
    actionText,
    expiresInDays = 30
  } = notificationData;

  // Set expiration date
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const notification = new this({
    recipient,
    recipientModel,
    title,
    message,
    type,
    priority,
    data,
    actionUrl,
    actionText,
    expiresAt
  });

  return await notification.save();
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = function(recipient, recipientModel) {
  return this.countDocuments({
    recipient,
    recipientModel,
    isRead: false
  });
};

// Static method to mark all as read
notificationSchema.statics.markAllAsRead = function(recipient, recipientModel) {
  return this.updateMany(
    { recipient, recipientModel, isRead: false },
    { 
      isRead: true, 
      readAt: new Date() 
    }
  );
};

// Static method to get notifications with pagination
notificationSchema.statics.getNotifications = function(
  recipient, 
  recipientModel, 
  { page = 1, limit = 20, unreadOnly = false, type = null }
) {
  const query = { recipient, recipientModel };
  
  if (unreadOnly) {
    query.isRead = false;
  }
  
  if (type) {
    query.type = type;
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
};

module.exports = mongoose.model('Notification', notificationSchema);
