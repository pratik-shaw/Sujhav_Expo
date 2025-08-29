const express = require('express');
const router = express.Router();
const {
  createBatch,
  getAllBatches,
  getBatchById,
  updateBatch,
  deleteBatch,
  assignStudentsToBatch,
  assignStudentsEnhanced,
  removeStudentsFromBatch,
  assignTeachersEnhanced,
  assignTeacherToSubject,
  getEligibleStudents,
  getAllTeachers,
  getBatchesByCategory,
  getTeacherBatches,
  getTeacherBatchById,
  getBatchStatistics,
  getStudentsWithAssignments,
  getTeachersWithAssignments
} = require('../controllers/batchController');

const { verifyToken, verifyAdmin } = require('../middlewares/authMiddleware');

// Admin-only routes
router.post('/', verifyAdmin, createBatch);
router.put('/:id', verifyAdmin, updateBatch);
router.delete('/:id', verifyAdmin, deleteBatch);

// Student assignment routes (Admin only) - FIXED
router.post('/:id/assign-students', verifyAdmin, assignStudentsToBatch);
router.post('/:id/assign-students-enhanced', verifyAdmin, assignStudentsEnhanced);
// FIXED: Changed to POST to match frontend expectation
router.post('/:id/remove-students', verifyAdmin, removeStudentsFromBatch);

// Teacher assignment routes (Admin only)
router.post('/:id/assign-teachers-enhanced', verifyAdmin, assignTeachersEnhanced);
router.put('/:id/subjects/:subjectId/assign-teacher', verifyAdmin, assignTeacherToSubject);

// Enhanced management routes (Admin only)
router.get('/:batchId/students-assignments', verifyAdmin, getStudentsWithAssignments);
router.get('/:batchId/teachers-assignments', verifyAdmin, getTeachersWithAssignments);
router.get('/:id/statistics', verifyAdmin, getBatchStatistics);

// Get users for assignment (Admin only)
router.get('/eligible-students', verifyAdmin, getEligibleStudents);
router.get('/all-teachers', verifyAdmin, getAllTeachers);

// Public routes (authenticated users)
router.get('/', verifyToken, getAllBatches);
router.get('/category/:category', verifyToken, getBatchesByCategory);
router.get('/:id', verifyToken, getBatchById);

// Teacher-specific routes
router.get('/teacher/my-batches', verifyToken, getTeacherBatches);
router.get('/teacher/batch/:id', verifyToken, getTeacherBatchById);

module.exports = router;