const express = require('express');
const router = express.Router();
const { getAllComputer, addComputer } = require('../controllers/computerController');
const verifyToken = require('../middleware/authMiddleware');

router.get('/', getAllComputer);

router.post('/', verifyToken, addComputer);

module.exports = router;