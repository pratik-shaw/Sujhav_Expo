const express = require('express');
const router = express.Router();
const {
  markAttendance,
  getAttendanceByDate,
  getSubjectAttendance,
  getStudentStats,
  getStudentsForAttendance
} = require('../controllers/attendanceController');

const { verifyToken, verifyTeacher } = require('../middlewares/authMiddleware');

// Mark attendance (Teacher only)
router.post('/mark', verifyTeacher, markAttendance);

// Get students for attendance marking
router.get('/students/:batchId/:subject', verifyTeacher, getStudentsForAttendance);

// Get attendance for specific date and subject
router.get('/date/:batchId/:subject/:date', verifyTeacher, getAttendanceByDate);

// Get all attendance records for a subject (with optional date range)
router.get('/subject/:batchId/:subject', verifyTeacher, getSubjectAttendance);

// Get student attendance statistics
router.get('/stats/:batchId/:subject/:studentId', verifyTeacher, getStudentStats);

module.exports = router;