const Batch = require('../models/Batch');
const User = require('../models/User');

// Create a new batch (Admin only)
const createBatch = async (req, res) => {
  try {
    console.log('Creating batch with body:', req.body);
    console.log('User creating batch:', req.user);

    const {
      batchName,
      classes,
      category,
      students,
      teachers,
      schedule,
      description
    } = req.body;

    // Validate required fields
    if (!batchName || !classes || !category) {
      return res.status(400).json({
        success: false,
        message: 'Batch name, classes, and category are required'
      });
    }

    // Validate classes array
    if (!Array.isArray(classes) || classes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one class must be specified'
      });
    }

    // Validate students if provided
    if (students && students.length > 0) {
      const studentUsers = await User.find({
        _id: { $in: students },
        email: { $regex: /@sujhav\.com$/ },
        role: 'user'
      });

      if (studentUsers.length !== students.length) {
        return res.status(400).json({
          success: false,
          message: 'All students must have @sujhav.com email and user role'
        });
      }
    }

    // Validate teachers if provided
    if (teachers && teachers.length > 0) {
      const teacherUsers = await User.find({
        _id: { $in: teachers },
        email: { $regex: /@sujhav\.com$/ },
        role: 'teacher'
      });

      if (teacherUsers.length !== teachers.length) {
        return res.status(400).json({
          success: false,
          message: 'All teachers must have @sujhav.com email and teacher role'
        });
      }
    }

    // Create batch object
    const batchData = {
      batchName: batchName.trim(),
      classes: classes.map(cls => cls.trim()),
      category: category.toLowerCase(),
      students: students || [],
      teachers: teachers || [],
      createdBy: req.user.id,
      schedule: schedule ? schedule.trim() : '',
      description: description ? description.trim() : ''
    };

    // Save to MongoDB
    const newBatch = new Batch(batchData);
    const savedBatch = await newBatch.save();
    
    // Populate the saved batch with user details
    const populatedBatch = await Batch.findById(savedBatch._id)
      .populate('students', 'name email')
      .populate('teachers', 'name email')
      .populate('createdBy', 'name email');
    
    console.log('Batch created successfully:', populatedBatch);

    res.status(201).json({
      success: true,
      message: 'Batch created successfully',
      data: populatedBatch
    });

  } catch (error) {
    console.error('Error creating batch:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get all batches
const getAllBatches = async (req, res) => {
  try {
    const batches = await Batch.find()
      .populate('students', 'name email')
      .populate('teachers', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: batches,
      count: batches.length
    });
  } catch (error) {
    console.error('Error fetching batches:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch batches',
      error: error.message
    });
  }
};

// Get batch by ID
const getBatchById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const batch = await Batch.findById(id)
      .populate('students', 'name email')
      .populate('teachers', 'name email')
      .populate('createdBy', 'name email');
    
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    res.json({
      success: true,
      data: batch
    });
  } catch (error) {
    console.error('Error fetching batch:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch batch',
      error: error.message
    });
  }
};

// Update batch (Admin only)
const updateBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      batchName,
      classes,
      category,
      students,
      teachers,
      schedule,
      description,
      isActive
    } = req.body;

    // Find batch
    const batch = await Batch.findById(id);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    // Validate students if provided
    if (students && students.length > 0) {
      const studentUsers = await User.find({
        _id: { $in: students },
        email: { $regex: /@sujhav\.com$/ },
        role: 'user'
      });

      if (studentUsers.length !== students.length) {
        return res.status(400).json({
          success: false,
          message: 'All students must have @sujhav.com email and user role'
        });
      }
    }

    // Validate teachers if provided
    if (teachers && teachers.length > 0) {
      const teacherUsers = await User.find({
        _id: { $in: teachers },
        email: { $regex: /@sujhav\.com$/ },
        role: 'teacher'
      });

      if (teacherUsers.length !== teachers.length) {
        return res.status(400).json({
          success: false,
          message: 'All teachers must have @sujhav.com email and teacher role'
        });
      }
    }

    // Prepare update data
    const updateData = {};
    
    if (batchName) updateData.batchName = batchName.trim();
    if (classes) updateData.classes = classes.map(cls => cls.trim());
    if (category) updateData.category = category.toLowerCase();
    if (students !== undefined) updateData.students = students;
    if (teachers !== undefined) updateData.teachers = teachers;
    if (schedule !== undefined) updateData.schedule = schedule.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (isActive !== undefined) updateData.isActive = isActive;

    // Update batch
    const updatedBatch = await Batch.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('students', 'name email')
      .populate('teachers', 'name email')
      .populate('createdBy', 'name email');

    res.json({
      success: true,
      message: 'Batch updated successfully',
      data: updatedBatch
    });

  } catch (error) {
    console.error('Error updating batch:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update batch',
      error: error.message
    });
  }
};

// Delete batch (Admin only)
const deleteBatch = async (req, res) => {
  try {
    const { id } = req.params;
    
    const batch = await Batch.findById(id);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    // Delete batch
    await Batch.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Batch deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting batch:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete batch',
      error: error.message
    });
  }
};

// Assign students to batch (Admin only)
const assignStudentsToBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { studentIds } = req.body;

    // Validate required fields
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Student IDs array is required'
      });
    }

    // Find batch
    const batch = await Batch.findById(id);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    // Validate students
    const studentUsers = await User.find({
      _id: { $in: studentIds },
      email: { $regex: /@sujhav\.com$/ },
      role: 'user'
    });

    if (studentUsers.length !== studentIds.length) {
      return res.status(400).json({
        success: false,
        message: 'All students must have @sujhav.com email and user role'
      });
    }

    // Add students to batch (avoid duplicates)
    const existingStudents = batch.students.map(s => s.toString());
    const newStudents = studentIds.filter(id => !existingStudents.includes(id));
    
    batch.students.push(...newStudents);
    const updatedBatch = await batch.save();

    // Populate and return
    const populatedBatch = await Batch.findById(updatedBatch._id)
      .populate('students', 'name email')
      .populate('teachers', 'name email')
      .populate('createdBy', 'name email');

    res.json({
      success: true,
      message: 'Students assigned successfully',
      data: populatedBatch
    });

  } catch (error) {
    console.error('Error assigning students:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign students',
      error: error.message
    });
  }
};

// Assign teachers to batch (Admin only)
const assignTeachersToBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { teacherIds } = req.body;

    // Validate required fields
    if (!teacherIds || !Array.isArray(teacherIds) || teacherIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Teacher IDs array is required'
      });
    }

    // Find batch
    const batch = await Batch.findById(id);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    // Validate teachers
    const teacherUsers = await User.find({
      _id: { $in: teacherIds },
      email: { $regex: /@sujhav\.com$/ },
      role: 'teacher'
    });

    if (teacherUsers.length !== teacherIds.length) {
      return res.status(400).json({
        success: false,
        message: 'All teachers must have @sujhav.com email and teacher role'
      });
    }

    // Add teachers to batch (avoid duplicates)
    const existingTeachers = batch.teachers.map(t => t.toString());
    const newTeachers = teacherIds.filter(id => !existingTeachers.includes(id));
    
    batch.teachers.push(...newTeachers);
    const updatedBatch = await batch.save();

    // Populate and return
    const populatedBatch = await Batch.findById(updatedBatch._id)
      .populate('students', 'name email')
      .populate('teachers', 'name email')
      .populate('createdBy', 'name email');

    res.json({
      success: true,
      message: 'Teachers assigned successfully',
      data: populatedBatch
    });

  } catch (error) {
    console.error('Error assigning teachers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign teachers',
      error: error.message
    });
  }
};

// Remove students from batch (Admin only)
const removeStudentsFromBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { studentIds } = req.body;

    // Validate required fields
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Student IDs array is required'
      });
    }

    // Find batch
    const batch = await Batch.findById(id);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    // Remove students from batch
    batch.students = batch.students.filter(
      studentId => !studentIds.includes(studentId.toString())
    );
    
    const updatedBatch = await batch.save();

    // Populate and return
    const populatedBatch = await Batch.findById(updatedBatch._id)
      .populate('students', 'name email')
      .populate('teachers', 'name email')
      .populate('createdBy', 'name email');

    res.json({
      success: true,
      message: 'Students removed successfully',
      data: populatedBatch
    });

  } catch (error) {
    console.error('Error removing students:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove students',
      error: error.message
    });
  }
};

// Remove teachers from batch (Admin only)
const removeTeachersFromBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { teacherIds } = req.body;

    // Validate required fields
    if (!teacherIds || !Array.isArray(teacherIds) || teacherIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Teacher IDs array is required'
      });
    }

    // Find batch
    const batch = await Batch.findById(id);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    // Remove teachers from batch
    batch.teachers = batch.teachers.filter(
      teacherId => !teacherIds.includes(teacherId.toString())
    );
    
    const updatedBatch = await batch.save();

    // Populate and return
    const populatedBatch = await Batch.findById(updatedBatch._id)
      .populate('students', 'name email')
      .populate('teachers', 'name email')
      .populate('createdBy', 'name email');

    res.json({
      success: true,
      message: 'Teachers removed successfully',
      data: populatedBatch
    });

  } catch (error) {
    console.error('Error removing teachers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove teachers',
      error: error.message
    });
  }
};

// Get all eligible students NOT assigned to any batch (with @sujhav.com email)
const getEligibleStudents = async (req, res) => {
  try {
    // First, get all student IDs that are already assigned to batches
    const batches = await Batch.find({}).select('students');
    const assignedStudentIds = new Set();
    
    batches.forEach(batch => {
      batch.students.forEach(studentId => {
        assignedStudentIds.add(studentId.toString());
      });
    });

    // Find users with @sujhav.com email and 'user' role who are NOT assigned to any batch
    const students = await User.find({
      email: { $regex: /@sujhav\.com$/ },
      role: 'user',
      _id: { $nin: Array.from(assignedStudentIds) }
    }).select('name email createdAt').sort({ name: 1 });

    res.json({
      success: true,
      data: students,
      count: students.length
    });
  } catch (error) {
    console.error('Error fetching eligible students:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch eligible students',
      error: error.message
    });
  }
};

// Get all eligible teachers NOT assigned to any batch (with @sujhav.com email)
const getEligibleTeachers = async (req, res) => {
  try {
    // First, get all teacher IDs that are already assigned to batches
    const batches = await Batch.find({}).select('teachers');
    const assignedTeacherIds = new Set();
    
    batches.forEach(batch => {
      batch.teachers.forEach(teacherId => {
        assignedTeacherIds.add(teacherId.toString());
      });
    });

    // Find teachers with @sujhav.com email who are NOT assigned to any batch
    const teachers = await User.find({
      email: { $regex: /@sujhav\.com$/ },
      role: 'teacher',
      _id: { $nin: Array.from(assignedTeacherIds) }
    }).select('name email createdAt').sort({ name: 1 });

    res.json({
      success: true,
      data: teachers,
      count: teachers.length
    });
  } catch (error) {
    console.error('Error fetching eligible teachers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch eligible teachers',
      error: error.message
    });
  }
};

// Get available students for a specific batch (excluding those already in this batch)
const getAvailableStudentsForBatch = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get all student IDs that are already assigned to OTHER batches
    const batches = await Batch.find({ _id: { $ne: id } }).select('students');
    const assignedStudentIds = new Set();
    
    batches.forEach(batch => {
      batch.students.forEach(studentId => {
        assignedStudentIds.add(studentId.toString());
      });
    });

    // Find users with @sujhav.com email and 'user' role who are NOT assigned to other batches
    const students = await User.find({
      email: { $regex: /@sujhav\.com$/ },
      role: 'user',
      _id: { $nin: Array.from(assignedStudentIds) }
    }).select('name email createdAt').sort({ name: 1 });

    res.json({
      success: true,
      data: students,
      count: students.length
    });
  } catch (error) {
    console.error('Error fetching available students:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available students',
      error: error.message
    });
  }
};

// Get available teachers for a specific batch (excluding those already in this batch)
const getAvailableTeachersForBatch = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get all teacher IDs that are already assigned to OTHER batches
    const batches = await Batch.find({ _id: { $ne: id } }).select('teachers');
    const assignedTeacherIds = new Set();
    
    batches.forEach(batch => {
      batch.teachers.forEach(teacherId => {
        assignedTeacherIds.add(teacherId.toString());
      });
    });

    // Find teachers with @sujhav.com email who are NOT assigned to other batches
    const teachers = await User.find({
      email: { $regex: /@sujhav\.com$/ },
      role: 'teacher',
      _id: { $nin: Array.from(assignedTeacherIds) }
    }).select('name email createdAt').sort({ name: 1 });

    res.json({
      success: true,
      data: teachers,
      count: teachers.length
    });
  } catch (error) {
    console.error('Error fetching available teachers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available teachers',
      error: error.message
    });
  }
};

// Get batches by category
const getBatchesByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const batches = await Batch.find({ 
      category: category.toLowerCase(),
      isActive: true 
    })
      .populate('students', 'name email')
      .populate('teachers', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: batches,
      count: batches.length
    });
  } catch (error) {
    console.error('Error fetching batches by category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch batches by category',
      error: error.message
    });
  }
};

module.exports = {
  createBatch,
  getAllBatches,
  getBatchById,
  updateBatch,
  deleteBatch,
  assignStudentsToBatch,
  assignTeachersToBatch,
  removeStudentsFromBatch,
  removeTeachersFromBatch,
  getEligibleStudents,
  getEligibleTeachers,
  getAvailableStudentsForBatch,
  getAvailableTeachersForBatch,
  getBatchesByCategory
};