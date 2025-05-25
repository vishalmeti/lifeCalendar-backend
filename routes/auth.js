const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { register, login, getUserProfile } = require('../controllers/auth/authController');


router.post('/register', register);
router.post('/login', login);
router.get('/me', authMiddleware, getUserProfile);

module.exports = router;