//creating auth controls
const bcrypt = require('bcrypt');
const pool = require('../config/db');

const registration = async (req, res) => {
    try {

        const {username, email, full_name, password, phone} = req.body;

        const userExist = await pool.query(
            'SELECT * FROM users WHERE email = $1 OR username = $2',
            [email, username]
        );

        if (userExist.rows.length > 0 ){
            return res.status(400).json({error: 'User with this email or username already exists.'})
        }

        const saltRound = 10;
        const password_hash = await bcrypt.hash(password, saltRound);

        const newUser = await pool.query(
            `INSERT INTO users (username, email, password_hash, phone, full_name, role)
            VALUES ($1, $2, $3, $4, $5, 'customer')
            RETURNING id, username, email, role`,
            [username, email, password_hash, full_name, phone]
        );

        res.status(201).json({
            message: "User registered.",
            user: newUser.rows[0]
        });

    } catch (err){
        console.error(err.message);
        res.status(500).json({ error: 'ERROR during registration.'});
    }
};

module.exports = { registration };