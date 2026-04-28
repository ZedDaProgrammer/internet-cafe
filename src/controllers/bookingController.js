const pool = require('../config/db');

// Create a new booking/reservation
const createBooking = async (req, res) => {
    try {
        const { computer_id, end_time } = req.body;
        const user_id = req.user.id; // From JWT token middleware

        // Check if computer exists and is available
        const computerResult = await pool.query(
            'SELECT * FROM computers WHERE id = $1',
            [computer_id]
        );

        if (computerResult.rows.length === 0) {
            return res.status(404).json({ error: 'Computer not found.' });
        }

        const computer = computerResult.rows[0];

        // Check if computer is already booked
        const existingBooking = await pool.query(
            'SELECT * FROM reservations WHERE computer_id = $1 AND status = $2',
            [computer_id, 'active']
        );

        if (existingBooking.rows.length > 0) {
            return res.status(400).json({ error: 'Computer is already booked.' });
        }

        // Calculate total price
        const startTime = new Date();
        const endTimeDate = new Date(end_time);
        const hours = (endTimeDate - startTime) / (1000 * 60 * 60);
        const total_price = hours * computer.hourly_rate;

        // Create reservation
        const newBooking = await pool.query(
            `INSERT INTO reservations (user_id, computer_id, end_time, total_price, status)
            VALUES ($1, $2, $3, $4, 'active')
            RETURNING *`,
            [user_id, computer_id, end_time, total_price]
        );

        res.status(201).json({
            message: 'Booking created successfully!',
            booking: newBooking.rows[0]
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error while creating booking.' });
    }
};

// Get all bookings for the logged-in user
const getUserBookings = async (req, res) => {
    try {
        const user_id = req.user.id;

        const bookings = await pool.query(
            `SELECT r.*, c.computer_name, c.hourly_rate, u.username, u.email
            FROM reservations r
            JOIN computers c ON r.computer_id = c.id
            JOIN users u ON r.user_id = u.id
            WHERE r.user_id = $1
            ORDER BY r.start_time DESC`,
            [user_id]
        );

        res.json({
            message: 'User bookings retrieved successfully!',
            bookings: bookings.rows
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error while fetching bookings.' });
    }
};

// Get all bookings (admin only)
const getAllBookings = async (req, res) => {
    try {
        const bookings = await pool.query(
            `SELECT r.*, c.computer_name, c.hourly_rate, u.username, u.email
            FROM reservations r
            JOIN computers c ON r.computer_id = c.id
            JOIN users u ON r.user_id = u.id
            ORDER BY r.start_time DESC`
        );

        res.json({
            message: 'All bookings retrieved successfully!',
            bookings: bookings.rows
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error while fetching bookings.' });
    }
};

// Get booking by ID
const getBookingById = async (req, res) => {
    try {
        const { id } = req.params;

        const booking = await pool.query(
            `SELECT r.*, c.computer_name, c.hourly_rate, u.username, u.email
            FROM reservations r
            JOIN computers c ON r.computer_id = c.id
            JOIN users u ON r.user_id = u.id
            WHERE r.id = $1`,
            [id]
        );

        if (booking.rows.length === 0) {
            return res.status(404).json({ error: 'Booking not found.' });
        }

        res.json({
            message: 'Booking retrieved successfully!',
            booking: booking.rows[0]
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error while fetching booking.' });
    }
};

// Complete a booking
const completeBooking = async (req, res) => {
    try {
        const { id } = req.params;

        const booking = await pool.query(
            'SELECT * FROM reservations WHERE id = $1',
            [id]
        );

        if (booking.rows.length === 0) {
            return res.status(404).json({ error: 'Booking not found.' });
        }

        // Update booking status to completed
        const completedBooking = await pool.query(
            `UPDATE reservations 
            SET status = 'completed' 
            WHERE id = $1 
            RETURNING *`,
            [id]
        );

        res.json({
            message: 'Booking completed successfully!',
            booking: completedBooking.rows[0]
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error while completing booking.' });
    }
};

// Cancel a booking
const cancelBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const user_id = req.user.id;

        const booking = await pool.query(
            'SELECT * FROM reservations WHERE id = $1',
            [id]
        );

        if (booking.rows.length === 0) {
            return res.status(404).json({ error: 'Booking not found.' });
        }

        // Check if user is the owner or admin
        if (booking.rows[0].user_id !== user_id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'You do not have permission to cancel this booking.' });
        }

        // Update booking status to cancelled
        const cancelledBooking = await pool.query(
            `UPDATE reservations 
            SET status = 'cancelled' 
            WHERE id = $1 
            RETURNING *`,
            [id]
        );

        res.json({
            message: 'Booking cancelled successfully!',
            booking: cancelledBooking.rows[0]
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error while cancelling booking.' });
    }
};

// Update booking end time
const updateBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const { end_time } = req.body;
        const user_id = req.user.id;

        const booking = await pool.query(
            'SELECT * FROM reservations WHERE id = $1',
            [id]
        );

        if (booking.rows.length === 0) {
            return res.status(404).json({ error: 'Booking not found.' });
        }

        // Check if user is the owner or admin
        if (booking.rows[0].user_id !== user_id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'You do not have permission to update this booking.' });
        }

        // Get computer to calculate new price
        const computerResult = await pool.query(
            'SELECT hourly_rate FROM computers WHERE id = $1',
            [booking.rows[0].computer_id]
        );

        const computer = computerResult.rows[0];
        const startTime = new Date(booking.rows[0].start_time);
        const endTimeDate = new Date(end_time);
        const hours = (endTimeDate - startTime) / (1000 * 60 * 60);
        const total_price = hours * computer.hourly_rate;

        // Update booking
        const updatedBooking = await pool.query(
            `UPDATE reservations 
            SET end_time = $1, total_price = $2
            WHERE id = $3 
            RETURNING *`,
            [end_time, total_price, id]
        );

        res.json({
            message: 'Booking updated successfully!',
            booking: updatedBooking.rows[0]
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error while updating booking.' });
    }
};

module.exports = {
    createBooking,
    getUserBookings,
    getAllBookings,
    getBookingById,
    completeBooking,
    cancelBooking,
    updateBooking
};
