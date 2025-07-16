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
  assignStudentsToTest,
  downloadPdf,
  // Student report functions
  getStudentReports,
  getStudentMonthlyAnalytics,
  getStudentTestById,
  getStudentBatchPerformance,
  downloadQuestionPdfForStudent,
  downloadAnswerPdfForStudent, // New function added
  // New functions
  checkUserBatchAssignment,
  getComprehensiveUserReports
} = require('../controllers/testController');

// Import authentication middleware
const { verifyToken, verifyTeacher, verifyStudent } = require('../middlewares/authMiddleware');

// ====== TEACHER ROUTES ======
// All teacher routes are prefixed with /teacher and require teacher authentication

// Teacher Test CRUD operations
router.post('/teacher/', verifyTeacher, upload, createTest);
router.get('/teacher/my-tests', verifyTeacher, getTeacherTests);
router.get('/teacher/batch/:batchId', verifyTeacher, getBatchTests);
router.get('/teacher/:id', verifyTeacher, getTestById);
router.put('/teacher/:id', verifyTeacher, upload, updateTest);
router.delete('/teacher/:id', verifyTeacher, deleteTest);

// Teacher Student Management
router.put('/teacher/:id/assign-students', verifyTeacher, assignStudentsToTest);
router.put('/teacher/:id/marks', verifyTeacher, updateStudentMarks);
router.get('/teacher/batch/:batchId/available-students', verifyTeacher, getAvailableStudentsForTest);

// Teacher PDF Downloads
router.get('/teacher/:id/pdf/:type', verifyTeacher, downloadPdf);

// ====== STUDENT ROUTES ======
// All student routes are prefixed with /student and require student authentication

router.get('/student/my-reports', verifyStudent, getStudentReports);
router.get('/student/monthly-analytics', verifyStudent, getStudentMonthlyAnalytics);
router.get('/student/batch-performance', verifyStudent, getStudentBatchPerformance);
router.get('/student/test/:id', verifyStudent, getStudentTestById);

// Student PDF Downloads
router.get('/student/test/:id/question-pdf', verifyStudent, downloadQuestionPdfForStudent);
router.get('/student/test/:id/answer-pdf', verifyStudent, downloadAnswerPdfForStudent); // New route added

// ====== USER ROUTES ======
// These routes check user authentication and batch assignment

router.get('/user/check-batch-assignment', verifyToken, checkUserBatchAssignment);
router.get('/user/comprehensive-reports', verifyToken, getComprehensiveUserReports);

// ====== LEGACY ROUTES (for backward compatibility) ======
// These routes maintain compatibility with your existing frontend code
// They all require teacher authentication

router.post('/', verifyTeacher, upload, createTest);
router.get('/my-tests', verifyTeacher, getTeacherTests);
router.get('/batch/:batchId', verifyTeacher, getBatchTests);
router.get('/:id', verifyTeacher, getTestById);
router.put('/:id', verifyTeacher, upload, updateTest);
router.delete('/:id', verifyTeacher, deleteTest);
router.put('/:id/assign-students', verifyTeacher, assignStudentsToTest);
router.put('/:id/marks', verifyTeacher, updateStudentMarks);
router.get('/batch/:batchId/available-students', verifyTeacher, getAvailableStudentsForTest);
router.get('/:id/pdf/:type', verifyTeacher, downloadPdf);

module.exports = router;