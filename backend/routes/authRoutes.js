const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middlewares/authMiddleware');

// Public routes
router.post('/register', authController.registerUser);
router.post('/login', authController.loginUser);

// Protected routes
router.get('/me', verifyToken, authController.getCurrentUser);
router.get('/verify-token', verifyToken, authController.verifyToken);


module.exports = router;