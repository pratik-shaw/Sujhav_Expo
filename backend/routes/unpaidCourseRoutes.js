// Updated routes/unpaidCourseRoutes.js

const express = require('express');
const router = express.Router();
const unpaidCourseController = require('../controllers/unpaidCourseController');
const { verifyToken, verifyAdmin } = require('../middlewares/authMiddleware');

// Public routes (accessible to all users)
router.get('/', unpaidCourseController.getAllCourses);
router.get('/category/:category', unpaidCourseController.getCoursesByCategory);
router.get('/:id', unpaidCourseController.getCourseById);

// Protected routes (require authentication)
router.post('/:id/enroll', verifyToken, unpaidCourseController.enrollInCourse);
router.delete('/:id/unenroll', verifyToken, unpaidCourseController.unenrollFromCourse);
router.get('/user/enrolled', verifyToken, unpaidCourseController.getUserEnrolledCourses);

// Admin routes (require admin privileges)
router.post('/', verifyAdmin, unpaidCourseController.createCourse);
router.put('/:id', verifyAdmin, unpaidCourseController.updateCourse);
router.delete('/:id', verifyAdmin, unpaidCourseController.deleteCourse);

// Admin route to get all courses (including inactive)
router.get('/admin/all', verifyAdmin, unpaidCourseController.getAllCoursesAdmin || unpaidCourseController.getAllCourses);

// Video lecture management routes (Admin only)
router.post('/:id/lectures', verifyAdmin, unpaidCourseController.addVideoLecture);
router.put('/:courseId/lectures/:lectureId', verifyAdmin, unpaidCourseController.updateVideoLecture);
router.delete('/:courseId/lectures/:lectureId', verifyAdmin, unpaidCourseController.deleteVideoLecture);

module.exports = router;