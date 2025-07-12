const express = require('express');
const router = express.Router();
const {
  createBatch,
  getAllBatches,
  getBatchById,
  updateBatch,
  deleteBatch,
  assignStudentsToBatch,
  assignTeachersToBatch,
  removeStudentsFromBatch,
  removeTeachersFromBatch,
  getEligibleStudents,
  getEligibleTeachers,
  getAvailableStudentsForBatch,
  getAvailableTeachersForBatch,
  getBatchesByCategory,
  getTeacherBatches,        // Add this
  getTeacherBatchById       // Add this
} = require('../controllers/batchController');

// Import authentication middleware
const { verifyToken, verifyAdmin } = require('../middlewares/authMiddleware');

// Admin-only routes (require admin authentication)
router.post('/', verifyAdmin, createBatch);
router.put('/:id', verifyAdmin, updateBatch);
router.delete('/:id', verifyAdmin, deleteBatch);

// Student and Teacher assignment routes (Admin only)
router.post('/:id/assign-students', verifyAdmin, assignStudentsToBatch);
router.post('/:id/assign-teachers', verifyAdmin, assignTeachersToBatch);
router.delete('/:id/remove-students', verifyAdmin, removeStudentsFromBatch);
router.delete('/:id/remove-teachers', verifyAdmin, removeTeachersFromBatch);

// Routes to get eligible users (Admin only)
router.get('/eligible-students', verifyAdmin, getEligibleStudents);
router.get('/eligible-teachers', verifyAdmin, getEligibleTeachers);

// Routes to get available users for specific batch (Admin only)
router.get('/:id/available-students', verifyAdmin, getAvailableStudentsForBatch);
router.get('/:id/available-teachers', verifyAdmin, getAvailableTeachersForBatch);

// Public routes (accessible by authenticated users)
router.get('/', verifyToken, getAllBatches);
router.get('/category/:category', verifyToken, getBatchesByCategory);
router.get('/:id', verifyToken, getBatchById); // This should be last among GET routes

router.get('/teacher/my-batches', verifyToken, getTeacherBatches); // Get all batches assigned to logged-in teacher
router.get('/teacher/batch/:id', verifyToken, getTeacherBatchById); // Get specific batch details for teacher

module.exports = router;