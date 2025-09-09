const express = require('express');
const router = express.Router();
const { getStudentAttendanceRecords } = require('../controllers/attendanceController');
const { verifyToken } = require('../middlewares/authMiddleware');

// Get student's own attendance records
router.get('/attendance-records', verifyToken, getStudentAttendanceRecords);

module.exports = router;