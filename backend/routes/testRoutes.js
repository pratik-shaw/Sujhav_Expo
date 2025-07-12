const express = require('express');
const router = express.Router();
const {
  upload,
  createTest,
  getTeacherTests,
  getBatchTests,
  getTestById,
  updateTest,
  deleteTest,
  updateStudentMarks,
  getAvailableStudentsForTest,
  downloadPdf
} = require('../controllers/testController');

// Import authentication middleware
const { verifyToken, verifyTeacher } = require('../middlewares/authMiddleware');

// All routes require teacher authentication
router.use(verifyTeacher);

// Test CRUD operations
router.post('/', upload, createTest);
router.get('/my-tests', getTeacherTests);
router.get('/batch/:batchId', getBatchTests);
router.get('/:id', getTestById);
router.put('/:id', upload, updateTest);
router.delete('/:id', deleteTest);

// Student marks management
router.put('/:id/marks', updateStudentMarks);

// Helper routes
router.get('/batch/:batchId/available-students', getAvailableStudentsForTest);

// PDF download routes
router.get('/:id/pdf/:type', downloadPdf);

module.exports = router;