const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Routes
const authRoutes = require('./routes/authRoutes');
const unpaidCourseRoutes = require('./routes/unpaidCourseRoutes');
const paidCourseRoutes = require('./routes/paidCourseRoutes');
const paidNotesRoutes = require('./routes/paidNotesRoutes');
const unpaidNotesRoutes = require('./routes/unpaidNotesRoutes');
const paidMaterialsRoutes = require('./routes/paidMaterialsRoutes');
const enrollmentRoutes = require('./routes/enrollmentRoutes');
const purchasedNotesRoutes = require('./routes/purchasedNotesRoutes');
const dppRoutes = require('./routes/dppRoutes');
const batchRoutes = require('./routes/batchRoutes');
const testRoutes = require('./routes/testRoutes');
const eventRoutes = require('./routes/eventRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const studentRoutes = require('./routes/studentRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/unpaidCourses', unpaidCourseRoutes);
app.use('/api/paidCourses', paidCourseRoutes);
app.use('/api/paidNotes', paidNotesRoutes);
app.use('/api/unpaidNotes', unpaidNotesRoutes);
app.use('/api/paidMaterials', paidMaterialsRoutes);
app.use('/api/enrollment', enrollmentRoutes);
app.use('/api/purchasedNotes', purchasedNotesRoutes);
app.use('/api/dpp', dppRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/calendar', eventRoutes);
app.use('/api/attendance', attendanceRoutes);
// Fix: Change from '/api/student' to '/api/students' to match frontend
app.use('/api/students', studentRoutes);

// Static file serving
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));

// Database connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.log('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));