const UnpaidCourse = require('../models/UnpaidCourse');
const User = require('../models/User');

// Admin Controllers

// Create a new unpaid course (Admin only)
exports.createCourse = async (req, res) => {
  try {
    const {
      courseTitle,
      tutor,
      rating,
      categoryTab,
      class: courseClass,
      about,
      details,
      videoLectures
    } = req.body;

    const newCourse = new UnpaidCourse({
      courseTitle,
      tutor,
      rating,
      categoryTab,
      class: courseClass,
      about,
      details,
      videoLectures,
      createdBy: req.user.id
    });

    await newCourse.save();
    
    res.status(201).json({
      message: 'Course created successfully',
      course: newCourse
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error creating course',
      error: error.message
    });
  }
};

// Update course (Admin only)
exports.updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updatedCourse = await UnpaidCourse.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('studentsEnrolled', 'name email');

    if (!updatedCourse) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.status(200).json({
      message: 'Course updated successfully',
      course: updatedCourse
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error updating course',
      error: error.message
    });
  }
};

// Delete course (Admin only)
exports.deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedCourse = await UnpaidCourse.findByIdAndDelete(id);

    if (!deletedCourse) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.status(200).json({
      message: 'Course deleted successfully',
      course: deletedCourse
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error deleting course',
      error: error.message
    });
  }
};

// Add video lecture to course (Admin only)
exports.addVideoLecture = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, youtubeUrl, duration, order } = req.body;

    const course = await UnpaidCourse.findById(id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const newLecture = {
      title,
      description,
      youtubeUrl,
      duration,
      order: order || course.videoLectures.length
    };

    course.videoLectures.push(newLecture);
    await course.save();

    res.status(201).json({
      message: 'Video lecture added successfully',
      lecture: newLecture,
      course: course
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error adding video lecture',
      error: error.message
    });
  }
};

// Update video lecture (Admin only)
exports.updateVideoLecture = async (req, res) => {
  try {
    const { courseId, lectureId } = req.params;
    const updateData = req.body;

    const course = await UnpaidCourse.findById(courseId);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const lecture = course.videoLectures.id(lectureId);

    if (!lecture) {
      return res.status(404).json({ message: 'Video lecture not found' });
    }

    Object.assign(lecture, updateData);
    await course.save();

    res.status(200).json({
      message: 'Video lecture updated successfully',
      lecture: lecture
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error updating video lecture',
      error: error.message
    });
  }
};

// Delete video lecture (Admin only)
exports.deleteVideoLecture = async (req, res) => {
  try {
    const { courseId, lectureId } = req.params;

    const course = await UnpaidCourse.findById(courseId);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const lecture = course.videoLectures.id(lectureId);

    if (!lecture) {
      return res.status(404).json({ message: 'Video lecture not found' });
    }

    course.videoLectures.pull(lectureId);
    await course.save();

    res.status(200).json({
      message: 'Video lecture deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error deleting video lecture',
      error: error.message
    });
  }
};

// Public Controllers (for users)

// Get all active courses
exports.getAllCourses = async (req, res) => {
  try {
    const { categoryTab, class: courseClass, page = 1, limit = 10 } = req.query;
    
    const filter = { isActive: true };
    
    if (categoryTab) {
      filter.categoryTab = categoryTab.toLowerCase();
    }
    
    if (courseClass) {
      filter.class = courseClass;
    }

    const skip = (page - 1) * limit;

    const courses = await UnpaidCourse.find(filter)
      .populate('studentsEnrolled', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalCourses = await UnpaidCourse.countDocuments(filter);

    res.status(200).json({
      courses,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCourses / limit),
        totalCourses,
        hasNext: skip + courses.length < totalCourses,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error fetching courses',
      error: error.message
    });
  }
};

// Get course by ID
exports.getCourseById = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await UnpaidCourse.findById(id)
      .populate('studentsEnrolled', 'name email')
      .populate('createdBy', 'name email');

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (!course.isActive) {
      return res.status(404).json({ message: 'Course is not available' });
    }

    res.status(200).json(course);
  } catch (error) {
    res.status(500).json({
      message: 'Error fetching course',
      error: error.message
    });
  }
};

// Enroll user in course
exports.enrollInCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const course = await UnpaidCourse.findById(id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (!course.isActive) {
      return res.status(400).json({ message: 'Course is not available for enrollment' });
    }

    // Check if user is already enrolled
    if (course.studentsEnrolled.includes(userId)) {
      return res.status(400).json({ message: 'You are already enrolled in this course' });
    }

    course.studentsEnrolled.push(userId);
    await course.save();

    res.status(200).json({
      message: 'Successfully enrolled in course',
      course: course
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error enrolling in course',
      error: error.message
    });
  }
};

// Unenroll user from course
exports.unenrollFromCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const course = await UnpaidCourse.findById(id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if user is enrolled
    if (!course.studentsEnrolled.includes(userId)) {
      return res.status(400).json({ message: 'You are not enrolled in this course' });
    }

    course.studentsEnrolled.pull(userId);
    await course.save();

    res.status(200).json({
      message: 'Successfully unenrolled from course'
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error unenrolling from course',
      error: error.message
    });
  }
};

// Get user's enrolled courses
exports.getUserEnrolledCourses = async (req, res) => {
  try {
    const userId = req.user.id;

    const courses = await UnpaidCourse.find({
      studentsEnrolled: userId,
      isActive: true
    })
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });

    res.status(200).json({
      enrolledCourses: courses,
      totalEnrolled: courses.length
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error fetching enrolled courses',
      error: error.message
    });
  }
};

// Get courses by category
exports.getCoursesByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const validCategories = ['jee', 'neet', 'boards'];
    if (!validCategories.includes(category.toLowerCase())) {
      return res.status(400).json({ message: 'Invalid category' });
    }

    const skip = (page - 1) * limit;

    const courses = await UnpaidCourse.find({
      categoryTab: category.toLowerCase(),
      isActive: true
    })
    .populate('studentsEnrolled', 'name email')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

    const totalCourses = await UnpaidCourse.countDocuments({
      categoryTab: category.toLowerCase(),
      isActive: true
    });

    res.status(200).json({
      category: category.toLowerCase(),
      courses,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCourses / limit),
        totalCourses,
        hasNext: skip + courses.length < totalCourses,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error fetching courses by category',
      error: error.message
    });
  }
};

// Updated unpaidCourseController.js - Video Management Functions

// Update course (Admin only) - Enhanced for video lectures
exports.updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Validate video lectures if they exist
    if (updateData.videoLectures && Array.isArray(updateData.videoLectures)) {
      for (let i = 0; i < updateData.videoLectures.length; i++) {
        const video = updateData.videoLectures[i];
        
        // Validate required fields
        if (!video.title || !video.description || !video.youtubeUrl) {
          return res.status(400).json({
            message: `Video lecture ${i + 1}: Title, description, and YouTube URL are required`
          });
        }

        // Validate YouTube URL
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)[a-zA-Z0-9_-]{11}(&.*)?$/;
        if (!youtubeRegex.test(video.youtubeUrl)) {
          return res.status(400).json({
            message: `Video lecture ${i + 1}: Invalid YouTube URL format`
          });
        }

        // Ensure order is set
        if (video.order === undefined || video.order === null) {
          video.order = i;
        }

        // Ensure duration is a string
        video.duration = video.duration || '';
      }
    }

    const updatedCourse = await UnpaidCourse.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('studentsEnrolled', 'name email');

    if (!updatedCourse) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.status(200).json({
      message: 'Course updated successfully',
      course: updatedCourse
    });
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({
      message: 'Error updating course',
      error: error.message
    });
  }
};

// Enhanced Add video lecture to course (Admin only)
exports.addVideoLecture = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, youtubeUrl, duration, order } = req.body;

    // Validate required fields
    if (!title || !description || !youtubeUrl) {
      return res.status(400).json({
        message: 'Title, description, and YouTube URL are required'
      });
    }

    // Validate YouTube URL
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)[a-zA-Z0-9_-]{11}(&.*)?$/;
    if (!youtubeRegex.test(youtubeUrl)) {
      return res.status(400).json({
        message: 'Invalid YouTube URL format'
      });
    }

    const course = await UnpaidCourse.findById(id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const newLecture = {
      title: title.trim(),
      description: description.trim(),
      youtubeUrl: youtubeUrl.trim(),
      duration: duration || '',
      order: order !== undefined ? order : course.videoLectures.length
    };

    course.videoLectures.push(newLecture);
    await course.save();

    // Populate the course with student details for response
    await course.populate('studentsEnrolled', 'name email');

    res.status(201).json({
      message: 'Video lecture added successfully',
      lecture: course.videoLectures[course.videoLectures.length - 1],
      course: course
    });
  } catch (error) {
    console.error('Error adding video lecture:', error);
    res.status(500).json({
      message: 'Error adding video lecture',
      error: error.message
    });
  }
};

// Enhanced Update video lecture (Admin only)
exports.updateVideoLecture = async (req, res) => {
  try {
    const { courseId, lectureId } = req.params;
    const updateData = req.body;

    // Validate required fields if provided
    if (updateData.title && !updateData.title.trim()) {
      return res.status(400).json({ message: 'Title cannot be empty' });
    }
    if (updateData.description && !updateData.description.trim()) {
      return res.status(400).json({ message: 'Description cannot be empty' });
    }
    if (updateData.youtubeUrl) {
      const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)[a-zA-Z0-9_-]{11}(&.*)?$/;
      if (!youtubeRegex.test(updateData.youtubeUrl)) {
        return res.status(400).json({ message: 'Invalid YouTube URL format' });
      }
    }

    const course = await UnpaidCourse.findById(courseId);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const lecture = course.videoLectures.id(lectureId);

    if (!lecture) {
      return res.status(404).json({ message: 'Video lecture not found' });
    }

    // Update only provided fields
    if (updateData.title) lecture.title = updateData.title.trim();
    if (updateData.description) lecture.description = updateData.description.trim();
    if (updateData.youtubeUrl) lecture.youtubeUrl = updateData.youtubeUrl.trim();
    if (updateData.duration !== undefined) lecture.duration = updateData.duration;
    if (updateData.order !== undefined) lecture.order = updateData.order;

    await course.save();

    res.status(200).json({
      message: 'Video lecture updated successfully',
      lecture: lecture
    });
  } catch (error) {
    console.error('Error updating video lecture:', error);
    res.status(500).json({
      message: 'Error updating video lecture',
      error: error.message
    });
  }
};

// Get all courses with enhanced error handling (Admin route for management)
exports.getAllCoursesAdmin = async (req, res) => {
  try {
    const { categoryTab, class: courseClass, page = 1, limit = 10, includeInactive = true } = req.query;
    
    const filter = {};
    
    // Admin can see inactive courses too
    if (includeInactive !== 'true') {
      filter.isActive = true;
    }
    
    if (categoryTab) {
      filter.categoryTab = categoryTab.toLowerCase();
    }
    
    if (courseClass) {
      filter.class = courseClass;
    }

    const skip = (page - 1) * limit;

    const courses = await UnpaidCourse.find(filter)
      .populate('studentsEnrolled', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalCourses = await UnpaidCourse.countDocuments(filter);

    res.status(200).json({
      message: 'Courses fetched successfully',
      courses,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCourses / limit),
        totalCourses,
        hasNext: skip + courses.length < totalCourses,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({
      message: 'Error fetching courses',
      error: error.message
    });
  }
};