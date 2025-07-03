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

app.use('/api/auth', authRoutes);
app.use('/api/unpaidCourses', unpaidCourseRoutes);
app.use('/api/paidCourses', paidCourseRoutes);

// Static file serving
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.log('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));