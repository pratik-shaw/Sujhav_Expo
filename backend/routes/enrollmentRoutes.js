// routes/enrollmentRoutes.js
const express = require('express');
const router = express.Router();
const {
  enrollInCourse,
  verifyPaymentAndEnroll,
  getStudentEnrollments,
  getEnrollmentDetails,
  updateVideoProgress,
  cancelEnrollment,
  checkCourseAccess
} = require('../controllers/enrollmentController');

// Import authentication middleware
const { authenticateUser } = require('../middlewares/auth');

// Apply authentication middleware to all routes
router.use(authenticateUser);

// Enroll in a course
router.post('/enroll', enrollInCourse);

// Verify payment and complete enrollment
router.post('/verify-payment', verifyPaymentAndEnroll);

// Get student's enrollments
router.get('/my-enrollments', getStudentEnrollments);

// Get specific enrollment details
router.get('/:enrollmentId', getEnrollmentDetails);

// Update video progress
router.put('/:enrollmentId/progress', updateVideoProgress);

// Cancel enrollment (for pending enrollments)
router.delete('/:enrollmentId/cancel', cancelEnrollment);

// Check if student has access to a course
router.get('/access/:courseId', checkCourseAccess);

module.exports = router;