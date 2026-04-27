const express = require('express');
const router = express.Router();
const { registration, loginUser } = require('../controllers/authController');
const token = require('../middleware/authMiddleware');

router.get('/test', (req, res) => {
    res.send('The auth route map is working perfectly!');
});

router.post('/login', loginUser);
router.post('/register', registration);

router.get('/profile', token, (req, res) =>{
    res.json({
        message: "Welcome to your profile",
        user: req.user

    });
});

module.exports = router;