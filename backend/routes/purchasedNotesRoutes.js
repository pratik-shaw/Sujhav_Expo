// routes/purchasedNotesRoutes.js
const express = require('express');
const router = express.Router();
const {
  purchaseNotes,
  verifyPaymentAndPurchase,
  getStudentPurchasedNotes,
  getPurchaseDetails,
  downloadPDF,
  cancelPurchase,
  checkNotesAccess,
  getDownloadHistory
} = require('../controllers/purchasedNotesController');

// Import authentication middleware
const { authenticateUser } = require('../middlewares/auth');

// Apply authentication middleware to all routes
router.use(authenticateUser);

// Purchase notes
router.post('/purchase', purchaseNotes);

// Verify payment and complete purchase
router.post('/verify-payment', verifyPaymentAndPurchase);

// Get student's purchased notes
router.get('/my-purchases', getStudentPurchasedNotes);

// Get specific purchase details
router.get('/:purchaseId', getPurchaseDetails);

// Download PDF (with access control)
router.get('/:notesId/pdfs/:pdfId/download', downloadPDF);

// Cancel purchase (for pending purchases)
router.delete('/:purchaseId/cancel', cancelPurchase);

// Check if student has access to notes
router.get('/access/:notesId', checkNotesAccess);

// Get download history for a purchase
router.get('/:purchaseId/download-history', getDownloadHistory);

module.exports = router;