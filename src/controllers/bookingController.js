const pool = require('../config/db');

// 1. START A BOOKING (Used by Dashboard)
const startBooking = async (req, res) => {
    try {
        const computer_id = parseInt(req.body.computer_id);
        const duration_hours = parseInt(req.body.duration_hours) || 1; // Default to 1 hour
        const user_id = req.user.id;

        // 1. Check if PC exists and is available
        const pcCheck = await pool.query('SELECT status FROM computers WHERE id = $1', [computer_id]);
        if (pcCheck.rows.length === 0) return res.status(404).json({ error: 'PC not found' });
        if (pcCheck.rows[0].status !== 'available') return res.status(400).json({ error: 'PC is occupied' });

        // 2. Create the reservation with calculated end_time
        const newBooking = await pool.query(
            `INSERT INTO reservations (user_id, computer_id, status, start_time, end_time) 
             VALUES ($1, $2, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + ($3 || ' hours')::interval) 
             RETURNING *`,
            [user_id, computer_id, duration_hours]
        );

        // 3. Update PC status
        await pool.query('UPDATE computers SET status = $1 WHERE id = $2', ['occupied', computer_id]);

        res.status(201).json({
            message: 'Session started!',
            booking: newBooking.rows[0]
        });
    } catch (err) {
        console.error("BACKEND ERROR:", err.message);
        res.status(500).json({ error: 'Failed to start session' });
    }
};

// 2. END A BOOKING
const endBooking = async (req, res) => {
    try {
        const reservation_id = parseInt(req.body.reservation_id);

        const bookingData = await pool.query(
            `SELECT r.*, c.hourly_rate, c.id as pc_id 
             FROM reservations r 
             JOIN computers c ON r.computer_id = c.id 
             WHERE r.id = $1 AND r.status = 'active'`,
            [reservation_id]
        );

        if (bookingData.rows.length === 0) {
            return res.status(404).json({ error: 'Active booking not found' });
        }

        const booking = bookingData.rows[0];
        const endTime = new Date();
        const startTime = new Date(booking.start_time);
        
        // Calculate price
        const diffInMs = endTime - startTime;
        const hours = Math.max(0.25, diffInMs / (1000 * 60 * 60)); 
        const totalPrice = (hours * booking.hourly_rate).toFixed(2);

        // Update Reservation to completed
        await pool.query(
            'UPDATE reservations SET end_time = $1, total_price = $2, status = $3 WHERE id = $4',
            [endTime, totalPrice, 'completed', reservation_id]
        );

        // Make PC available again
        await pool.query('UPDATE computers SET status = $1 WHERE id = $2', ['available', booking.pc_id]);

        res.json({
            message: 'Session ended!',
            total_time: `${hours.toFixed(2)} hours`,
            total_price: `₱${totalPrice}`
        });
    } catch (err) {
        console.error("END BOOKING ERROR:", err.message);
        res.status(500).json({ error: err.message });
    }
};

// 3. GET USER HISTORY (For history.html)
const getMyHistory = async (req, res) => {
    try {
        const user_id = req.user.id;
        const history = await pool.query(
            `SELECT r.*, c.computer_name 
             FROM reservations r 
             JOIN computers c ON r.computer_id = c.id 
             WHERE r.user_id = $1 
             ORDER BY r.start_time DESC`, 
            [user_id]
        );
        res.json(history.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
};

// 4. GET ADMIN STATISTICS (For admin.html)
const getAdminStats = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const earningsResult = await pool.query(
            `SELECT COALESCE(SUM(total_price), 0) as total_earnings
             FROM reservations
             WHERE status = 'completed' AND start_time >= $1 AND start_time < $2`,
            [today, tomorrow]
        );

        const mostPopularResult = await pool.query(
            `SELECT c.computer_name, COUNT(r.id) as booking_count
             FROM computers c
             LEFT JOIN reservations r ON c.id = r.computer_id
             WHERE r.start_time >= $1 AND r.start_time < $2
             GROUP BY c.id, c.computer_name
             ORDER BY booking_count DESC LIMIT 5`,
            [today, tomorrow]
        );

        res.json({
            date: today.toISOString().split('T')[0],
            total_earnings_today: parseFloat(earningsResult.rows[0].total_earnings).toFixed(2),
            most_popular_pcs: mostPopularResult.rows
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error while fetching admin statistics.' });
    }
};

// --- ADDITIONAL CRUD FUNCTIONS ---

const createBooking = async (req, res) => {
    try {
        const { computer_id, end_time } = req.body;
        const user_id = req.user.id;
        const computerResult = await pool.query('SELECT * FROM computers WHERE id = $1', [computer_id]);
        if (computerResult.rows.length === 0) return res.status(404).json({ error: 'Computer not found.' });

        const computer = computerResult.rows[0];
        const startTime = new Date();
        const endTimeDate = new Date(end_time);
        const hours = (endTimeDate - startTime) / (1000 * 60 * 60);
        const total_price = hours * computer.hourly_rate;

        const newBooking = await pool.query(
            `INSERT INTO reservations (user_id, computer_id, end_time, total_price, status)
            VALUES ($1, $2, $3, $4, 'active') RETURNING *`,
            [user_id, computer_id, end_time, total_price]
        );
        res.status(201).json({ message: 'Booking created!', booking: newBooking.rows[0] });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

const getUserBookings = async (req, res) => {
    try {
        const user_id = req.user.id;
        const bookings = await pool.query(
            `SELECT r.*, c.computer_name FROM reservations r 
             JOIN computers c ON r.computer_id = c.id WHERE r.user_id = $1`, [user_id]
        );
        res.json({ bookings: bookings.rows });
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

const getAllBookings = async (req, res) => {
    try {
        const bookings = await pool.query(`SELECT r.*, c.computer_name, u.username FROM reservations r 
                                           JOIN computers c ON r.computer_id = c.id 
                                           JOIN users u ON r.user_id = u.id ORDER BY r.start_time DESC`);
        res.json({ bookings: bookings.rows });
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

const getBookingById = async (req, res) => {
    try {
        const { id } = req.params;
        const booking = await pool.query('SELECT * FROM reservations WHERE id = $1', [id]);
        if (booking.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json({ booking: booking.rows[0] });
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

const completeBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query("UPDATE reservations SET status = 'completed' WHERE id = $1 RETURNING *", [id]);
        res.json({ booking: result.rows[0] });
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

const cancelBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query("UPDATE reservations SET status = 'cancelled' WHERE id = $1 RETURNING *", [id]);
        res.json({ booking: result.rows[0] });
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

const updateBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const { end_time } = req.body;
        const result = await pool.query("UPDATE reservations SET end_time = $1 WHERE id = $2 RETURNING *", [end_time, id]);
        res.json({ booking: result.rows[0] });
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

const getUserMonthlyHistory = async (req, res) => {
    try {
        const user_id = req.user.id;
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();
        const result = await pool.query(
            `SELECT * FROM reservations WHERE user_id = $1 
             AND EXTRACT(MONTH FROM start_time) = $2 AND EXTRACT(YEAR FROM start_time) = $3`,
            [user_id, month, year]
        );
        res.json({ bookings: result.rows });
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

module.exports = {
    startBooking,
    endBooking,
    getMyHistory,
    getAdminStats,
    createBooking,
    getUserBookings,
    getAllBookings,
    getBookingById,
    completeBooking,
    cancelBooking,
    updateBooking,
    getUserMonthlyHistory
};