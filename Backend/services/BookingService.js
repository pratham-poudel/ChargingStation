const mongoose = require('mongoose')
const Booking = require('../models/Booking')
const ChargingStation = require('../models/ChargingStation')
const User = require('../models/User')
const Order = require('../models/Order')
const Restaurant = require('../models/Restaurant')
const smsService = require('./smsService')
const emailService = require('./emailService')
const bookingScheduler = require('./RedisBookingScheduler')

// Helper function to get Nepal time consistently
const getNepalTime = () => {
  const now = new Date()
  // Convert to Nepal timezone (UTC+5:45)
  return new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kathmandu"}))
}

class BookingService {// Generate time slots for a given date respecting station operating hours
  static generateTimeSlots(date, existingBookings = [], portId = null, operatingHours = null) {
    const slots = []
    const selectedDate = new Date(date)
    const today = new Date()
    
    // Get the day of week for operating hours (0 = Sunday, 1 = Monday, etc.)
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const dayOfWeek = dayNames[selectedDate.getDay()]
    
    // Get operating hours for this day
    let dayOperatingHours = null
    if (operatingHours && operatingHours[dayOfWeek]) {
      dayOperatingHours = operatingHours[dayOfWeek]
    }
    
    // If no operating hours provided or station is closed, use default 24/7
    let startHour, endHour
    if (!dayOperatingHours || dayOperatingHours.is24Hours) {
      startHour = 0
      endHour = 24
    } else {
      // Parse operating hours (format: "09:00")
      const openTime = dayOperatingHours.open || "00:00"
      const closeTime = dayOperatingHours.close || "23:59"
      
      startHour = parseInt(openTime.split(':')[0])
      endHour = parseInt(closeTime.split(':')[0])
      
      // Handle cases where close time is past midnight
      if (endHour < startHour) {
        endHour = 24 // Extend to midnight for same-day slots
      }
    }
    
    // If it's today, start from current time + 30 minutes, but respect operating hours
    if (selectedDate.toDateString() === today.toDateString()) {
      const currentHour = today.getHours()
      const currentMinute = today.getMinutes()
      const nextSlotHour = currentHour + (currentMinute >= 30 ? 1 : 0)
      startHour = Math.max(startHour, nextSlotHour)
    }

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 5) {
        const slotTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        const slotDateTime = new Date(selectedDate)
        slotDateTime.setHours(hour, minute, 0, 0)

        // Check if this slot conflicts with existing bookings
        const isBooked = existingBookings.some(booking => {
          if (portId && booking.portId?.toString() !== portId.toString()) {
            return false // Different port, no conflict
          }
          
          const bookingStart = new Date(booking.startTime)
          const bookingEnd = new Date(booking.endTime)
          
          return slotDateTime >= bookingStart && slotDateTime < bookingEnd
        })        // Calculate pricing based on energy consumption + platform fee
        const durationOptions = [30, 60, 90, 120, 180, 240, 300, 360, 480]
        const pricing = durationOptions.map(duration => {
          const durationHours = duration / 60
          const energyConsumption = 22 * durationHours // Assuming 22kW default power
          const energyCost = energyConsumption * 3 // ₹3/kWh default rate
          const platformFee = 5
          return {
            duration,
            totalPrice: Math.round(energyCost + platformFee)
          }
        })

        slots.push({
          id: `${hour}-${minute}`,
          startTime: slotTime,
          display: slotTime,
          isAvailable: !isBooked,
          slotDateTime: slotDateTime,
          availableDurations: durationOptions,
          pricing,
          energyRate: 3 // ₹3/kWh
        })
      }
    }

    return slots
  }

  // Get slot availability for a station and date
  static async getSlotAvailability(stationId, date, portId = null) {
    try {
      // Find the charging station
      const station = await ChargingStation.findById(stationId)
      if (!station) {
        throw new Error('Charging station not found')
      }      // Get existing bookings for the date using correct schema fields
      const startDate = new Date(date)
      startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(date)
      endDate.setHours(23, 59, 59, 999)

      const query = {
        chargingStation: stationId,
        'timeSlot.startTime': {
          $gte: startDate,
          $lt: endDate
        },
        status: { $in: ['confirmed', 'active'] }
      }

      // If specific port is requested, filter by port
      if (portId) {
        query['chargingPort.portId'] = portId
      }

      const existingBookings = await Booking.find(query)      // Transform bookings to match generateTimeSlots expectations
      const transformedBookings = existingBookings.map(booking => ({
        portId: booking.chargingPort.portId,
        startTime: booking.timeSlot.startTime,
        endTime: booking.timeSlot.endTime
      }))

      // Generate available slots with station operating hours
      const slots = this.generateTimeSlots(date, transformedBookings, portId, station.operatingHours)

      return {
        success: true,
        data: {
          slots,
          totalSlots: slots.length,
          availableSlots: slots.filter(slot => slot.isAvailable).length,
          date: date,
          stationId: stationId,
          portId: portId
        }
      }
    } catch (error) {
      console.error('Error getting slot availability:', error)
      throw error
    }
  }

  // Create a secure booking with conflict prevention
  static async createSecureBooking(bookingData) {
    try {
      // Validate required fields
      const requiredFields = ['stationId', 'portId', 'date', 'startTime', 'duration', 'customerDetails']
      for (const field of requiredFields) {
        if (!bookingData[field]) {
          throw new Error(`Missing required field: ${field}`)
        }
      }
      
      // Validate duration bounds
      if (bookingData.duration < 30 || bookingData.duration > 480) {
        throw new Error('Booking duration must be between 30 minutes and 8 hours')
      }
      
      // Validate start time format
      if (!/^\d{2}:\d{2}$/.test(bookingData.startTime)) {
        throw new Error('Invalid start time format. Use HH:MM format')
      }
      
      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(bookingData.date)) {
        throw new Error('Invalid date format. Use YYYY-MM-DD format')
      }
      
      // Find or create user
      let user = null
      const { customerDetails } = bookingData
      
      if (customerDetails.email || customerDetails.phoneNumber) {
        // Try to find existing user by email or phone
        const queryConditions = []
        if (customerDetails.email) queryConditions.push({ email: customerDetails.email })
        if (customerDetails.phoneNumber) queryConditions.push({ phoneNumber: customerDetails.phoneNumber })
        
        user = await User.findOne({ $or: queryConditions })
        
        if (!user) {
          // Create new user
          user = new User({
            name: customerDetails.driverName || 'Guest User',
            email: customerDetails.email,
            phoneNumber: customerDetails.phoneNumber
          })
          await user.save()
          console.log(`Created new user: ${user._id} for booking`)
        } else {
          console.log(`Found existing user: ${user._id} for booking`)
        }
      } else {
        // Create anonymous user for this booking
        user = new User({
          name: customerDetails.driverName || 'Anonymous User',
          phoneNumber: customerDetails.phoneNumber || '0000000000'
        })
        await user.save()
        console.log(`Created anonymous user: ${user._id} for booking`)
      }

      // Find the charging station
      const station = await ChargingStation.findById(bookingData.stationId)
      if (!station) {
        throw new Error('Charging station not found')
      }

      // Find the specific port
      const port = station.chargingPorts.find(p => p._id.toString() === bookingData.portId.toString())
      if (!port) {
        throw new Error('Charging port not found')
      }
      
      // Check if port is operational
      if (port.isOperational === false) {
        throw new Error('This charging port is currently out of service')
      }
      
      // Check station operating hours
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      const dayOfWeek = dayNames[new Date(bookingData.date).getDay()]
      const operatingHours = station.operatingHours?.[dayOfWeek]
      
      if (operatingHours && !operatingHours.is24Hours) {
        if (!operatingHours.open || !operatingHours.close) {
          throw new Error(`Station is closed on ${dayOfWeek}s`)
        }
        
        const [openHour, openMin] = operatingHours.open.split(':').map(Number)
        const [closeHour, closeMin] = operatingHours.close.split(':').map(Number)
        const [startHour, startMin] = bookingData.startTime.split(':').map(Number)
        
        const openMinutes = openHour * 60 + openMin
        const closeMinutes = closeHour * 60 + closeMin
        const startMinutes = startHour * 60 + startMin
        
        // Handle next-day closing
        let adjustedCloseMinutes = closeMinutes
        if (closeMinutes <= openMinutes) {
          adjustedCloseMinutes += 24 * 60
        }
        
        // Check if start time is within operating hours
        if (startMinutes < openMinutes || startMinutes >= adjustedCloseMinutes) {
          throw new Error(`Booking start time must be within operating hours: ${operatingHours.open} - ${operatingHours.close}`)
        }
        
        // Check if booking duration extends beyond operating hours
        const endMinutes = startMinutes + bookingData.duration
        if (endMinutes > adjustedCloseMinutes) {
          throw new Error(`Booking duration extends beyond operating hours. Maximum duration from ${bookingData.startTime} is ${Math.floor((adjustedCloseMinutes - startMinutes) / 60)}h ${(adjustedCloseMinutes - startMinutes) % 60}m`)
        }
      }

      // Calculate start and end times - Convert Nepal time to UTC for database storage
      const [hours, minutes] = bookingData.startTime.split(':').map(Number)
      
      // Create a proper Nepal timezone date
      // Parse the date and time components
      const [year, month, day] = bookingData.date.split('-').map(Number)
      
      // Create the date in UTC first, then adjust for Nepal timezone
      const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0))
      
      // Nepal is UTC+5:45, so we need to subtract 5 hours 45 minutes to get UTC
      const startTime = new Date(utcDate.getTime() - (5 * 60 + 45) * 60 * 1000)
      
      const endTime = new Date(startTime)
      endTime.setMinutes(endTime.getMinutes() + bookingData.duration)
      
      console.log(`🕒 Booking Time Conversion Debug:`)
      console.log(`📅 Input: ${bookingData.date} ${bookingData.startTime} (Nepal Time)`)
      console.log(`⏰ UTC Storage: ${startTime.toISOString()} - ${endTime.toISOString()}`)
      console.log(`✅ Display Check: ${startTime.toLocaleString('en-US', { timeZone: 'Asia/Kathmandu' })} - ${endTime.toLocaleString('en-US', { timeZone: 'Asia/Kathmandu' })}`)      // Check for conflicts using correct schema fields with 5-minute buffer
      const bufferMinutes = 5
      const bufferedStartTime = new Date(startTime.getTime() - bufferMinutes * 60 * 1000)
      const bufferedEndTime = new Date(endTime.getTime() + bufferMinutes * 60 * 1000)
      
      const conflictingBooking = await Booking.findOne({
        chargingStation: bookingData.stationId,
        'chargingPort.portId': bookingData.portId,
        status: { $in: ['confirmed', 'active'] },
        $or: [
          {
            'timeSlot.startTime': { $lt: bufferedEndTime },
            'timeSlot.endTime': { $gt: bufferedStartTime }
          }
        ]
      })

      if (conflictingBooking) {
        const conflictStart = new Date(conflictingBooking.timeSlot.startTime).toLocaleTimeString('en-US', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit',
          timeZone: 'Asia/Kathmandu'
        })
        const conflictEnd = new Date(conflictingBooking.timeSlot.endTime).toLocaleTimeString('en-US', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit',
          timeZone: 'Asia/Kathmandu'
        })
        throw new Error(`Time slot conflicts with existing booking (${conflictStart} - ${conflictEnd}). Please select a different time.`)
      }
      
      // Additional check: Verify the slot is still available in real-time
      const nepalTime = getNepalTime()
      const isToday = bookingData.date === nepalTime.toISOString().split('T')[0]
      
      if (isToday) {
        const currentMinutes = nepalTime.getHours() * 60 + nepalTime.getMinutes()
        const startMinutes = parseInt(bookingData.startTime.split(':')[0]) * 60 + parseInt(bookingData.startTime.split(':')[1])
        
        if (startMinutes <= currentMinutes + bufferMinutes) {
          throw new Error('This time slot has already passed. Please select a future time.')
        }
      }      // Calculate pricing - Include food order if provided
      const durationHours = bookingData.duration / 60
      const estimatedEnergyConsumption = port.powerOutput * durationHours
      const pricePerUnit = port.pricePerUnit || 3 // Default ₹3/kWh if not specified
      const energyCost = estimatedEnergyConsumption * pricePerUnit
      const platformFee = 5
      
      // Add food order amount if provided
      let foodOrderAmount = 0
      if (bookingData.foodOrder && bookingData.foodOrder.items && bookingData.foodOrder.items.length > 0) {
        foodOrderAmount = bookingData.foodOrder.totalAmount || 0
      }
      
      const totalAmount = energyCost + platformFee + foodOrderAmount
      const merchantAmount = energyCost // Merchant gets energy cost, platform gets platformFee
      const restaurantAmount = foodOrderAmount // Restaurant gets food order amount

      // Generate booking ID
      const bookingId = `CHG${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`      // Create the booking with proper schema structure
      const newBooking = new Booking({
        bookingId,
        user: user._id, // Use the found or created user ID
        chargingStation: bookingData.stationId,
        vendor: station.vendor || new mongoose.Types.ObjectId(),
        chargingPort: {
          portId: bookingData.portId,
          portNumber: port.portNumber || '1',
          connectorType: port.connectorType || 'CCS2',
          powerOutput: port.powerOutput || 50,
          chargingType: port.chargingType || 'fast'
        },
        vehicle: {
          vehicleNumber: bookingData.vehicleDetails?.vehicleNumber || bookingData.customerDetails?.vehicleNumber || 'DEMO123',
          vehicleType: bookingData.vehicleDetails?.vehicleType || 'car'
        },
        timeSlot: {
          startTime,
          endTime,
          duration: bookingData.duration
        },        pricing: {
          pricePerUnit: pricePerUnit,
          estimatedUnits: estimatedEnergyConsumption,
          baseCost: energyCost,
          taxes: 0, // No taxes in simple model
          serviceCharges: 0, // No additional service charges
          platformFee: platformFee,
          foodOrderAmount: foodOrderAmount,
          merchantAmount: Math.round(merchantAmount),
          restaurantAmount: Math.round(restaurantAmount),
          totalAmount: Math.round(totalAmount)
        },status: 'confirmed',
        paymentStatus: 'paid',
        customerDetails: {
          name: bookingData.customerDetails?.driverName || user.name,
          phoneNumber: bookingData.customerDetails?.phoneNumber || user.phoneNumber,
          email: bookingData.customerDetails?.email || user.email,
          driverName: bookingData.customerDetails?.driverName
        },
        paymentDetails: {
          paymentMethod: 'card',
          transactionId: `TXN${Date.now()}`,
          paidAt: new Date()
        },
        // Add food order only if provided and has items
        ...(bookingData.foodOrder && bookingData.foodOrder.items && bookingData.foodOrder.items.length > 0 ? {
          foodOrder: {
            restaurantId: bookingData.foodOrder.restaurantId,
            items: bookingData.foodOrder.items,
            totalAmount: bookingData.foodOrder.totalAmount,
            status: 'pending',
            orderedAt: new Date()
          }
        } : {}),
        isFlexible: bookingData.isFlexible || false
      })

      // Use transaction to ensure atomic booking creation
      const session = await mongoose.startSession()
      session.startTransaction()
      
      try {
        // Double-check for conflicts within transaction
        const finalConflictCheck = await Booking.findOne({
          chargingStation: bookingData.stationId,
          'chargingPort.portId': bookingData.portId,
          status: { $in: ['confirmed', 'active'] },
          $or: [
            {
              'timeSlot.startTime': { $lt: bufferedEndTime },
              'timeSlot.endTime': { $gt: bufferedStartTime }
            }
          ]
        }).session(session)

        if (finalConflictCheck) {
          const conflictStart = new Date(finalConflictCheck.timeSlot.startTime).toTimeString().substring(0, 5)
          const conflictEnd = new Date(finalConflictCheck.timeSlot.endTime).toTimeString().substring(0, 5)
          throw new Error(`Time slot was just booked by another user (${conflictStart} - ${conflictEnd}). Please select a different time.`)
        }
        
        // Save booking within transaction
        await newBooking.save({ session })
        
        // Create Order document if there's a food order
        let order = null
        if (bookingData.foodOrder && bookingData.foodOrder.items && bookingData.foodOrder.items.length > 0) {
          console.log('Creating Order document for food order...')
          
          // Get the restaurant details
          const restaurant = await Restaurant.findById(bookingData.foodOrder.restaurantId).session(session)
          if (!restaurant) {
            throw new Error('Restaurant not found for food order')
          }
          
          // Create order items with menu item snapshots
          const orderItems = []
          for (const item of bookingData.foodOrder.items) {
            // Find the menu item in the restaurant's menu
            const menuItem = restaurant.menu.find(m => m._id.toString() === item.menuItemId.toString())
            if (!menuItem) {
              console.warn(`Menu item ${item.menuItemId} not found in restaurant ${restaurant._id}`)
              continue
            }
            
            const orderItem = {
              menuItem: item.menuItemId,
              menuItemSnapshot: {
                name: menuItem.name,
                description: menuItem.description,
                price: menuItem.price,
                category: menuItem.category,
                image: menuItem.image
              },
              quantity: item.quantity,
              unitPrice: menuItem.price,
              totalPrice: menuItem.price * item.quantity,
              status: 'pending'
            }
            orderItems.push(orderItem)
          }
          
          // Create the Order document with proper date and no automatic tax
          const scheduledDate = new Date(`${bookingData.date}T${bookingData.startTime}:00.000Z`)
          
          order = new Order({
            restaurant: bookingData.foodOrder.restaurantId,
            chargingStation: bookingData.stationId,
            vendor: station.vendor,
            customer: {
              name: bookingData.customerDetails?.driverName || user.name,
              phoneNumber: bookingData.customerDetails?.phoneNumber || user.phoneNumber,
              email: bookingData.customerDetails?.email || user.email,
              userId: user._id
            },
            items: orderItems,
            subtotal: bookingData.foodOrder.totalAmount,
            // Set tax to 0% since payment is already processed
            tax: {
              percentage: 0,
              amount: 0
            },
            serviceCharge: {
              percentage: 0,
              amount: 0
            },
            totalAmount: bookingData.foodOrder.totalAmount,
            status: 'pending',
            orderType: 'dine_in',
            // Add scheduled service date and time
            scheduledServiceDate: scheduledDate,
            scheduledServiceTime: bookingData.startTime,
            payment: {
              method: 'card',
              status: 'paid',
              transactionId: `TXN${Date.now()}`,
              paidAt: new Date()
            },
            notes: {
              customer: `Order placed with charging booking ${newBooking.bookingId}. Service scheduled for ${bookingData.date} at ${bookingData.startTime}`,
              restaurant: `Associated with charging session from ${bookingData.date} ${bookingData.startTime}. Food to be served during charging.`
            }
          })
          
          await order.save({ session })
          console.log(`✅ Order ${order.orderNumber} created for booking ${newBooking.bookingId}`)
          
          // Update booking with order reference
          newBooking.foodOrder.orderId = order._id
          await newBooking.save({ session })
          console.log(`✅ Updated booking ${newBooking.bookingId} with order reference ${order._id}`)
        }
        
        // Update port status to occupied
        const portIndex = station.chargingPorts.findIndex(p => p._id.toString() === bookingData.portId.toString())
        if (portIndex !== -1) {
          station.chargingPorts[portIndex].currentStatus = 'occupied'
          await station.save({ session })
        }
        
        await session.commitTransaction()
        console.log(`✅ Booking ${newBooking.bookingId} created successfully with transaction`)
        
      } catch (error) {
        await session.abortTransaction()
        throw error
      } finally {
        session.endSession()
      }

      // Schedule slot monitoring notifications
      try {
        await bookingScheduler.scheduleBookingNotifications(newBooking);
        console.log(`📅 Scheduled notifications for booking ${newBooking.bookingId}`);
      } catch (schedulerError) {
        console.error('Scheduler error:', schedulerError);
        // Don't fail the booking if scheduler fails
      }

      // Send notifications (non-blocking)
      setImmediate(async () => {
        try {
          if (bookingData.customerDetails.phoneNumber) {
            const dateTime = `${bookingData.date} ${bookingData.startTime}`
            console.log('SMS Notification Data:', {
              phoneNumber: bookingData.customerDetails.phoneNumber,
              bookingId,
              stationName: station.name,
              dateTime,
              foodOrder: bookingData.foodOrder
            })
            await smsService.sendBookingConfirmation(
              bookingData.customerDetails.phoneNumber, 
              bookingId,
              station.name,
              dateTime,
              bookingData.foodOrder // Pass food order to SMS
            )
          }

          if (bookingData.customerDetails.email) {
            const dateTime = `${bookingData.date} ${bookingData.startTime}`
            const locationString = `${station.address.street}, ${station.address.city}, ${station.address.state}`
            
            const emailData = {
              bookingId,
              stationName: station.name,
              location: locationString,
              dateTime: dateTime,
              duration: `${bookingData.duration} minutes`,
              connectorType: port.connectorType,
              totalAmount: totalAmount,
              chargingAmount: energyCost + platformFee,
              foodOrder: bookingData.foodOrder // Pass food order to email
            }
            
            console.log('Email Notification Data:', {
              userEmail: bookingData.customerDetails.email,
              userName: bookingData.customerDetails.driverName,
              booking: emailData
            })
              await emailService.sendBookingConfirmationEmail(
              bookingData.customerDetails.email, 
              bookingData.customerDetails.driverName,
              emailData
            )
          }
        } catch (notificationError) {
          console.error('Notification error:', notificationError)
        }
      })

      return {
        success: true,
        data: {
          ...newBooking.toObject(),
          stationName: station.name,
          stationAddress: station.address,
          portDetails: {
            portNumber: port.portNumber,
            connectorType: port.connectorType,
            powerOutput: port.powerOutput
          }
        },
        message: 'Booking created successfully'
      }

    } catch (error) {
      console.error('Create secure booking error:', error)
      throw error
    }  }

  // Extend an existing booking
  static async extendBooking(bookingId, additionalDuration) {
    try {
      const booking = await Booking.findOne({ 
        $or: [
          { bookingId: bookingId },
          { _id: mongoose.Types.ObjectId.isValid(bookingId) ? bookingId : null }
        ]
      })

      if (!booking) {
        throw new Error('Booking not found')
      }

      if (booking.status !== 'confirmed' && booking.status !== 'active') {
        throw new Error('Cannot extend completed or cancelled booking')
      }

      // Calculate new end time
      const newEndTime = new Date(booking.timeSlot.endTime)
      newEndTime.setMinutes(newEndTime.getMinutes() + additionalDuration)

      // Check for conflicts with new end time using the schema field names
      const conflictingBooking = await Booking.findOne({
        _id: { $ne: booking._id },
        chargingStation: booking.chargingStation,
        'chargingPort.portId': booking.chargingPort.portId,
        status: { $in: ['confirmed', 'active'] },
        'timeSlot.startTime': { $lt: newEndTime },
        'timeSlot.endTime': { $gt: booking.timeSlot.endTime }
      })

      if (conflictingBooking) {
        throw new Error('Cannot extend: time slot conflict with another booking')
      }

      // Calculate additional cost
      const isPeakHour = booking.timeSlot.startTime.getHours() >= 8 && booking.timeSlot.startTime.getHours() < 20
      const basePrice = isPeakHour ? 200 : 150
      const additionalCost = basePrice * (additionalDuration / 60)

      // Update booking using schema field names
      booking.timeSlot.endTime = newEndTime
      booking.timeSlot.duration += additionalDuration
      booking.pricing.totalAmount += additionalCost
      booking.pricing.baseCost += additionalCost * 0.8
      booking.pricing.taxes += additionalCost * 0.18
      booking.pricing.serviceCharges += additionalCost * 0.02

      await booking.save()

      return {
        success: true,
        data: booking,
        message: `Booking extended by ${additionalDuration} minutes. Additional cost: ₹${additionalCost}`
      }

    } catch (error) {
      console.error('Extend booking error:', error)
      throw error
    }
  }
  // Complete booking early
  static async completeBookingEarly(bookingId) {
    try {
      const booking = await Booking.findOne({ 
        $or: [
          { bookingId: bookingId },
          { _id: mongoose.Types.ObjectId.isValid(bookingId) ? bookingId : null }
        ]
      })

      if (!booking) {
        throw new Error('Booking not found')
      }

      if (booking.status !== 'confirmed' && booking.status !== 'active') {
        throw new Error('Cannot complete booking that is not active')
      }

      const now = new Date()
      const actualEndTime = now < booking.timeSlot.endTime ? now : booking.timeSlot.endTime
      const actualDuration = Math.floor((actualEndTime - booking.timeSlot.startTime) / (1000 * 60))
      const originalDuration = booking.timeSlot.duration

      // Calculate refund (minimum 30 minutes charged)
      const chargedDuration = Math.max(30, actualDuration)
      const refundDuration = originalDuration - chargedDuration

      const isPeakHour = booking.timeSlot.startTime.getHours() >= 8 && booking.timeSlot.startTime.getHours() < 20
      const basePrice = isPeakHour ? 200 : 150
      const refundAmount = refundDuration > 0 ? basePrice * (refundDuration / 60) : 0

      // Update booking using schema fields
      booking.status = 'completed'
      booking.actualUsage.actualEndTime = actualEndTime
      booking.actualUsage.finalAmount = booking.pricing.totalAmount - refundAmount
      booking.paymentDetails.refundAmount = refundAmount
      booking.paymentDetails.refundedAt = refundAmount > 0 ? new Date() : undefined

      await booking.save()

      return {
        success: true,
        data: booking,
        message: `Booking completed early. Refund: ₹${refundAmount.toFixed(2)}`
      }

    } catch (error) {
      console.error('Complete booking early error:', error)
      throw error
    }
  }
}

module.exports = BookingService
