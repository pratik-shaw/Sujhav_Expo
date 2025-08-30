const express = require('express');
const router = express.Router();
const {
  upload,
  createTest,
  getTeacherTests,
  getBatchSubjectTests,
  getAvailableStudentsForTest,
  updateTest,
  deleteTest,
  updateStudentMarks,
  downloadPdf,
  getStudentSubjectReports,
  getComprehensiveUserReports,
  downloadQuestionPdfForStudent,
  downloadAnswerPdfForStudent,
  getTeacherSubjectsForBatch
} = require('../controllers/testController');

// Import authentication middleware
const { verifyToken, verifyTeacher, verifyStudent } = require('../middlewares/authMiddleware');

// ====== TEACHER ROUTES ======
// All teacher routes are prefixed with /teacher and require teacher authentication

// Teacher Test CRUD operations
router.post('/teacher/', verifyTeacher, upload, createTest);
router.get('/teacher/my-tests', verifyTeacher, getTeacherTests);
router.get('/teacher/batch/:batchId/subject/:subjectName', verifyTeacher, getBatchSubjectTests);
router.put('/teacher/:id', verifyTeacher, upload, updateTest);
router.delete('/teacher/:id', verifyTeacher, deleteTest);

// Teacher Student Management
router.put('/teacher/:id/marks', verifyTeacher, updateStudentMarks);
router.get('/teacher/batch/:batchId/class/:className/subject/:subjectName/students', verifyTeacher, getAvailableStudentsForTest);

// Teacher PDF Downloads
router.get('/teacher/:id/pdf/:type', verifyTeacher, downloadPdf);

// ====== STUDENT ROUTES ======
// All student routes are prefixed with /student and require student authentication

// Student Reports
router.get('/student/subject-reports', verifyStudent, getStudentSubjectReports);

// Student PDF Downloads
router.get('/student/test/:id/question-pdf', verifyStudent, downloadQuestionPdfForStudent);
router.get('/student/test/:id/answer-pdf', verifyStudent, downloadAnswerPdfForStudent);

// ====== USER ROUTES ======
// These routes check user authentication and work for both teachers and students

router.get('/user/comprehensive-reports', verifyToken, getComprehensiveUserReports);

// ====== LEGACY ROUTES (for backward compatibility) ======
// These routes maintain compatibility with your existing frontend code
// They all require teacher authentication

router.post('/', verifyTeacher, upload, createTest);
router.get('/my-tests', verifyTeacher, getTeacherTests);
router.get('/batch/:batchId/subject/:subjectName', verifyTeacher, getBatchSubjectTests);
router.put('/:id', verifyTeacher, upload, updateTest);
router.delete('/:id', verifyTeacher, deleteTest);
router.put('/:id/marks', verifyTeacher, updateStudentMarks);
router.get('/batch/:batchId/class/:className/subject/:subjectName/students', verifyTeacher, getAvailableStudentsForTest);
router.get('/:id/pdf/:type', verifyTeacher, downloadPdf);

// Additional legacy routes for student functionality
router.get('/student-reports', verifyStudent, getStudentSubjectReports);
router.get('/comprehensive-reports', verifyToken, getComprehensiveUserReports);
router.get('/:id/question-pdf', verifyStudent, downloadQuestionPdfForStudent);
router.get('/:id/answer-pdf', verifyStudent, downloadAnswerPdfForStudent);

router.get('/teacher/batch/:batchId/subjects', verifyTeacher, getTeacherSubjectsForBatch);

// Fix the route pattern to match what the frontend expects
router.get('/batch/:batchId/students/:className/:subjectName', verifyTeacher, getAvailableStudentsForTest);

// Also keep the existing pattern for backward compatibility
router.get('/batch/:batchId/class/:className/subject/:subjectName/students', verifyTeacher, getAvailableStudentsForTest);

module.exports = router;