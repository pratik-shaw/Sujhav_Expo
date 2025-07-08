// routes/paidNotesRoutes.js
const express = require('express');
const router = express.Router();
const {
  createNotes,
  getAllNotes,
  getNotesById,
  getThumbnail,
  getPDF,
  updateNotes,
  deleteNotes,
  addPDFToNotes,
  updatePDFInNotes,
  deletePDFFromNotes,
  getNotesByCategory,
  incrementViewCount,
  purchaseNotes,
  verifyPayment,
  getStudentPurchasedNotes,
  checkNotesAccess,
  thumbnailUpload,
  pdfUpload
} = require('../controllers/paidNotesController');

// Import authentication middleware
const { authenticateUser } = require('../middlewares/auth');

// Admin routes (require admin authentication)
router.post('/', thumbnailUpload.single('thumbnail'), createNotes);
router.put('/:id', thumbnailUpload.single('thumbnail'), updateNotes);
router.delete('/:id', deleteNotes);

// PDF management routes (Admin only)
router.post('/:id/pdfs', (req, res, next) => {
  pdfUpload.single('pdf')(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload error'
      });
    }
    next();
  });
}, addPDFToNotes);

router.put('/:id/pdfs/:pdfId', pdfUpload.single('pdf'), updatePDFInNotes);
router.delete('/:id/pdfs/:pdfId', deletePDFFromNotes);

// Public routes (accessible by users)
router.get('/', getAllNotes);
router.get('/category/:category', getNotesByCategory);
router.get('/:id', getNotesById);

// File serving routes
router.get('/:id/thumbnail', getThumbnail);
router.get('/:id/pdfs/:pdfId', getPDF); // This route includes access control

// User interaction routes
router.post('/:id/view', incrementViewCount);

// Purchase-related routes (require authentication)
router.post('/purchase', authenticateUser, purchaseNotes);
router.post('/verify-payment', authenticateUser, verifyPayment);
router.get('/my-purchases', authenticateUser, getStudentPurchasedNotes);
router.get('/access/:notesId', authenticateUser, checkNotesAccess);

module.exports = router;