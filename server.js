//bringing in tools
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./src/config/db');
const authRoutes = require('./src/routes/authRoute');
const computerRoutes = require('./src/routes/computerRoute');
const bookingRoutes = require('./src/routes/bookingRoute');

const app = express();

//middleware or translators
app.use(cors());
app.use(express.json());
app.use('/api/computers', computerRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);

//route
app.get('/', (req, res) => {
    res.send('API is running...')
});

//turning on the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
});
