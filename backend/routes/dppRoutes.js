// routes/dppRoutes.js
const express = require('express');
const router = express.Router();
const {
  createDPP,
  getAllDPPs,
  getDPPById,
  getQuestionPDF,
  getAnswerPDF,
  updateDPP,
  deleteDPP,
  getDPPsByCategory,
  getDPPsByClass,
  incrementViewCount,
  toggleAnswerAccessibility,
  pdfUpload
} = require('../controllers/dppController');

// Admin routes (require admin authentication)
// Create DPP with both question and answer PDFs
router.post('/', (req, res, next) => {
  pdfUpload.fields([
    { name: 'questionPDF', maxCount: 1 },
    { name: 'answerPDF', maxCount: 1 }
  ])(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload error'
      });
    }
    next();
  });
}, createDPP);

// Update DPP with optional file updates
router.put('/:id', (req, res, next) => {
  pdfUpload.fields([
    { name: 'questionPDF', maxCount: 1 },
    { name: 'answerPDF', maxCount: 1 }
  ])(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload error'
      });
    }
    next();
  });
}, updateDPP);

// Delete DPP
router.delete('/:id', deleteDPP);

// Toggle answer accessibility (Admin only)
router.patch('/:id/toggle-answer', toggleAnswerAccessibility);

// Public routes (accessible by users)
// Get all DPPs with filters
router.get('/', getAllDPPs);

// Get DPPs by category
router.get('/category/:category', getDPPsByCategory);

// Get DPPs by class
router.get('/class/:class', getDPPsByClass);

// Get specific DPP by ID
router.get('/:id', getDPPById);

// PDF serving routes
// Get question PDF (if question is active)
router.get('/:id/question-pdf', getQuestionPDF);

// Get answer PDF (only if answer is active)
router.get('/:id/answer-pdf', getAnswerPDF);

// User interaction routes
// Increment view count
router.post('/:id/view', incrementViewCount);

module.exports = router;