const Booking = require('../models/Booking');
const Room = require('../models/Room');
const Package = require('../models/Package');
const Service = require('../models/Service');
const { createPaymentIntent } = require('../services/paymentService');
const crypto = require('crypto');

// Generate UUID using crypto (Node.js built-in)
const generateUUID = () => {
    return crypto.randomUUID();
};

// Create new booking
const createBooking = async (req, res) => {
    try {
        const {
            roomId,
            checkInDate,
            checkOutDate,
            numberOfGuests,
            selectedPackage,
            additionalServices = [],
            specialRequests
        } = req.body;

        // Validate dates
        const checkIn = new Date(checkInDate);
        const checkOut = new Date(checkOutDate);
        const today = new Date();

        if (checkIn < today) {
            return res.status(400).json({ error: 'Check-in date cannot be in the past' });
        }

        if (checkOut <= checkIn) {
            return res.status(400).json({ error: 'Check-out date must be after check-in date' });
        }

        // Check if room exists and is available
        const room = await Room.findById(roomId);
        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }

        if (room.available < 1) {
            return res.status(400).json({ error: 'Room is not available' });
        }

        // Calculate nights
        const numberOfNights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

        // Calculate pricing
        const roomRate = room.price;
        let packagePrice = 0;
        let packageData = null;

        if (selectedPackage) {
            const packageObj = await Package.findById(selectedPackage);
            if (packageObj && packageObj.isAvailable(checkIn)) {
                packagePrice = packageObj.getSeasonalPrice(checkIn);
                packageData = {
                    id: packageObj._id,
                    name: packageObj.name,
                    description: packageObj.description,
                    price: packagePrice,
                    includes: packageObj.includes
                };
            }
        }

        // Calculate services pricing
        const servicesWithPricing = [];
        for (const service of additionalServices) {
            const serviceObj = await Service.findById(service.serviceId);
            if (serviceObj && serviceObj.isActive) {
                servicesWithPricing.push({
                    serviceId: serviceObj._id,
                    serviceName: serviceObj.name,
                    serviceType: serviceObj.category,
                    price: serviceObj.price,
                    quantity: service.quantity || 1,
                    scheduledDate: service.scheduledDate,
                    scheduledTime: service.scheduledTime
                });
            }
        }

        // Create booking
        const booking = new Booking({
            user: req.user._id,
            room: roomId,
            checkInDate: checkIn,
            checkOutDate: checkOut,
            numberOfNights,
            numberOfGuests,
            selectedPackage: packageData,
            additionalServices: servicesWithPricing,
            specialRequests: specialRequests || {},
            pricing: {
                roomRate,
                packagePrice,
                totalAmount: 0 // Will be calculated by the method
            }
        });

        // Calculate total and save
        booking.calculateTotal();
        await booking.save();

        // Update room availability
        room.available -= 1;
        await room.save();

        // Populate room and user data for response
        await booking.populate('room user');

        res.status(201).json({
            success: true,
            message: 'Booking created successfully',
            booking: booking.toJSON()
        });
    } catch (error) {
        console.error('Create booking error:', error);
        res.status(500).json({ error: 'Failed to create booking' });
    }
};

// Get user's bookings
const getUserBookings = async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;

        const query = { user: req.user._id };
        if (status) query.status = status;

        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            sort: { createdAt: -1 },
            populate: 'room'
        };

        const bookings = await Booking.paginate(query, options);

        res.json({
            success: true,
            bookings: bookings.docs,
            pagination: {
                page: bookings.page,
                pages: bookings.totalPages,
                total: bookings.totalDocs
            }
        });
    } catch (error) {
        console.error('Get user bookings error:', error);
        res.status(500).json({ error: 'Failed to retrieve bookings' });
    }
};

// Get booking by ID (with access control)
const getBookingById = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id)
            .populate('room user additionalServices.serviceId serviceRequests.assignedStaff');

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        // Check access permissions
        if (req.user.role === 'user' && booking.user._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json({
            success: true,
            booking: booking.toJSON()
        });
    } catch (error) {
        console.error('Get booking error:', error);
        res.status(500).json({ error: 'Failed to retrieve booking' });
    }
};

// Update booking (limited fields for users)
const updateBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        // Check access permissions
        if (req.user.role === 'user' && booking.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Users can only update special requests before check-in
        if (req.user.role === 'user') {
            if (booking.status !== 'confirmed') {
                return res.status(400).json({ error: 'Cannot modify booking in current status' });
            }

            const allowedFields = ['specialRequests'];
            const updates = {};

            Object.keys(req.body).forEach(key => {
                if (allowedFields.includes(key)) {
                    updates[key] = req.body[key];
                }
            });

            Object.assign(booking, updates);
        } else {
            // Staff can update more fields
            const allowedFields = [
                'status', 'actualCheckIn', 'actualCheckOut',
                'specialRequests', 'pricing'
            ];

            const updates = {};
            Object.keys(req.body).forEach(key => {
                if (allowedFields.includes(key)) {
                    updates[key] = req.body[key];
                }
            });

            Object.assign(booking, updates);
        }

        await booking.save();

        res.json({
            success: true,
            message: 'Booking updated successfully',
            booking: booking.toJSON()
        });
    } catch (error) {
        console.error('Update booking error:', error);
        res.status(500).json({ error: 'Failed to update booking' });
    }
};

// Cancel booking
const cancelBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        // Check access permissions
        if (req.user.role === 'user' && booking.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Check if booking can be cancelled
        if (!['confirmed', 'checked-in'].includes(booking.status)) {
            return res.status(400).json({ error: 'Booking cannot be cancelled in current status' });
        }

        booking.status = 'cancelled';
        await booking.save();

        // Restore room availability
        const room = await Room.findById(booking.room);
        if (room) {
            room.available += 1;
            await room.save();
        }

        res.json({
            success: true,
            message: 'Booking cancelled successfully',
            booking: booking.toJSON()
        });
    } catch (error) {
        console.error('Cancel booking error:', error);
        res.status(500).json({ error: 'Failed to cancel booking' });
    }
};

// Add service to booking
const addServiceToBooking = async (req, res) => {
    try {
        const { serviceId, quantity = 1, scheduledDate, scheduledTime } = req.body;

        const booking = await Booking.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        // Check access permissions
        if (req.user.role === 'user' && booking.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const service = await Service.findById(serviceId);
        if (!service || !service.isActive) {
            return res.status(404).json({ error: 'Service not found or not available' });
        }

        const newService = {
            serviceId: service._id,
            serviceName: service.name,
            serviceType: service.category,
            price: service.price,
            quantity,
            scheduledDate,
            scheduledTime
        };

        booking.additionalServices.push(newService);
        booking.calculateTotal();
        await booking.save();

        res.json({
            success: true,
            message: 'Service added to booking',
            booking: booking.toJSON()
        });
    } catch (error) {
        console.error('Add service error:', error);
        res.status(500).json({ error: 'Failed to add service to booking' });
    }
};

// Add food order
const addFoodOrder = async (req, res) => {
    try {
        const { items, orderType, deliveryDate, deliveryTime } = req.body;

        const booking = await Booking.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        // Check access permissions
        if (req.user.role === 'user' && booking.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        const foodOrder = {
            orderId: generateUUID(),
            items,
            orderType,
            deliveryDate,
            deliveryTime,
            totalAmount
        };

        booking.foodOrders.push(foodOrder);
        booking.calculateTotal();
        await booking.save();

        res.json({
            success: true,
            message: 'Food order added successfully',
            order: foodOrder,
            booking: booking.toJSON()
        });
    } catch (error) {
        console.error('Add food order error:', error);
        res.status(500).json({ error: 'Failed to add food order' });
    }
};

// Update food order status
const updateFoodOrder = async (req, res) => {
    try {
        const { status } = req.body;

        const booking = await Booking.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        const order = booking.foodOrders.id(req.params.orderId);
        if (!order) {
            return res.status(404).json({ error: 'Food order not found' });
        }

        // Only staff can update order status
        if (!['staff', 'manager', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Staff access required' });
        }

        order.status = status;
        await booking.save();

        res.json({
            success: true,
            message: 'Food order updated successfully',
            order
        });
    } catch (error) {
        console.error('Update food order error:', error);
        res.status(500).json({ error: 'Failed to update food order' });
    }
};

// Create service request
const createServiceRequest = async (req, res) => {
    try {
        const { type, priority, description } = req.body;

        const booking = await Booking.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        // Check access permissions
        if (req.user.role === 'user' && booking.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const serviceRequest = {
            requestId: generateUUID(),
            type,
            priority: priority || 'medium',
            description
        };

        booking.serviceRequests.push(serviceRequest);
        await booking.save();

        res.json({
            success: true,
            message: 'Service request created successfully',
            request: serviceRequest
        });
    } catch (error) {
        console.error('Create service request error:', error);
        res.status(500).json({ error: 'Failed to create service request' });
    }
};

// Update service request (assign staff, update status, add resolution)
const updateServiceRequest = async (req, res) => {
    try {
        const { assignedStaff, status, resolution, rating } = req.body;

        const booking = await Booking.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        const request = booking.serviceRequests.id(req.params.requestId);
        if (!request) {
            return res.status(404).json({ error: 'Service request not found' });
        }

        // Staff can assign and update status
        if (['staff', 'manager', 'admin'].includes(req.user.role)) {
            if (assignedStaff) request.assignedStaff = assignedStaff;
            if (status) request.status = status;
            if (resolution) {
                request.resolution = resolution;
                request.resolvedDate = new Date();
            }
        }

        // Users can rate resolved requests
        if (req.user.role === 'user' && rating && request.status === 'resolved') {
            request.rating = rating;
        }

        await booking.save();

        res.json({
            success: true,
            message: 'Service request updated successfully',
            request
        });
    } catch (error) {
        console.error('Update service request error:', error);
        res.status(500).json({ error: 'Failed to update service request' });
    }
};

// Add review to booking
const addReview = async (req, res) => {
    try {
        const { rating, comment } = req.body;

        const booking = await Booking.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        // Check access permissions
        if (booking.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Can only review completed bookings
        if (booking.status !== 'checked-out') {
            return res.status(400).json({ error: 'Can only review completed stays' });
        }

        booking.review = {
            rating,
            comment,
            reviewDate: new Date()
        };

        await booking.save();

        res.json({
            success: true,
            message: 'Review added successfully',
            review: booking.review
        });
    } catch (error) {
        console.error('Add review error:', error);
        res.status(500).json({ error: 'Failed to add review' });
    }
};

// Get all bookings (staff access)
const getAllBookings = async (req, res) => {
    try {
        const {
            status,
            checkInDate,
            checkOutDate,
            page = 1,
            limit = 20,
            department
        } = req.query;

        const query = {};
        if (status) query.status = status;
        if (checkInDate) query.checkInDate = { $gte: new Date(checkInDate) };
        if (checkOutDate) query.checkOutDate = { $lte: new Date(checkOutDate) };

        // Department-based filtering for staff
        if (req.user.role === 'staff' && department) {
            // Add logic to filter by department-relevant bookings
        }

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Get total count for pagination
        const total = await Booking.countDocuments(query);

        // Get bookings with pagination
        const bookings = await Booking.find(query)
            .populate('room', 'roomNumber type rate')
            .populate('user', 'firstName lastName email phone')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum);

        res.json({
            success: true,
            bookings,
            pagination: {
                page: pageNum,
                pages: Math.ceil(total / limitNum),
                total,
                hasNext: pageNum < Math.ceil(total / limitNum),
                hasPrev: pageNum > 1
            }
        });
    } catch (error) {
        console.error('Get all bookings error:', error);
        res.status(500).json({ error: 'Failed to retrieve bookings' });
    }
};

// Check-in booking
const checkInBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        if (booking.status !== 'confirmed') {
            return res.status(400).json({ error: 'Booking must be confirmed to check in' });
        }

        booking.status = 'checked-in';
        booking.actualCheckIn = new Date();
        await booking.save();

        res.json({
            success: true,
            message: 'Guest checked in successfully',
            booking: booking.toJSON()
        });
    } catch (error) {
        console.error('Check-in error:', error);
        res.status(500).json({ error: 'Failed to check in guest' });
    }
};

// Check-out booking
const checkOutBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        if (booking.status !== 'checked-in') {
            return res.status(400).json({ error: 'Guest must be checked in to check out' });
        }

        booking.status = 'checked-out';
        booking.actualCheckOut = new Date();
        await booking.save();

        // Restore room availability
        const room = await Room.findById(booking.room);
        if (room) {
            room.available += 1;
            await room.save();
        }

        res.json({
            success: true,
            message: 'Guest checked out successfully',
            booking: booking.toJSON()
        });
    } catch (error) {
        console.error('Check-out error:', error);
        res.status(500).json({ error: 'Failed to check out guest' });
    }
};

// Get booking statistics (management access)
const getBookingStats = async (req, res) => {
    try {
        const { period = 'month' } = req.query;

        // Calculate date range based on period
        const now = new Date();
        let startDate;

        switch (period) {
            case 'week':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        const stats = await Booking.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: null,
                    totalBookings: { $sum: 1 },
                    totalRevenue: { $sum: '$pricing.totalAmount' },
                    averageBookingValue: { $avg: '$pricing.totalAmount' },
                    confirmedBookings: {
                        $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] }
                    },
                    checkedInBookings: {
                        $sum: { $cond: [{ $eq: ['$status', 'checked-in'] }, 1, 0] }
                    },
                    completedBookings: {
                        $sum: { $cond: [{ $eq: ['$status', 'checked-out'] }, 1, 0] }
                    },
                    cancelledBookings: {
                        $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
                    }
                }
            }
        ]);

        res.json({
            success: true,
            period,
            stats: stats[0] || {
                totalBookings: 0,
                totalRevenue: 0,
                averageBookingValue: 0,
                confirmedBookings: 0,
                checkedInBookings: 0,
                completedBookings: 0,
                cancelledBookings: 0
            }
        });
    } catch (error) {
        console.error('Get booking stats error:', error);
        res.status(500).json({ error: 'Failed to retrieve booking statistics' });
    }
};

module.exports = {
    createBooking,
    getUserBookings,
    getBookingById,
    updateBooking,
    cancelBooking,
    addServiceToBooking,
    addFoodOrder,
    updateFoodOrder,
    createServiceRequest,
    updateServiceRequest,
    addReview,
    getAllBookings,
    checkInBooking,
    checkOutBooking,
    getBookingStats
};
