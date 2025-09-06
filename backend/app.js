// app.js
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
const paidNotesRoutes = require('./routes/paidNotesRoutes'); // New route
const unpaidNotesRoutes = require('./routes/unpaidNotesRoutes'); // Unpaid notes route
const paidMaterialsRoutes = require('./routes/paidMaterialsRoutes'); // Paid materials route
const enrollmentRoutes = require('./routes/enrollmentRoutes'); // Uncomment if needed
const purchasedNotesRoutes = require('./routes/purchasedNotesRoutes'); // Uncomment if needed
const dppRoutes = require('./routes/dppRoutes'); // Uncomment if needed
const batchRoutes = require('./routes/batchRoutes'); // Batch routes
const testRoutes = require('./routes/testRoutes');
const eventRoutes = require('./routes/eventRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/unpaidCourses', unpaidCourseRoutes);
app.use('/api/paidCourses', paidCourseRoutes);
app.use('/api/paidNotes', paidNotesRoutes); // New route
app.use('/api/unpaidNotes', unpaidNotesRoutes); // Unpaid notes route
app.use('/api/paidMaterials', paidMaterialsRoutes); // Paid materials route
app.use('/api/enrollment', enrollmentRoutes); // Uncomment if needed
app.use('/api/purchasedNotes', purchasedNotesRoutes); // Uncomment if needed
app.use('/api/dpp', dppRoutes); // Uncomment if needed
app.use('/api/batches', batchRoutes); // Batch routes
app.use('/api/tests', testRoutes);
// Fix: Change the route mounting to match frontend expectations
app.use('/api/calendar', eventRoutes); // Changed from '/api/events' to '/api/calendar'

// Static file serving
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));

// Database connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.log('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));