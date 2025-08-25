const express = require('express');
const router = express.Router();
const {
  createBatch,
  getAllBatches,
  getBatchById,
  updateBatch,
  deleteBatch,
  assignStudentsToBatch,
  assignTeacherToSubject,
  removeStudentsFromBatch,
  getEligibleStudents,
  getAllTeachers,
  getBatchesByCategory,
  getTeacherBatches,
  getTeacherBatchById,
  // New enhanced functions
  getStudentsWithAssignments,
  getTeachersWithAssignments,
  assignStudentsToBatchEnhanced,
  assignTeachersToSubjectsEnhanced,
  getBatchStatistics
} = require('../controllers/batchController');
const { verifyToken, verifyAdmin } = require('../middlewares/authMiddleware');

// Admin-only routes
router.post('/', verifyAdmin, createBatch);
router.put('/:id', verifyAdmin, updateBatch);
router.delete('/:id', verifyAdmin, deleteBatch);

// Enhanced assignment routes (Admin only)
router.get('/:batchId/students-assignments', verifyAdmin, getStudentsWithAssignments);
router.get('/:batchId/teachers-assignments', verifyAdmin, getTeachersWithAssignments);
router.post('/:id/assign-students-enhanced', verifyAdmin, assignStudentsToBatchEnhanced);
router.post('/:id/assign-teachers-enhanced', verifyAdmin, assignTeachersToSubjectsEnhanced);

// Batch statistics
router.get('/:id/statistics', verifyAdmin, getBatchStatistics);

// Student assignment routes (Admin only) - Keep existing
router.post('/:id/assign-students', verifyAdmin, assignStudentsToBatch);
router.delete('/:id/remove-students', verifyAdmin, removeStudentsFromBatch);

// Teacher-subject assignment (Admin only) - Keep existing
router.put('/:id/subjects/:subjectId/assign-teacher', verifyAdmin, assignTeacherToSubject);

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