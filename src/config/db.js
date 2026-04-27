//Database config file
const { Pool } = require('pg');
require('dotenv').config();

//pool to manage database connections
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

pool.connect()
    .then(() => console.log('Connected to PostgreSQL succesfully...'))
    .catch((err) => console.error('Database connection error:', err.stack));

module.exports = pool;