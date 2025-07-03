const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PaidCourse = require('../models/PaidCourse'); // Import your model

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/paid-course-thumbnails';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `paid-course-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Allow only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Create a new paid course
const createCourse = async (req, res) => {
  try {
    console.log('Creating paid course with body:', req.body);
    console.log('File uploaded:', req.file);

    const {
      courseTitle,
      tutor,
      rating,
      price,
      category,
      class: courseClass,
      courseDetails,
      videoLinks,
      isActive
    } = req.body;

    // Validate required fields
    if (!courseTitle || !tutor || !courseClass || !price) {
      return res.status(400).json({
        success: false,
        message: 'Course title, tutor, class, and price are required'
      });
    }

    // Validate price for paid courses
    if (parseFloat(price) < 1) {
      return res.status(400).json({
        success: false,
        message: 'Price must be at least 1 for paid courses'
      });
    }

    // Validate required thumbnail
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Course thumbnail is required'
      });
    }

    // Parse JSON fields
    let parsedCourseDetails;
    let parsedVideoLinks;
    
    try {
      parsedCourseDetails = typeof courseDetails === 'string' 
        ? JSON.parse(courseDetails) 
        : courseDetails;
      parsedVideoLinks = typeof videoLinks === 'string' 
        ? JSON.parse(videoLinks) 
        : videoLinks || [];
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid JSON format in courseDetails or videoLinks'
      });
    }

    // Validate courseDetails structure
    if (!parsedCourseDetails || !parsedCourseDetails.subtitle || !parsedCourseDetails.description) {
      return res.status(400).json({
        success: false,
        message: 'Course details must include subtitle and description'
      });
    }

    // Handle thumbnail
    const thumbnailPath = `/uploads/paid-course-thumbnails/${req.file.filename}`;

    // Create course object
    const courseData = {
      courseTitle: courseTitle.trim(),
      tutor: tutor.trim(),
      rating: parseFloat(rating) || 0,
      price: parseFloat(price),
      category: category || 'jee',
      class: courseClass.trim(),
      courseDetails: parsedCourseDetails,
      videoLinks: parsedVideoLinks,
      courseThumbnail: thumbnailPath,
      thumbnailMetadata: {
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
        uploadedAt: new Date()
      },
      isActive: isActive === 'true' || isActive === true,
      studentsEnrolled: []
    };

    // Save to MongoDB
    const newCourse = new PaidCourse(courseData);
    const savedCourse = await newCourse.save();
    
    console.log('Paid course created successfully:', savedCourse);

    res.status(201).json({
      success: true,
      message: 'Paid course created successfully',
      data: savedCourse
    });

  } catch (error) {
    console.error('Error creating paid course:', error);
    
    // Delete uploaded file if there was an error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting uploaded file:', unlinkError);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get all paid courses
const getAllCourses = async (req, res) => {
  try {
    const courses = await PaidCourse.find().sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: courses,
      count: courses.length
    });
  } catch (error) {
    console.error('Error fetching paid courses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch paid courses',
      error: error.message
    });
  }
};

// Get course by ID
const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const course = await PaidCourse.findById(id);
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Paid course not found'
      });
    }

    res.json({
      success: true,
      data: course
    });
  } catch (error) {
    console.error('Error fetching paid course:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch paid course',
      error: error.message
    });
  }
};

// Update course
const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      courseTitle,
      tutor,
      rating,
      price,
      category,
      class: courseClass,
      courseDetails,
      videoLinks,
      isActive
    } = req.body;

    // Find course
    const course = await PaidCourse.findById(id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Paid course not found'
      });
    }

    // Validate price if provided
    if (price !== undefined && parseFloat(price) < 1) {
      return res.status(400).json({
        success: false,
        message: 'Price must be at least 1 for paid courses'
      });
    }

    // Parse JSON fields
    let parsedCourseDetails;
    let parsedVideoLinks;
    
    try {
      parsedCourseDetails = typeof courseDetails === 'string' 
        ? JSON.parse(courseDetails) 
        : courseDetails;
      parsedVideoLinks = typeof videoLinks === 'string' 
        ? JSON.parse(videoLinks) 
        : videoLinks;
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid JSON format in courseDetails or videoLinks'
      });
    }

    // Prepare update data
    const updateData = {};
    
    if (courseTitle) updateData.courseTitle = courseTitle.trim();
    if (tutor) updateData.tutor = tutor.trim();
    if (rating !== undefined) updateData.rating = parseFloat(rating);
    if (price !== undefined) updateData.price = parseFloat(price);
    if (category) updateData.category = category;
    if (courseClass) updateData.class = courseClass.trim();
    if (parsedCourseDetails) updateData.courseDetails = parsedCourseDetails;
    if (parsedVideoLinks) updateData.videoLinks = parsedVideoLinks;
    if (isActive !== undefined) updateData.isActive = isActive === 'true' || isActive === true;

    // Handle thumbnail update
    if (req.file) {
      // Delete old thumbnail
      if (course.courseThumbnail) {
        const oldThumbnailPath = path.join(__dirname, '..', course.courseThumbnail);
        if (fs.existsSync(oldThumbnailPath)) {
          fs.unlinkSync(oldThumbnailPath);
        }
      }
      
      updateData.courseThumbnail = `/uploads/paid-course-thumbnails/${req.file.filename}`;
      updateData.thumbnailMetadata = {
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
        uploadedAt: new Date()
      };
    }

    // Update course
    const updatedCourse = await PaidCourse.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Paid course updated successfully',
      data: updatedCourse
    });

  } catch (error) {
    console.error('Error updating paid course:', error);
    
    // Delete uploaded file if there was an error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting uploaded file:', unlinkError);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update paid course',
      error: error.message
    });
  }
};

// Delete course
const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;
    
    const course = await PaidCourse.findById(id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Paid course not found'
      });
    }

    // Delete thumbnail file
    if (course.courseThumbnail) {
      const thumbnailPath = path.join(__dirname, '..', course.courseThumbnail);
      if (fs.existsSync(thumbnailPath)) {
        fs.unlinkSync(thumbnailPath);
      }
    }

    // Delete course
    await PaidCourse.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Paid course deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting paid course:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete paid course',
      error: error.message
    });
  }
};

// Add video to course
const addVideoToCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { videoTitle, videoDescription, videoLink, duration } = req.body;

    // Validate required fields
    if (!videoTitle || !videoDescription || !videoLink || !duration) {
      return res.status(400).json({
        success: false,
        message: 'All video fields are required'
      });
    }

    // Find course
    const course = await PaidCourse.findById(id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Paid course not found'
      });
    }

    // Create new video
    const newVideo = {
      videoTitle: videoTitle.trim(),
      videoDescription: videoDescription.trim(),
      videoLink: videoLink.trim(),
      duration: duration.trim()
    };

    // Add video to course
    course.videoLinks.push(newVideo);
    const updatedCourse = await course.save();

    res.json({
      success: true,
      message: 'Video added successfully',
      data: updatedCourse
    });

  } catch (error) {
    console.error('Error adding video:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add video',
      error: error.message
    });
  }
};

// Update video in course
const updateVideoInCourse = async (req, res) => {
  try {
    const { id, videoId } = req.params;
    const { videoTitle, videoDescription, videoLink, duration } = req.body;

    // Find course
    const course = await PaidCourse.findById(id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Paid course not found'
      });
    }

    // Find video
    const video = course.videoLinks.id(videoId);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    // Update video
    if (videoTitle) video.videoTitle = videoTitle.trim();
    if (videoDescription) video.videoDescription = videoDescription.trim();
    if (videoLink) video.videoLink = videoLink.trim();
    if (duration) video.duration = duration.trim();

    const updatedCourse = await course.save();

    res.json({
      success: true,
      message: 'Video updated successfully',
      data: updatedCourse
    });

  } catch (error) {
    console.error('Error updating video:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update video',
      error: error.message
    });
  }
};

// Delete video from course
const deleteVideoFromCourse = async (req, res) => {
  try {
    const { id, videoId } = req.params;

    // Find course
    const course = await PaidCourse.findById(id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Paid course not found'
      });
    }

    // Remove video
    course.videoLinks.pull(videoId);
    const updatedCourse = await course.save();

    res.json({
      success: true,
      message: 'Video deleted successfully',
      data: updatedCourse
    });

  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete video',
      error: error.message
    });
  }
};

// Get courses by category
const getCoursesByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const courses = await PaidCourse.find({ 
      category: category.toLowerCase(),
      isActive: true 
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: courses,
      count: courses.length
    });
  } catch (error) {
    console.error('Error fetching paid courses by category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch paid courses by category',
      error: error.message
    });
  }
};

// Enroll student (for future payment integration)
const enrollStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { studentId, mode, schedule } = req.body;

    // TODO: Add payment verification here when Razorpay is integrated
    
    // Validate required fields
    if (!studentId || !mode || !schedule) {
      return res.status(400).json({
        success: false,
        message: 'Student ID, mode, and schedule are required'
      });
    }

    // Find course
    const course = await PaidCourse.findById(id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Paid course not found'
      });
    }

    // Check if student is already enrolled
    const existingEnrollment = course.studentsEnrolled.find(
      enrollment => enrollment.studentId.toString() === studentId
    );

    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: 'Student already enrolled'
      });
    }

    // Add student to enrolled list
    course.studentsEnrolled.push({
      studentId,
      mode,
      schedule
    });

    const updatedCourse = await course.save();

    res.json({
      success: true,
      message: 'Student enrolled successfully',
      data: updatedCourse
    });

  } catch (error) {
    console.error('Error enrolling student:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to enroll student',
      error: error.message
    });
  }
};

module.exports = {
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  addVideoToCourse,
  updateVideoInCourse,
  deleteVideoFromCourse,
  enrollStudent,
  getCoursesByCategory,
  upload
};