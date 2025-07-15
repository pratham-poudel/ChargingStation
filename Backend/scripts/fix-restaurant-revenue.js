const mongoose = require('mongoose');
const Order = require('../models/Order');
require('dotenv').config();

/**
 * Script to fix restaurant order revenue calculation
 * This corrects any orders where totalAmount was incorrectly calculated with 85% vendor share
 * Restaurant orders should give 100% revenue to vendors (no platform fees due to annual service charge)
 */

async function fixRestaurantRevenue() {
  try {
    console.log('🔧 Starting restaurant revenue fix...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chargingstation');
    console.log('✅ Connected to MongoDB');

    // Find all completed restaurant orders
    const orders = await Order.find({
      status: 'completed'
    }).populate('restaurant');

    console.log(`📊 Found ${orders.length} completed orders to check`);

    let fixedCount = 0;
    let checkedCount = 0;

    for (const order of orders) {
      checkedCount++;
      
      // Check if this order has incorrect totalAmount
      // If subtotal is significantly higher than totalAmount, it might have been calculated with 85%
      const expectedTotal = order.subtotal + order.tax.amount + order.serviceCharge.amount - 
                          order.discounts.reduce((sum, d) => sum + d.amount, 0);
      
      const currentRatio = order.totalAmount / order.subtotal;
      
      // If ratio is around 0.85 (indicating 85% calculation), fix it
      if (currentRatio > 0.8 && currentRatio < 0.9 && Math.abs(expectedTotal - order.subtotal) < 1) {
        console.log(`🔧 Fixing order ${order.orderNumber}:`, {
          currentTotal: order.totalAmount,
          subtotal: order.subtotal,
          expectedTotal: expectedTotal,
          ratio: currentRatio.toFixed(3)
        });

        // Update the order with correct totalAmount
        await Order.findByIdAndUpdate(order._id, {
          totalAmount: expectedTotal
        });

        fixedCount++;
      }
      
      if (checkedCount % 100 === 0) {
        console.log(`📋 Checked ${checkedCount}/${orders.length} orders...`);
      }
    }

    console.log(`✅ Revenue fix completed!`);
    console.log(`📊 Orders checked: ${checkedCount}`);
    console.log(`🔧 Orders fixed: ${fixedCount}`);

  } catch (error) {
    console.error('❌ Error fixing restaurant revenue:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the fix
if (require.main === module) {
  fixRestaurantRevenue();
}

module.exports = { fixRestaurantRevenue };
