const express = require('express');
const { 
  registerUser, 
  loginUser, 
  getCurrentUser 
} = require('../controllers/authController');
const { verifyToken, verifyAdmin } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/current-user', verifyToken, getCurrentUser);
router.get('/admin-dashboard', verifyAdmin, (req, res) => {
  res.json({ message: 'Admin access granted' });
});

module.exports = router;