const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chargingstation', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const Booking = require('./models/Booking');

async function testBookingValidation() {
  console.log('🧪 Testing Booking validation with different foodOrder scenarios...\n');

  // Test Case 1: Booking without foodOrder (should work)
  console.log('Test 1: Booking without foodOrder');
  try {
    const bookingWithoutFood = new Booking({
      bookingId: 'TEST001',
      user: new mongoose.Types.ObjectId(),
      chargingStation: new mongoose.Types.ObjectId(),
      vendor: new mongoose.Types.ObjectId(),
      chargingPort: {
        portId: new mongoose.Types.ObjectId(),
        portNumber: '1',
        connectorType: 'CCS2',
        powerOutput: 50,
        chargingType: 'fast'
      },
      vehicle: {
        vehicleNumber: 'TEST123',
        vehicleType: 'car'
      },
      timeSlot: {
        startTime: new Date(),
        endTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour later
        duration: 60
      },
      pricing: {
        pricePerUnit: 3,
        estimatedUnits: 50,
        baseCost: 150,
        platformFee: 5,
        merchantAmount: 150,
        totalAmount: 155
      },
      status: 'confirmed',
      paymentStatus: 'paid',
      customerDetails: {
        name: 'Test User',
        phoneNumber: '1234567890'
      }
      // No foodOrder field
    });

    await bookingWithoutFood.validate();
    console.log('✅ PASS: Booking without foodOrder validates successfully');
  } catch (error) {
    console.log('❌ FAIL: Booking without foodOrder failed validation:', error.message);
  }

  // Test Case 2: Booking with valid foodOrder (should work)
  console.log('\nTest 2: Booking with valid foodOrder');
  try {
    const bookingWithFood = new Booking({
      bookingId: 'TEST002',
      user: new mongoose.Types.ObjectId(),
      chargingStation: new mongoose.Types.ObjectId(),
      vendor: new mongoose.Types.ObjectId(),
      chargingPort: {
        portId: new mongoose.Types.ObjectId(),
        portNumber: '1',
        connectorType: 'CCS2',
        powerOutput: 50,
        chargingType: 'fast'
      },
      vehicle: {
        vehicleNumber: 'TEST123',
        vehicleType: 'car'
      },
      timeSlot: {
        startTime: new Date(),
        endTime: new Date(Date.now() + 60 * 60 * 1000),
        duration: 60
      },
      pricing: {
        pricePerUnit: 3,
        estimatedUnits: 50,
        baseCost: 150,
        platformFee: 5,
        merchantAmount: 150,
        totalAmount: 255
      },
      status: 'confirmed',
      paymentStatus: 'paid',
      customerDetails: {
        name: 'Test User',
        phoneNumber: '1234567890'
      },
      foodOrder: {
        restaurantId: new mongoose.Types.ObjectId(),
        items: [{
          menuItemId: new mongoose.Types.ObjectId(),
          name: 'Test Burger',
          quantity: 1,
          price: 100
        }],
        totalAmount: 100,
        status: 'pending'
      }
    });

    await bookingWithFood.validate();
    console.log('✅ PASS: Booking with valid foodOrder validates successfully');
  } catch (error) {
    console.log('❌ FAIL: Booking with valid foodOrder failed validation:', error.message);
  }

  // Test Case 3: Booking with incomplete foodOrder (should fail gracefully)
  console.log('\nTest 3: Booking with incomplete foodOrder (missing totalAmount)');
  try {
    const bookingWithIncompleteFood = new Booking({
      bookingId: 'TEST003',
      user: new mongoose.Types.ObjectId(),
      chargingStation: new mongoose.Types.ObjectId(),
      vendor: new mongoose.Types.ObjectId(),
      chargingPort: {
        portId: new mongoose.Types.ObjectId(),
        portNumber: '1',
        connectorType: 'CCS2',
        powerOutput: 50,
        chargingType: 'fast'
      },
      vehicle: {
        vehicleNumber: 'TEST123',
        vehicleType: 'car'
      },
      timeSlot: {
        startTime: new Date(),
        endTime: new Date(Date.now() + 60 * 60 * 1000),
        duration: 60
      },
      pricing: {
        pricePerUnit: 3,
        estimatedUnits: 50,
        baseCost: 150,
        platformFee: 5,
        merchantAmount: 150,
        totalAmount: 155
      },
      status: 'confirmed',
      paymentStatus: 'paid',
      customerDetails: {
        name: 'Test User',
        phoneNumber: '1234567890'
      },
      foodOrder: {
        restaurantId: new mongoose.Types.ObjectId(),
        items: [{
          menuItemId: new mongoose.Types.ObjectId(),
          name: 'Test Burger',
          quantity: 1,
          price: 100
        }]
        // Missing totalAmount - should fail
      }
    });

    await bookingWithIncompleteFood.validate();
    console.log('❌ UNEXPECTED: Booking with incomplete foodOrder should have failed but passed');
  } catch (error) {
    console.log('✅ EXPECTED: Booking with incomplete foodOrder failed validation:', error.message);
  }

  console.log('\n🎉 Booking validation tests completed!');
  
  // Close the connection
  await mongoose.connection.close();
}

testBookingValidation().catch(console.error);
