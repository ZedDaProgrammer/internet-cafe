const express = require('express');
const router = express.Router();
const {
    createBooking,
    getUserBookings,
    getAllBookings,
    getBookingById,
    completeBooking,
    cancelBooking,
    updateBooking,
    getUserMonthlyHistory,
    getAdminStats
} = require('../controllers/bookingController');
const verifyToken = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Public routes
router.get('/test', (req, res) => {
    res.send('The booking route is working perfectly!');
});

// Protected routes (require authentication)
router.post('/', verifyToken, createBooking); // Create a new booking
router.get('/user', verifyToken, getUserBookings); // Get user's bookings
router.get('/my-history', verifyToken, getUserMonthlyHistory); // Get user's monthly spending history
router.get('/:id', verifyToken, getBookingById); // Get booking by ID
router.put('/:id', verifyToken, updateBooking); // Update booking
router.patch('/:id/complete', verifyToken, completeBooking); // Complete booking
router.delete('/:id', verifyToken, cancelBooking); // Cancel booking

// Admin routes
router.get('/stats', verifyToken, adminMiddleware, getAdminStats); // Get admin statistics
router.get('/', verifyToken, adminMiddleware, getAllBookings); // Get all bookings (admin)

module.exports = router;
