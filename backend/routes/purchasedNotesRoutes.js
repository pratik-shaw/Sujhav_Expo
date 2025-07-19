// routes/purchasedNotesRoutes.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const {
  purchaseNotes,
  verifyPaymentAndPurchase,
  checkNotesAccess,
  getStudentPurchasedNotes,
  getPurchaseDetails,
  getPDFWithAccess,
  cancelPurchase,
  getDownloadHistory,
  getAllPurchases,
  getPurchaseStats
} = require('../controllers/purchasedNotesController');

// Import authentication middleware
const { authenticateUser } = require('../middlewares/auth');

// Custom authentication middleware for PDF access (handles both header and URL token)
const authenticatePDFAccess = async (req, res, next) => {
  try {
    let token = null;
    
    // Check for token in Authorization header first
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
      console.log('🔐 PDF Auth: Found token in header');
    }
    
    // If no header token, check URL parameter
    if (!token && req.query.token) {
      token = req.query.token;
      console.log('🔐 PDF Auth: Found token in URL parameter');
    }
    
    if (!token) {
      console.log('❌ PDF Auth: No token found in header or URL parameter');
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ PDF Auth: Token verified for user:', decoded.id);
    
    // Get user from database
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      console.log('❌ PDF Auth: User not found:', decoded.id);
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Attach user to request
    req.user = user;
    console.log('✅ PDF Auth: User authenticated successfully:', user.name);
    next();
    
  } catch (error) {
    console.error('❌ PDF Auth Error:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    
    return res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

// Apply authentication middleware to all routes
router.post('/purchase', authenticateUser, purchaseNotes);
router.post('/verify-payment', authenticateUser, verifyPaymentAndPurchase);
router.get('/access/:notesId', authenticateUser, checkNotesAccess);
router.get('/my-purchases', authenticateUser, getStudentPurchasedNotes);
router.get('/:purchaseId/details', authenticateUser, getPurchaseDetails);
router.delete('/:purchaseId/cancel', authenticateUser, cancelPurchase);
router.get('/:purchaseId/download-history', authenticateUser, getDownloadHistory);

// PDF download route with standard auth (for app downloads)
router.get('/:notesId/pdfs/:pdfId/download', authenticateUser, getPDFWithAccess);

// PDF view route for browsers (accepts token in header OR URL parameter)
router.get('/:notesId/pdfs/:pdfId/view', authenticatePDFAccess, getPDFWithAccess);

// Admin routes (uncomment if needed)
// router.get('/admin/all-purchases', authenticateUser, getAllPurchases);
// router.get('/admin/stats', authenticateUser, getPurchaseStats);

module.exports = router;