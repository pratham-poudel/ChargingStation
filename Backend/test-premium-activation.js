const mongoose = require('mongoose');
const ChargingStation = require('./models/ChargingStation');

// Test script to verify premium activation fixes
async function testPremiumActivation() {
  try {
    console.log('🧪 Testing premium activation fixes...');
    
    // Connect to MongoDB (adjust connection string as needed)
    await mongoose.connect('mongodb://localhost:27017/chargingstation', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Connected to MongoDB');
    
    // Create a test station
    const testStation = new ChargingStation({
      name: 'Test Station',
      vendor: new mongoose.Types.ObjectId(), // Dummy vendor ID
      address: {
        street: 'Test Street',
        city: 'Test City',
        state: 'Test State',
        country: 'Nepal',
        zipCode: '12345'
      },
      location: {
        type: 'Point',
        coordinates: [85.3240, 27.7172] // Kathmandu coordinates
      },
      isActive: true,
      isVerified: true
    });
    
    await testStation.save();
    console.log('✅ Test station created:', testStation._id);
    
    // Test 1: Check isPremiumActive when no premium subscription exists
    console.log('\n📊 Test 1: Checking isPremiumActive with no premium subscription');
    console.log('isPremiumActive:', testStation.isPremiumActive());
    console.log('Expected: false');
    
    // Test 2: Activate monthly premium
    console.log('\n📊 Test 2: Activating monthly premium');
    await testStation.activatePremium('monthly', 'test_txn_monthly');
    console.log('Monthly premium activated');
    console.log('isPremiumActive:', testStation.isPremiumActive());
    console.log('Expected: true');
    console.log('Premium data:', {
      isActive: testStation.premiumSubscription.isActive,
      type: testStation.premiumSubscription.type,
      startDate: testStation.premiumSubscription.startDate,
      endDate: testStation.premiumSubscription.endDate,
      daysRemaining: testStation.getPremiumTimeUntilExpiration().days
    });
    
    // Verify VAT calculation for monthly
    const monthlyPayment = testStation.premiumSubscription.paymentHistory[0];
    console.log('Monthly payment details:', {
      baseAmount: monthlyPayment.baseAmount,
      vatAmount: monthlyPayment.vatAmount,
      totalAmount: monthlyPayment.totalAmount
    });
    console.log(`Expected: Base ₹1000, VAT ₹130, Total ₹1130`);
    
    if (monthlyPayment.baseAmount === 1000 && monthlyPayment.vatAmount === 130 && monthlyPayment.totalAmount === 1130) {
      console.log('✅ Monthly VAT calculation is correct!');
    } else {
      console.log('❌ Monthly VAT calculation is incorrect!');
    }
    
    // Test 3: Activate yearly premium (should fail due to existing active subscription)
    console.log('\n📊 Test 3: Attempting to activate yearly premium (should fail)');
    try {
      await testStation.activatePremium('yearly', 'test_txn_yearly');
      console.log('❌ This should have failed!');
    } catch (error) {
      console.log('✅ Correctly failed to activate yearly premium:', error.message);
    }
    
    // Test 4: Deactivate premium
    console.log('\n📊 Test 4: Deactivating premium');
    await testStation.deactivatePremium();
    console.log('Premium deactivated');
    console.log('isPremiumActive:', testStation.isPremiumActive());
    console.log('Expected: false');
    
    // Test 5: Activate yearly premium (should work now)
    console.log('\n📊 Test 5: Activating yearly premium');
    await testStation.activatePremium('yearly', 'test_txn_yearly');
    console.log('Yearly premium activated');
    console.log('isPremiumActive:', testStation.isPremiumActive());
    console.log('Expected: true');
    console.log('Premium data:', {
      isActive: testStation.premiumSubscription.isActive,
      type: testStation.premiumSubscription.type,
      startDate: testStation.premiumSubscription.startDate,
      endDate: testStation.premiumSubscription.endDate,
      daysRemaining: testStation.getPremiumTimeUntilExpiration().days
    });
    
    // Verify yearly subscription gives ~365 days
    const daysRemaining = testStation.getPremiumTimeUntilExpiration().days;
    console.log(`Days remaining: ${daysRemaining}`);
    console.log(`Expected: ~365 days (actual: ${daysRemaining})`);
    
    if (daysRemaining >= 360 && daysRemaining <= 370) {
      console.log('✅ Yearly subscription duration is correct!');
    } else {
      console.log('❌ Yearly subscription duration is incorrect!');
    }
    
    // Verify VAT calculation for yearly
    const yearlyPayment = testStation.premiumSubscription.paymentHistory[1];
    console.log('Yearly payment details:', {
      baseAmount: yearlyPayment.baseAmount,
      vatAmount: yearlyPayment.vatAmount,
      totalAmount: yearlyPayment.totalAmount
    });
    console.log(`Expected: Base ₹9999, VAT ₹1299, Total ₹11298`);
    
    if (yearlyPayment.baseAmount === 9999 && yearlyPayment.vatAmount === 1299 && yearlyPayment.totalAmount === 11298) {
      console.log('✅ Yearly VAT calculation is correct!');
    } else {
      console.log('❌ Yearly VAT calculation is incorrect!');
    }
    
    // Test 6: Extend premium subscription (simulate extension)
    console.log('\n📊 Test 6: Extending premium subscription');
    const originalEndDate = new Date(testStation.premiumSubscription.endDate);
    
    // Simulate extending by 6 months
    const extensionDate = new Date(originalEndDate);
    extensionDate.setMonth(extensionDate.getMonth() + 6);
    testStation.premiumSubscription.endDate = extensionDate;
    testStation.premiumSubscription.type = 'yearly'; // Keep as yearly
    await testStation.save();
    
    console.log('Premium extended by 6 months');
    console.log('isPremiumActive:', testStation.isPremiumActive());
    console.log('Expected: true');
    console.log('Premium data after extension:', {
      isActive: testStation.premiumSubscription.isActive,
      type: testStation.premiumSubscription.type,
      startDate: testStation.premiumSubscription.startDate,
      endDate: testStation.premiumSubscription.endDate,
      daysRemaining: testStation.getPremiumTimeUntilExpiration().days
    });
    
    // Verify extension worked
    const daysAfterExtension = testStation.getPremiumTimeUntilExpiration().days;
    console.log(`Days remaining after extension: ${daysAfterExtension}`);
    console.log(`Expected: ~180 days (6 months) (actual: ${daysAfterExtension})`);
    
    if (daysAfterExtension >= 170 && daysAfterExtension <= 190) {
      console.log('✅ Premium extension worked correctly!');
    } else {
      console.log('❌ Premium extension duration is incorrect!');
    }
    
    // Clean up
    await ChargingStation.findByIdAndDelete(testStation._id);
    console.log('\n🧹 Test station cleaned up');
    
    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
testPremiumActivation(); 