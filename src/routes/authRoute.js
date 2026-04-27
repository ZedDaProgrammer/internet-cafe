const express = require('express');
const router = express.Router();
const { registration, loginUser } = require('../controllers/authController');

router.get('/test', (req, res) => {
    res.send('The auth route map is working perfectly!');
});

router.post('/login', loginUser);
router.post('/register', registration);

module.exports = router;