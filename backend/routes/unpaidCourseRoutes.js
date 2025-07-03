const express = require('express');
const router = express.Router();
const {
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  addVideoToCourse,
  updateVideoInCourse,
  deleteVideoFromCourse,
  enrollStudent,
  getCoursesByCategory,
  getFreeCourses,
  upload
} = require('../controllers/unpaidCourseController');

// Note: Add authentication middleware as needed
// const { authenticateAdmin, authenticateUser } = require('../middleware/auth');

// Admin routes (require admin authentication)
router.post('/', upload.single('thumbnail'), createCourse);
router.put('/:id', upload.single('thumbnail'), updateCourse);
router.delete('/:id', deleteCourse);

// Video management routes (Admin only)
router.post('/:id/videos', addVideoToCourse);
router.put('/:id/videos/:videoId', updateVideoInCourse);
router.delete('/:id/videos/:videoId', deleteVideoFromCourse);

// Public routes (accessible by users)
router.get('/', getAllCourses);
router.get('/free', getFreeCourses);
router.get('/category/:category', getCoursesByCategory);
router.get('/:id', getCourseById); // This should be last among GET routes

// User routes (require user authentication)
router.post('/:id/enroll', enrollStudent);

module.exports = router;