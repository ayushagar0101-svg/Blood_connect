const express = require('express');
const router = express.Router();
const { register, login, getMe, logout } = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');

// Public Routes
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);

// Protected Routes
router.get('/me', verifyToken, getMe);

module.exports = router;

