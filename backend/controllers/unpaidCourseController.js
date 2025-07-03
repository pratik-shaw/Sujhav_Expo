const UnpaidCourse = require('../models/UnpaidCourse');
const mongoose = require('mongoose');

// Create a new course (Admin only)
const createCourse = async (req, res) => {
  try {
    const {
      courseTitle,
      tutor,
      rating,
      price,
      category,
      class: courseClass,
      courseDetails,
      videoLinks,
      courseThumbnail,
      isActive
    } = req.body;

    // Validate required fields
    if (!courseTitle || !tutor || !price || !category || !courseClass || !courseDetails || !courseThumbnail) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided'
      });
    }

    // Validate category
    const validCategories = ['jee', 'neet', 'boards'];
    if (!validCategories.includes(category.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category. Must be one of: jee, neet, boards'
      });
    }

    const newCourse = new UnpaidCourse({
      courseTitle,
      tutor,
      rating: rating || 0,
      price,
      category: category.toLowerCase(),
      class: courseClass,
      courseDetails,
      videoLinks: videoLinks || [],
      courseThumbnail,
      isActive: isActive !== undefined ? isActive : true
    });

    const savedCourse = await newCourse.save();

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: savedCourse
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating course',
      error: error.message
    });
  }
};

// Get all courses (with filtering and pagination)
const getAllCourses = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      class: courseClass,
      isActive,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const filter = {};
    
    if (category) filter.category = category.toLowerCase();
    if (courseClass) filter.class = courseClass;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) {
      filter.$or = [
        { courseTitle: { $regex: search, $options: 'i' } },
        { tutor: { $regex: search, $options: 'i' } },
        { 'courseDetails.description': { $regex: search, $options: 'i' } }
      ];
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const courses = await UnpaidCourse.find(filter)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const totalCourses = await UnpaidCourse.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: courses,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCourses / limit),
        totalCourses,
        hasNextPage: page < Math.ceil(totalCourses / limit),
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching courses',
      error: error.message
    });
  }
};

// Get course by ID
const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid course ID'
      });
    }

    const course = await UnpaidCourse.findById(id).populate('studentsEnrolled.studentId', 'name email');

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    res.status(200).json({
      success: true,
      data: course
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching course',
      error: error.message
    });
  }
};

// Update course (Admin only)
const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid course ID'
      });
    }

    // Validate category if provided
    if (updateData.category) {
      const validCategories = ['jee', 'neet', 'boards'];
      if (!validCategories.includes(updateData.category.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category. Must be one of: jee, neet, boards'
        });
      }
      updateData.category = updateData.category.toLowerCase();
    }

    const updatedCourse = await UnpaidCourse.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedCourse) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Course updated successfully',
      data: updatedCourse
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating course',
      error: error.message
    });
  }
};

// Delete course (Admin only)
const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid course ID'
      });
    }

    const deletedCourse = await UnpaidCourse.findByIdAndDelete(id);

    if (!deletedCourse) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting course',
      error: error.message
    });
  }
};

// Add video to course (Admin only)
const addVideoToCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { videoTitle, videoDescription, videoLink, duration } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid course ID'
      });
    }

    if (!videoTitle || !videoDescription || !videoLink || !duration) {
      return res.status(400).json({
        success: false,
        message: 'All video fields are required'
      });
    }

    const course = await UnpaidCourse.findById(id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    const newVideo = {
      videoTitle,
      videoDescription,
      videoLink,
      duration
    };

    course.videoLinks.push(newVideo);
    await course.save();

    res.status(200).json({
      success: true,
      message: 'Video added successfully',
      data: course
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding video',
      error: error.message
    });
  }
};

// Enroll student in course
const enrollStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { studentId, mode, schedule } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid course ID or student ID'
      });
    }

    if (!mode || !schedule) {
      return res.status(400).json({
        success: false,
        message: 'Mode and schedule are required'
      });
    }

    const validModes = ['online', 'offline', 'hybrid'];
    if (!validModes.includes(mode)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid mode. Must be one of: online, offline, hybrid'
      });
    }

    const course = await UnpaidCourse.findById(id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    if (!course.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Course is not active'
      });
    }

    // Check if student is already enrolled
    const isAlreadyEnrolled = course.studentsEnrolled.some(
      student => student.studentId.toString() === studentId
    );

    if (isAlreadyEnrolled) {
      return res.status(400).json({
        success: false,
        message: 'Student is already enrolled in this course'
      });
    }

    const enrollmentData = {
      studentId,
      mode,
      schedule
    };

    course.studentsEnrolled.push(enrollmentData);
    await course.save();

    res.status(200).json({
      success: true,
      message: 'Student enrolled successfully',
      data: course
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error enrolling student',
      error: error.message
    });
  }
};

// Get courses by category
const getCoursesByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 10, isActive = true } = req.query;

    const validCategories = ['jee', 'neet', 'boards'];
    if (!validCategories.includes(category.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category. Must be one of: jee, neet, boards'
      });
    }

    const filter = {
      category: category.toLowerCase(),
      isActive: isActive === 'true'
    };

    const courses = await UnpaidCourse.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const totalCourses = await UnpaidCourse.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: courses,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCourses / limit),
        totalCourses,
        hasNextPage: page < Math.ceil(totalCourses / limit),
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching courses by category',
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
  enrollStudent,
  getCoursesByCategory
};