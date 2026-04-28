const express = require('express');
const router = express.Router();
const { getAllComputer, addComputer } = require('../controllers/computerController');
const verifyToken = require('../middleware/authMiddleware');
const isAdmin = require('../middleware/adminMiddleware');

router.get('/', getAllComputer);

router.post('/', verifyToken, addComputer);
router.post('/', verifyToken, isAdmin, addComputer);

module.exports = router;