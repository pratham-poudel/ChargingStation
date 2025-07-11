const mongoose = require('mongoose');
const Booking = require('./models/Booking');

mongoose.connect('mongodb://localhost:27017/charging_station_db')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    const vendorId = '68503ad6e5efee12862bf78f';
    const date = '2025-06-21';
    
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);
    
    console.log('Date range:', startDate, 'to', endDate);
    
    // Test the NEW query from settlement request (with OR condition)
    const completedBookings = await Booking.find({
      vendor: new mongoose.Types.ObjectId(vendorId),
      status: 'completed',
      $or: [
        { settlementStatus: 'pending' },
        { settlementStatus: { $exists: false } },
        { settlementStatus: null }
      ],
      updatedAt: { $gte: startDate, $lte: endDate }
    }).lean();
    
    console.log('Found bookings with NEW query:', completedBookings.length);
    
    if (completedBookings.length > 0) {
      console.log('Booking details:');
      completedBookings.forEach((booking, i) => {
        const calculateMerchantRevenue = (booking) => {
          let baseAmount = 0;
          
          if (booking.pricing?.merchantAmount !== undefined) {
            baseAmount = booking.pricing.merchantAmount;
          } else {
            const totalAmount = booking.pricing?.totalAmount || 0;
            baseAmount = Math.max(0, totalAmount - 5);
          }
          
          return baseAmount;
        };
        
        console.log(`Booking ${i+1}:`, {
          id: booking._id,
          status: booking.status,
          settlementStatus: booking.settlementStatus || 'undefined',
          updatedAt: booking.updatedAt,
          merchantAmount: booking.pricing?.merchantAmount,
          totalAmount: booking.pricing?.totalAmount,
          calculatedRevenue: calculateMerchantRevenue(booking)
        });
      });
      
      // Calculate total amount
      const totalAmount = completedBookings.reduce((total, booking) => {
        const calculateMerchantRevenue = (booking) => {
          let baseAmount = 0;
          
          if (booking.pricing?.merchantAmount !== undefined) {
            baseAmount = booking.pricing.merchantAmount;
          } else {
            const totalAmount = booking.pricing?.totalAmount || 0;
            baseAmount = Math.max(0, totalAmount - 5);
          }
          
          return baseAmount;
        };
        
        return total + calculateMerchantRevenue(booking);
      }, 0);
      
      console.log('Total amount for settlement:', totalAmount);
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
