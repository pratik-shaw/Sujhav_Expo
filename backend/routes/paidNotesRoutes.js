// routes/paidNotesRoutes.js
const express = require('express');
const router = express.Router();
const {
  createNotes,
  getAllNotes,
  getNotesById,
  updateNotes,
  deleteNotes,
  addPDFToNotes,
  updatePDFInNotes,
  deletePDFFromNotes,
  enrollStudent,
  getNotesByCategory,
  thumbnailUpload,
  pdfUpload
} = require('../controllers/paidNotesController');

// Note: Add authentication middleware as needed
// const { authenticateAdmin, authenticateUser } = require('../middleware/auth');

// Admin routes (require admin authentication)
router.post('/', thumbnailUpload.single('thumbnail'), createNotes);
router.put('/:id', thumbnailUpload.single('thumbnail'), updateNotes);
router.delete('/:id', deleteNotes);

// PDF management routes (Admin only)
router.post('/:id/pdfs', pdfUpload.single('pdf'), addPDFToNotes);
router.put('/:id/pdfs/:pdfId', pdfUpload.single('pdf'), updatePDFInNotes);
router.delete('/:id/pdfs/:pdfId', deletePDFFromNotes);

// Public routes (accessible by users)
router.get('/', getAllNotes);
router.get('/category/:category', getNotesByCategory);
router.get('/:id', getNotesById); // This should be last among GET routes

// User routes (require user authentication and payment)
router.post('/:id/enroll', enrollStudent);

module.exports = router;