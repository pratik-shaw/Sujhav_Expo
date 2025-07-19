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
// PDF access route - authentication optional for free notes, required for paid notes
// Access control is handled inside the getPDF controller function
router.get('/:id/pdfs/:pdfId', authenticateUser, getPDF);

// User interaction routes
router.post('/:id/view', incrementViewCount);

module.exports = router;