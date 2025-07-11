const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');

// Database connection
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/charging_station_db', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

// Generate unique admin ID
const generateAdminId = () => {
    const prefix = 'SA'; // SuperAdmin
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substr(2, 3).toUpperCase();
    return `${prefix}${timestamp}${random}`;
};

// Create SuperAdmin
const createSuperAdmin = async () => {
    try {
        console.log('Starting SuperAdmin creation...');
        
        // Check if SuperAdmin already exists
        const existingSuperAdmin = await Admin.findOne({ 
            $or: [
                { email: 'superadmin@chargingstation.com' },
                { phoneNumber: '1234567890' }
            ]
        });

        if (existingSuperAdmin) {
            console.log('SuperAdmin already exists!');
            console.log('Email:', existingSuperAdmin.email);
            console.log('Phone:', existingSuperAdmin.phoneNumber);
            console.log('Role:', existingSuperAdmin.role);
            console.log('Admin ID:', existingSuperAdmin.adminId);
            return;
        }

        // Create SuperAdmin data
        const superAdminData = {
            adminId: generateAdminId(),
            fullName: 'Super Admin',
            email: 'superadmin@chargingstation.com',
            phoneNumber: '1234567890', // 10 digits as required by the schema
            dateOfBirth: new Date('1990-01-01'), // Set a valid date of birth
            role: 'superadmin',
            isActive: true,
            emailVerified: true,
            phoneVerified: true,
            twoFactorEnabled: true,
            deviceSessions: [],
            appPreferences: {
                theme: 'light',
                language: 'en',
                dashboardLayout: 'grid',
                enableEmailNotifications: true,
                enableSMSNotifications: true,
                notificationCategories: {
                    system: true,
                    security: true,
                    users: true,
                    vendors: true,
                    bookings: true,
                    payments: true
                }
            }
        };

        // Create SuperAdmin
        const superAdmin = new Admin(superAdminData);
        await superAdmin.save();

        console.log('✅ SuperAdmin created successfully!');
        console.log('📧 Email: superadmin@chargingstation.com');
        console.log('📱 Phone: 1234567890');
        console.log('� Role: superadmin');
        console.log('🆔 Admin ID:', superAdmin.adminId);
        console.log('🔐 Note: This system uses OTP authentication, no password needed');

    } catch (error) {
        console.error('❌ Error creating SuperAdmin:', error);
        throw error;
    }
};

// Main execution
const main = async () => {
    try {
        await connectDB();
        await createSuperAdmin();
        console.log('🎉 SuperAdmin setup completed!');
    } catch (error) {
        console.error('❌ Setup failed:', error);
    } finally {
        await mongoose.connection.close();
        console.log('📡 Database connection closed');
        process.exit(0);
    }
};

// Run the script
main();