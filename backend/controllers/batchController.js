const Batch = require('../models/Batch');
const User = require('../models/User');

// Create a new batch with subjects (Admin only)
const createBatch = async (req, res) => {
  try {
    const { batchName, classes, subjects, category, students, schedule, description, isActive } = req.body;

    // Enhanced validation
    if (!batchName || !batchName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Batch name is required'
      });
    }

    if (!classes || !Array.isArray(classes) || classes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one class must be specified'
      });
    }

    if (!category || !['jee', 'neet', 'boards'].includes(category.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Valid category (jee, neet, boards) is required'
      });
    }

    // Validate user exists and has admin role
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    // Validate students if provided
    if (students && Array.isArray(students) && students.length > 0) {
      const validStudents = students.filter(id => id && id.trim()); // Remove empty IDs
      if (validStudents.length > 0) {
        const studentUsers = await User.find({ _id: { $in: validStudents }, role: 'user' });
        if (studentUsers.length !== validStudents.length) {
          return res.status(400).json({
            success: false,
            message: 'Some selected students are invalid or do not exist'
          });
        }
      }
    }

    // Validate teachers in subjects if provided
    if (subjects && Array.isArray(subjects) && subjects.length > 0) {
      const teacherIds = subjects
        .filter(s => s && s.teacher && s.teacher.trim())
        .map(s => s.teacher);
      
      if (teacherIds.length > 0) {
        const teacherUsers = await User.find({ _id: { $in: teacherIds }, role: 'teacher' });
        const validTeacherIds = teacherUsers.map(t => t._id.toString());
        
        // Check if all teacher IDs are valid
        const invalidTeachers = teacherIds.filter(id => !validTeacherIds.includes(id));
        if (invalidTeachers.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'Some assigned teachers are invalid or do not exist'
          });
        }
      }
    }

    // Clean and prepare data
    const batchData = {
      batchName: batchName.trim(),
      classes: classes.filter(cls => cls && cls.trim()).map(cls => cls.trim()),
      subjects: subjects && Array.isArray(subjects) ? subjects.filter(s => s && s.name && s.name.trim()).map(s => ({
        name: s.name.trim(),
        teacher: s.teacher && s.teacher.trim() ? s.teacher.trim() : null
      })) : [],
      category: category.toLowerCase(),
      students: students && Array.isArray(students) ? students.filter(id => id && id.trim()) : [],
      createdBy: req.user.id,
      schedule: schedule && schedule.trim() ? schedule.trim() : '',
      description: description && description.trim() ? description.trim() : '',
      isActive: isActive !== undefined ? Boolean(isActive) : true
    };

    // Additional validation for empty classes after filtering
    if (batchData.classes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one valid class must be specified'
      });
    }

    const newBatch = new Batch(batchData);
    const savedBatch = await newBatch.save();
    
    // Populate the saved batch
    const populatedBatch = await Batch.findById(savedBatch._id)
      .populate('students', 'name email')
      .populate('subjects.teacher', 'name email')
      .populate('createdBy', 'name email');
    
    res.status(201).json({
      success: true,
      message: 'Batch created successfully',
      data: populatedBatch
    });
  } catch (error) {
    console.error('Batch creation error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A batch with this name already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error during batch creation',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// Update batch (Admin only) - Enhanced with better error handling
const updateBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { batchName, classes, subjects, category, students, schedule, description, isActive } = req.body;

    if (!id || !id.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Batch ID is required'
      });
    }

    const batch = await Batch.findById(id);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    // Validate students if provided
    if (students && Array.isArray(students) && students.length > 0) {
      const validStudents = students.filter(id => id && id.trim());
      if (validStudents.length > 0) {
        const studentUsers = await User.find({ _id: { $in: validStudents }, role: 'user' });
        if (studentUsers.length !== validStudents.length) {
          return res.status(400).json({
            success: false,
            message: 'Some selected students are invalid or do not exist'
          });
        }
      }
    }

    // Validate teachers in subjects if provided
    if (subjects && Array.isArray(subjects) && subjects.length > 0) {
      const teacherIds = subjects
        .filter(s => s && s.teacher && s.teacher.trim())
        .map(s => s.teacher);
      
      if (teacherIds.length > 0) {
        const teacherUsers = await User.find({ _id: { $in: teacherIds }, role: 'teacher' });
        const validTeacherIds = teacherUsers.map(t => t._id.toString());
        
        const invalidTeachers = teacherIds.filter(id => !validTeacherIds.includes(id));
        if (invalidTeachers.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'Some assigned teachers are invalid or do not exist'
          });
        }
      }
    }

    // Build update data
    const updateData = {};
    if (batchName !== undefined) updateData.batchName = batchName.trim();
    if (classes !== undefined) {
      if (!Array.isArray(classes)) {
        return res.status(400).json({
          success: false,
          message: 'Classes must be an array'
        });
      }
      updateData.classes = classes.filter(cls => cls && cls.trim()).map(cls => cls.trim());
      if (updateData.classes.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one valid class must be specified'
        });
      }
    }
    if (subjects !== undefined) {
      updateData.subjects = Array.isArray(subjects) ? subjects.filter(s => s && s.name && s.name.trim()).map(s => ({
        name: s.name.trim(),
        teacher: s.teacher && s.teacher.trim() ? s.teacher.trim() : null
      })) : [];
    }
    if (category !== undefined) {
      if (!['jee', 'neet', 'boards'].includes(category.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category. Must be jee, neet, or boards'
        });
      }
      updateData.category = category.toLowerCase();
    }
    if (students !== undefined) {
      updateData.students = Array.isArray(students) ? students.filter(id => id && id.trim()) : [];
    }
    if (schedule !== undefined) updateData.schedule = schedule ? schedule.trim() : '';
    if (description !== undefined) updateData.description = description ? description.trim() : '';
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const updatedBatch = await Batch.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
      .populate('students', 'name email')
      .populate('subjects.teacher', 'name email')
      .populate('createdBy', 'name email');

    res.json({
      success: true,
      message: 'Batch updated successfully',
      data: updatedBatch
    });
  } catch (error) {
    console.error('Batch update error:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A batch with this name already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update batch',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// Enhanced assign students function
const assignStudentsToBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { studentIds } = req.body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Student IDs array is required'
      });
    }

    const batch = await Batch.findById(id);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    // Filter out empty IDs
    const validStudentIds = studentIds.filter(id => id && id.trim());
    
    if (validStudentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid student IDs are required'
      });
    }

    const studentUsers = await User.find({ _id: { $in: validStudentIds }, role: 'user' });
    if (studentUsers.length !== validStudentIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Some selected students are invalid or do not exist'
      });
    }

    const existingStudents = batch.students.map(s => s.toString());
    const newStudents = validStudentIds.filter(id => !existingStudents.includes(id));
    
    if (newStudents.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'All selected students are already in this batch'
      });
    }

    batch.students.push(...newStudents);
    await batch.save();

    const populatedBatch = await Batch.findById(id)
      .populate('students', 'name email')
      .populate('subjects.teacher', 'name email')
      .populate('createdBy', 'name email');

    res.json({
      success: true,
      message: `${newStudents.length} students assigned successfully`,
      data: populatedBatch
    });
  } catch (error) {
    console.error('Student assignment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign students',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// Keep the rest of the functions unchanged
const getAllBatches = async (req, res) => {
  try {
    const batches = await Batch.find()
      .populate('students', 'name email')
      .populate('subjects.teacher', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: batches,
      count: batches.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch batches',
      error: error.message
    });
  }
};

const getBatchById = async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id)
      .populate('students', 'name email')
      .populate('subjects.teacher', 'name email')
      .populate('createdBy', 'name email');
    
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    res.json({ success: true, data: batch });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch batch',
      error: error.message
    });
  }
};

const deleteBatch = async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    await Batch.findByIdAndDelete(req.params.id);
    res.json({
      success: true,
      message: 'Batch deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete batch',
      error: error.message
    });
  }
};

const assignTeacherToSubject = async (req, res) => {
  try {
    const { id, subjectId } = req.params;
    const { teacherId } = req.body;

    const batch = await Batch.findById(id);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    const subject = batch.subjects.id(subjectId);
    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found'
      });
    }

    if (teacherId) {
      const teacher = await User.findById(teacherId);
      if (!teacher || teacher.role !== 'teacher') {
        return res.status(400).json({
          success: false,
          message: 'Invalid teacher ID'
        });
      }
    }

    subject.teacher = teacherId || null;
    await batch.save();

    const populatedBatch = await Batch.findById(id)
      .populate('students', 'name email')
      .populate('subjects.teacher', 'name email')
      .populate('createdBy', 'name email');

    res.json({
      success: true,
      message: 'Teacher assigned to subject successfully',
      data: populatedBatch
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to assign teacher to subject',
      error: error.message
    });
  }
};

const removeStudentsFromBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { studentIds } = req.body;

    const batch = await Batch.findById(id);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    batch.students = batch.students.filter(
      studentId => !studentIds.includes(studentId.toString())
    );
    
    await batch.save();

    const populatedBatch = await Batch.findById(id)
      .populate('students', 'name email')
      .populate('subjects.teacher', 'name email')
      .populate('createdBy', 'name email');

    res.json({
      success: true,
      message: 'Students removed successfully',
      data: populatedBatch
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to remove students',
      error: error.message
    });
  }
};

const getEligibleStudents = async (req, res) => {
  try {
    const batches = await Batch.find({}).select('students');
    const assignedStudentIds = new Set();
    
    batches.forEach(batch => {
      batch.students.forEach(studentId => {
        assignedStudentIds.add(studentId.toString());
      });
    });

    const students = await User.find({
      role: 'user',
      _id: { $nin: Array.from(assignedStudentIds) }
    }).select('name email').sort({ name: 1 });

    res.json({
      success: true,
      data: students,
      count: students.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch eligible students',
      error: error.message
    });
  }
};

const getAllTeachers = async (req, res) => {
  try {
    const teachers = await User.find({ role: 'teacher' })
      .select('name email')
      .sort({ name: 1 });

    res.json({
      success: true,
      data: teachers,
      count: teachers.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teachers',
      error: error.message
    });
  }
};

const getBatchesByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const batches = await Batch.find({ 
      category: category.toLowerCase(),
      isActive: true 
    })
      .populate('students', 'name email')
      .populate('subjects.teacher', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: batches,
      count: batches.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch batches by category',
      error: error.message
    });
  }
};

const getTeacherBatches = async (req, res) => {
  try {
    const teacherId = req.user.id;
    
    const batches = await Batch.find({
      'subjects.teacher': teacherId,
      isActive: true
    })
      .populate('students', 'name email')
      .populate('subjects.teacher', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    const teacherBatches = batches.map(batch => ({
      ...batch.toObject(),
      subjects: batch.subjects.filter(subject => 
        subject.teacher && subject.teacher._id.toString() === teacherId
      )
    }));

    res.json({
      success: true,
      data: teacherBatches,
      count: teacherBatches.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your assigned batches',
      error: error.message
    });
  }
};

const getTeacherBatchById = async (req, res) => {
  try {
    const { id } = req.params;
    const teacherId = req.user.id;

    const batch = await Batch.findOne({
      _id: id,
      'subjects.teacher': teacherId,
      isActive: true
    })
      .populate('students', 'name email')
      .populate('subjects.teacher', 'name email')
      .populate('createdBy', 'name email');

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found or you are not assigned to this batch'
      });
    }

    const teacherBatch = {
      ...batch.toObject(),
      subjects: batch.subjects.filter(subject => 
        subject.teacher && subject.teacher._id.toString() === teacherId
      )
    };

    res.json({
      success: true,
      data: teacherBatch
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch batch details',
      error: error.message
    });
  }
};

const getStudentsWithAssignments = async (req, res) => {
  try {
    const { batchId } = req.params;
    
    const batch = await Batch.findById(batchId)
      .populate('students', 'name email')
      .populate('subjects.teacher', 'name email');

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    // Get all students (both assigned and eligible)
    const allStudents = await User.find({ role: 'user' }).select('name email');
    
    // Map students with their assignment status
    const studentsWithStatus = allStudents.map(student => {
      const isAssigned = batch.students.some(assignedStudent => 
        assignedStudent._id.toString() === student._id.toString()
      );
      
      return {
        ...student.toObject(),
        isAssigned,
        assignedClasses: isAssigned ? batch.classes : [],
        assignedSubjects: isAssigned ? batch.subjects.map(s => s.name) : []
      };
    });

    res.json({
      success: true,
      data: {
        batch: batch,
        students: studentsWithStatus,
        availableClasses: batch.classes,
        availableSubjects: batch.subjects
      }
    });
  } catch (error) {
    console.error('Error fetching students with assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch students with assignments',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// Enhanced function to get teachers with their current assignments
const getTeachersWithAssignments = async (req, res) => {
  try {
    const { batchId } = req.params;
    
    const batch = await Batch.findById(batchId)
      .populate('subjects.teacher', 'name email');

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    // Get all teachers
    const allTeachers = await User.find({ role: 'teacher' }).select('name email');
    
    // Map teachers with their current subject assignments
    const teachersWithAssignments = allTeachers.map(teacher => {
      const assignedSubjects = batch.subjects
        .filter(subject => subject.teacher && subject.teacher._id.toString() === teacher._id.toString())
        .map(subject => subject.name);
      
      return {
        ...teacher.toObject(),
        assignedSubjects,
        isAssigned: assignedSubjects.length > 0
      };
    });

    res.json({
      success: true,
      data: {
        batch: batch,
        teachers: teachersWithAssignments,
        availableSubjects: batch.subjects
      }
    });
  } catch (error) {
    console.error('Error fetching teachers with assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teachers with assignments',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// Enhanced assign students function with class/subject specific assignment
const assignStudentsToBatchEnhanced = async (req, res) => {
  try {
    const { id } = req.params;
    const { studentAssignments } = req.body; // Array of {studentId, assignedClasses, assignedSubjects}

    if (!Array.isArray(studentAssignments) || studentAssignments.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Student assignments array is required'
      });
    }

    const batch = await Batch.findById(id);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    // Validate all student IDs
    const studentIds = studentAssignments.map(a => a.studentId);
    const validStudents = await User.find({ 
      _id: { $in: studentIds }, 
      role: 'user' 
    });

    if (validStudents.length !== studentIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Some selected students are invalid or do not exist'
      });
    }

    // Add students to batch (avoid duplicates)
    const existingStudentIds = batch.students.map(s => s.toString());
    const newStudentIds = studentIds.filter(id => !existingStudentIds.includes(id));
    
    batch.students.push(...newStudentIds);
    await batch.save();

    // Note: In a more complex system, you might want to store class/subject specific assignments
    // in a separate collection or as embedded documents with more detail

    const populatedBatch = await Batch.findById(id)
      .populate('students', 'name email')
      .populate('subjects.teacher', 'name email')
      .populate('createdBy', 'name email');

    res.json({
      success: true,
      message: `${newStudentIds.length} students assigned successfully`,
      data: populatedBatch
    });
  } catch (error) {
    console.error('Enhanced student assignment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign students',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// Enhanced assign teachers to subjects
const assignTeachersToSubjectsEnhanced = async (req, res) => {
  try {
    const { id } = req.params;
    const { teacherAssignments } = req.body; // Array of {teacherId, assignedSubjects}

    if (!Array.isArray(teacherAssignments) || teacherAssignments.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Teacher assignments array is required'
      });
    }

    const batch = await Batch.findById(id);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    // Validate all teacher IDs
    const teacherIds = teacherAssignments.map(a => a.teacherId);
    const validTeachers = await User.find({ 
      _id: { $in: teacherIds }, 
      role: 'teacher' 
    });

    if (validTeachers.length !== teacherIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Some selected teachers are invalid or do not exist'
      });
    }

    // Update subject assignments
    teacherAssignments.forEach(assignment => {
      assignment.assignedSubjects.forEach(subjectName => {
        const subject = batch.subjects.find(s => s.name === subjectName);
        if (subject) {
          subject.teacher = assignment.teacherId;
        }
      });
    });

    await batch.save();

    const populatedBatch = await Batch.findById(id)
      .populate('students', 'name email')
      .populate('subjects.teacher', 'name email')
      .populate('createdBy', 'name email');

    res.json({
      success: true,
      message: 'Teachers assigned to subjects successfully',
      data: populatedBatch
    });
  } catch (error) {
    console.error('Enhanced teacher assignment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign teachers to subjects',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// Get batch statistics
const getBatchStatistics = async (req, res) => {
  try {
    const { id } = req.params;
    
    const batch = await Batch.findById(id)
      .populate('students', 'name email')
      .populate('subjects.teacher', 'name email')
      .populate('createdBy', 'name email');

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    const statistics = {
      totalStudents: batch.students.length,
      totalSubjects: batch.subjects.length,
      totalClasses: batch.classes.length,
      assignedTeachers: batch.subjects.filter(s => s.teacher).length,
      unassignedSubjects: batch.subjects.filter(s => !s.teacher).length,
      isActive: batch.isActive
    };

    res.json({
      success: true,
      data: {
        batch,
        statistics
      }
    });
  } catch (error) {
    console.error('Error fetching batch statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch batch statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
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
  assignTeacherToSubject,
  removeStudentsFromBatch,
  getEligibleStudents,
  getAllTeachers,
  getBatchesByCategory,
  getTeacherBatches,
  getTeacherBatchById,
  
  getStudentsWithAssignments,
  getTeachersWithAssignments,
  assignStudentsToBatchEnhanced,
  assignTeachersToSubjectsEnhanced,
  getBatchStatistics
};