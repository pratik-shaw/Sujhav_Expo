const express = require('express');
const router = express.Router();
const {
  markAttendance,
  getAttendanceByDate,
  getSubjectAttendance,
  getStudentStats,
  getStudentsForAttendance,
  getStudentAttendanceRecords
} = require('../controllers/attendanceController');
const { verifyToken, verifyTeacher, verifyStudent } = require('../middlewares/authMiddleware');

// TEACHER ROUTES
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

// STUDENT ROUTES
// Get student's own attendance records
router.get('/student-records', verifyToken, getStudentAttendanceRecords);

module.exports = router;