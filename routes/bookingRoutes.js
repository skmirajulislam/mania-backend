const express = require('express');
const {
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
    getBookingStats,
    checkInBooking,
    checkOutBooking
} = require('../controllers/bookingController');

const {
    auth,
    authorize,
    authorizeUserAccess,
    authorizeOperationalAccess,
    authorizeFinancialAccess
} = require('../middleware/auth');

const router = express.Router();

// User routes
router.post('/', auth, authorize(['user']), createBooking); // Create new booking
router.get('/my-bookings', auth, authorize(['user']), getUserBookings); // Get user's bookings

// Staff/Manager routes (put these before /:id to avoid conflicts)
router.get('/stats', auth, authorize(['staff', 'manager', 'admin', 'ceo']), getBookingStats); // Booking statistics
router.get('/', auth, authorize(['staff', 'manager', 'admin', 'ceo']), getAllBookings); // Get all bookings

// Routes with ID parameters (put these after specific routes)
router.get('/:id', auth, getBookingById); // Get specific booking (with access control)
router.put('/:id', auth, updateBooking); // Update booking (with access control)
router.put('/:id/cancel', auth, cancelBooking); // Cancel booking
router.post('/:id/services', auth, addServiceToBooking); // Add service to booking
router.post('/:id/food-orders', auth, addFoodOrder); // Add food order
router.put('/:id/food-orders/:orderId', auth, updateFoodOrder); // Update food order
router.post('/:id/service-requests', auth, createServiceRequest); // Create service request
router.put('/:id/service-requests/:requestId', auth, updateServiceRequest); // Update service request
router.post('/:id/review', auth, authorize(['user']), addReview); // Add review
router.put('/:id/check-in', auth, authorize(['staff', 'manager', 'admin']), checkInBooking); // Check-in
router.put('/:id/check-out', auth, authorize(['staff', 'manager', 'admin']), checkOutBooking); // Check-out

module.exports = router;
