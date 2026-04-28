const pool = require('../config/db');

//display computers in the mainboard
const getAllComputer = async (req, res) => {
    try
    {
    const result = await pool.query('SELECT * FROM computers ORDER BY computer_name ASC');
    res.json(result.rows);
} catch {
    console.error(err.message);
    res.status(500).json({ erro: 'Error fetching servers.'});
    }
};

//add computers
const addComputer = async (req, res) => {
    try {
        const { computer_name, specs, hourly_rate } = req.body;

        const newPC = await pool.query(
            'INSERT INTO computers (computer_name, specs, hourly_rate) VALUES ($1, $2, $3) RETURNING *',
            [computer_name, specs, hourly_rate]
        );

        res.status(201).json({
            message: 'Computer added successfully!',
            computer: newPC.rows[0]
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error while adding computer' });
    }
};

module.exports = { getAllComputer, addComputer };