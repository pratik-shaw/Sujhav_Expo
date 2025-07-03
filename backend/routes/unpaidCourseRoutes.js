// routes/unpaidCourseRoutes.js
const express = require('express');
const router = express.Router();
const {
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  addVideoToCourse,
  enrollStudent,
  getCoursesByCategory
} = require('../controllers/unpaidCourseController');

// Note: You'll need to implement authentication middleware
// const { authenticateAdmin, authenticateUser } = require('../middleware/auth');

// Admin routes (require admin authentication)
router.post('/', createCourse); // authenticateAdmin middleware should be added
router.put('/:id', updateCourse); // authenticateAdmin middleware should be added
router.delete('/:id', deleteCourse); // authenticateAdmin middleware should be added
router.post('/:id/videos', addVideoToCourse); // authenticateAdmin middleware should be added

// Public routes (accessible by users)
router.get('/', getAllCourses);
router.get('/:id', getCourseById);
router.get('/category/:category', getCoursesByCategory);

// User routes (require user authentication)
router.post('/:id/enroll', enrollStudent); // authenticateUser middleware should be added

module.exports = router;