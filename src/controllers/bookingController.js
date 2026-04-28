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

// Get user's monthly spending history
const getUserMonthlyHistory = async (req, res) => {
    try {
        const user_id = req.user.id;

        // Get current month and year
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });

        // Get all bookings for the current month
        const monthlyBookings = await pool.query(
            `SELECT r.*, c.computer_name, c.hourly_rate, u.username
            FROM reservations r
            JOIN computers c ON r.computer_id = c.id
            JOIN users u ON r.user_id = u.id
            WHERE r.user_id = $1 
            AND EXTRACT(MONTH FROM r.start_time) = $2
            AND EXTRACT(YEAR FROM r.start_time) = $3
            ORDER BY r.start_time DESC`,
            [user_id, currentMonth, currentYear]
        );

        // Calculate total spent this month
        const totalResult = await pool.query(
            `SELECT COALESCE(SUM(total_price), 0) as total_spent
            FROM reservations
            WHERE user_id = $1
            AND EXTRACT(MONTH FROM start_time) = $2
            AND EXTRACT(YEAR FROM start_time) = $3`,
            [user_id, currentMonth, currentYear]
        );

        const totalSpent = totalResult.rows[0].total_spent;

        res.json({
            message: 'Monthly spending history retrieved successfully!',
            month: monthName,
            total_spent_this_month: parseFloat(totalSpent).toFixed(2),
            booking_count: monthlyBookings.rows.length,
            bookings: monthlyBookings.rows
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error while fetching monthly history.' });
    }
};

// Get admin statistics
const getAdminStats = async (req, res) => {
    try {
        // Get today's date range
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Get total earnings for today
        const earningsResult = await pool.query(
            `SELECT COALESCE(SUM(total_price), 0) as total_earnings
            FROM reservations
            WHERE status = 'completed'
            AND start_time >= $1
            AND start_time < $2`,
            [today, tomorrow]
        );

        const totalEarningsToday = earningsResult.rows[0].total_earnings;

        // Get total bookings for today
        const bookingCountResult = await pool.query(
            `SELECT COUNT(*) as total_bookings
            FROM reservations
            WHERE start_time >= $1
            AND start_time < $2`,
            [today, tomorrow]
        );

        const totalBookingsToday = bookingCountResult.rows[0].total_bookings;

        // Get most popular computers (top 5) by booking count
        const mostPopularResult = await pool.query(
            `SELECT c.id, c.computer_name, COUNT(r.id) as booking_count, 
                    COALESCE(SUM(r.total_price), 0) as pc_earnings
            FROM computers c
            LEFT JOIN reservations r ON c.id = r.computer_id
            AND r.start_time >= $1
            AND r.start_time < $2
            GROUP BY c.id, c.computer_name
            ORDER BY booking_count DESC
            LIMIT 5`,
            [today, tomorrow]
        );

        // Get top 5 spending users for today
        const topSpendingResult = await pool.query(
            `SELECT u.id, u.username, u.email, COUNT(r.id) as booking_count,
                    COALESCE(SUM(r.total_price), 0) as user_spending
            FROM users u
            LEFT JOIN reservations r ON u.id = r.user_id
            AND r.start_time >= $1
            AND r.start_time < $2
            GROUP BY u.id, u.username, u.email
            HAVING COUNT(r.id) > 0
            ORDER BY user_spending DESC
            LIMIT 5`,
            [today, tomorrow]
        );

        const formattedDate = today.toISOString().split('T')[0];

        res.json({
            message: 'Admin statistics retrieved successfully!',
            date: formattedDate,
            summary: {
                total_earnings_today: parseFloat(totalEarningsToday).toFixed(2),
                total_bookings_today: parseInt(totalBookingsToday),
                currency: 'PHP'
            },
            most_popular_pcs: mostPopularResult.rows.map(pc => ({
                computer_name: pc.computer_name,
                booking_count: pc.booking_count,
                pc_earnings: parseFloat(pc.pc_earnings).toFixed(2)
            })),
            top_spending_users: topSpendingResult.rows.map(user => ({
                username: user.username,
                email: user.email,
                booking_count: user.booking_count,
                user_spending: parseFloat(user.user_spending).toFixed(2)
            }))
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error while fetching admin statistics.' });
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
    getUserMonthlyHistory,
    getAllBookings,
    getBookingById,
    completeBooking,
    cancelBooking,
    updateBooking,
    getAdminStats
};
