const express = require('express');
const router = express.Router();
const {
  createEvent,
  getBatchEvents,
  updateEvent,
  deleteEvent,
  getTeacherEvents,
  getStudentEvents
} = require('../controllers/eventController');

const { verifyToken } = require('../middlewares/authMiddleware');

// Teacher routes (only teachers can create/update/delete events)
router.post('/events', verifyToken, createEvent);
router.put('/events/:eventId', verifyToken, updateEvent);
router.delete('/events/:eventId', verifyToken, deleteEvent);

// Get teacher's all events
router.get('/teacher/my-events', verifyToken, getTeacherEvents);

// Get student's all events from assigned batches
router.get('/student/my-events', verifyToken, getStudentEvents);

// Get events for a specific batch (both teachers and students can access)
router.get('/events/:batchId', verifyToken, getBatchEvents);

module.exports = router;