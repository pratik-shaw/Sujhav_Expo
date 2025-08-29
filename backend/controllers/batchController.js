const Batch = require('../models/Batch');
const User = require('../models/User');

// Utility function for validation
const validateUsers = async (userIds, role) => {
  const users = await User.find({ _id: { $in: userIds }, role });
  return users.length === userIds.length;
};

// Create batch
const createBatch = async (req, res) => {
  try {
    const { batchName, classes, subjects, category, schedule, description, isActive } = req.body;

    if (!batchName?.trim()) {
      return res.status(400).json({ success: false, message: 'Batch name is required' });
    }

    if (!classes?.length) {
      return res.status(400).json({ success: false, message: 'At least one class must be specified' });
    }

    if (!['jee', 'neet', 'boards'].includes(category?.toLowerCase())) {
      return res.status(400).json({ success: false, message: 'Valid category (jee, neet, boards) is required' });
    }

    // Validate teachers in subjects
    if (subjects?.length) {
      const teacherIds = subjects.filter(s => s.teacher).map(s => s.teacher);
      if (teacherIds.length && !(await validateUsers(teacherIds, 'teacher'))) {
        return res.status(400).json({ success: false, message: 'Some assigned teachers are invalid' });
      }
    }

    const batchData = {
      batchName: batchName.trim(),
      classes: classes.filter(cls => cls?.trim()).map(cls => cls.trim()),
      subjects: subjects?.filter(s => s?.name?.trim()).map(s => ({
        name: s.name.trim(),
        teacher: s.teacher?.trim() || null
      })) || [],
      category: category.toLowerCase(),
      createdBy: req.user.id,
      schedule: schedule?.trim() || '',
      description: description?.trim() || '',
      isActive: isActive !== undefined ? Boolean(isActive) : true
    };

    const newBatch = new Batch(batchData);
    const savedBatch = await newBatch.save();
    
    const populatedBatch = await Batch.findById(savedBatch._id)
      .populate('studentAssignments.student', 'name email')
      .populate('subjects.teacher', 'name email')
      .populate('createdBy', 'name email');
    
    res.status(201).json({
      success: true,
      message: 'Batch created successfully',
      data: populatedBatch
    });
  } catch (error) {
    console.error('Batch creation error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: Object.values(error.errors).map(err => err.message)
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
      message: 'Internal server error during batch creation'
    });
  }
};

// Get all batches
const getAllBatches = async (req, res) => {
  try {
    const batches = await Batch.find()
      .populate('studentAssignments.student', 'name email')
      .populate('subjects.teacher', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, data: batches, count: batches.length });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch batches', error: error.message });
  }
};

// Get batch by ID
const getBatchById = async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id)
      .populate('studentAssignments.student', 'name email')
      .populate('studentAssignments.assignedSubjects.teacher', 'name email')
      .populate('subjects.teacher', 'name email')
      .populate('createdBy', 'name email');
    
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    res.json({ success: true, data: batch });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch batch', error: error.message });
  }
};

// Update batch
const updateBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { batchName, classes, subjects, category, schedule, description, isActive } = req.body;

    const batch = await Batch.findById(id);
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    // Validate teachers if subjects are being updated
    if (subjects?.length) {
      const teacherIds = subjects.filter(s => s.teacher).map(s => s.teacher);
      if (teacherIds.length && !(await validateUsers(teacherIds, 'teacher'))) {
        return res.status(400).json({ success: false, message: 'Some assigned teachers are invalid' });
      }
    }

    const updateData = {};
    if (batchName !== undefined) updateData.batchName = batchName.trim();
    if (classes !== undefined) {
      updateData.classes = classes.filter(cls => cls?.trim()).map(cls => cls.trim());
      if (!updateData.classes.length) {
        return res.status(400).json({ success: false, message: 'At least one valid class required' });
      }
    }
    if (subjects !== undefined) {
      updateData.subjects = subjects.filter(s => s?.name?.trim()).map(s => ({
        name: s.name.trim(),
        teacher: s.teacher?.trim() || null
      }));
    }
    if (category !== undefined) {
      if (!['jee', 'neet', 'boards'].includes(category.toLowerCase())) {
        return res.status(400).json({ success: false, message: 'Invalid category' });
      }
      updateData.category = category.toLowerCase();
    }
    if (schedule !== undefined) updateData.schedule = schedule?.trim() || '';
    if (description !== undefined) updateData.description = description?.trim() || '';
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const updatedBatch = await Batch.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
      .populate('studentAssignments.student', 'name email')
      .populate('subjects.teacher', 'name email')
      .populate('createdBy', 'name email');

    // Update student subject teachers when subjects change
    if (subjects !== undefined) {
      updatedBatch.updateStudentSubjectTeachers();
      await updatedBatch.save();
    }

    res.json({ success: true, message: 'Batch updated successfully', data: updatedBatch });
  } catch (error) {
    console.error('Batch update error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }

    res.status(500).json({ success: false, message: 'Failed to update batch' });
  }
};

// Delete batch
const deleteBatch = async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id);
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    await Batch.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Batch deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete batch', error: error.message });
  }
};

// Enhanced assign students with class and subject assignments
const assignStudentsToBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { studentAssignments } = req.body; // [{ student, assignedClasses, assignedSubjects }]

    if (!Array.isArray(studentAssignments) || !studentAssignments.length) {
      return res.status(400).json({ success: false, message: 'Student assignments array is required' });
    }

    const batch = await Batch.findById(id);
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    // Validate all student IDs
    const studentIds = studentAssignments.map(a => a.student);
    if (!(await validateUsers(studentIds, 'user'))) {
      return res.status(400).json({ success: false, message: 'Some students are invalid' });
    }

    const addedCount = batch.addStudentAssignments(studentAssignments);
    await batch.save();

    const populatedBatch = await Batch.findById(id)
      .populate('studentAssignments.student', 'name email')
      .populate('studentAssignments.assignedSubjects.teacher', 'name email')
      .populate('subjects.teacher', 'name email')
      .populate('createdBy', 'name email');

    res.json({
      success: true,
      message: `${addedCount} students assigned successfully`,
      data: populatedBatch
    });
  } catch (error) {
    console.error('Student assignment error:', error);
    res.status(500).json({ success: false, message: 'Failed to assign students' });
  }
};

// NEW: Enhanced assign students endpoint (what the frontend is calling)
const assignStudentsEnhanced = async (req, res) => {
  try {
    const { id } = req.params;
    const { studentAssignments } = req.body;

    console.log('Received assignment request:', { id, studentAssignments });

    if (!Array.isArray(studentAssignments) || !studentAssignments.length) {
      return res.status(400).json({ 
        success: false, 
        message: 'Student assignments array is required and cannot be empty' 
      });
    }

    const batch = await Batch.findById(id);
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    // Transform the frontend format to match the model expectations
    const transformedAssignments = studentAssignments.map(assignment => {
      // Handle both formats: { studentId, ... } and { student, ... }
      const studentId = assignment.studentId || assignment.student;
      
      if (!studentId) {
        throw new Error('Student ID is required for each assignment');
      }

      return {
        student: studentId,
        assignedClasses: assignment.assignedClasses || [],
        assignedSubjects: assignment.assignedSubjects || []
      };
    });

    console.log('Transformed assignments:', transformedAssignments);

    // Validate all student IDs
    const studentIds = transformedAssignments.map(a => a.student);
    const validStudents = await User.find({ 
      _id: { $in: studentIds }, 
      role: 'user' 
    });
    
    if (validStudents.length !== studentIds.length) {
      return res.status(400).json({ 
        success: false, 
        message: 'Some students are invalid or not found' 
      });
    }

    // Check for already assigned students
    const alreadyAssigned = transformedAssignments.filter(assignment => 
      batch.hasStudent(assignment.student)
    );

    if (alreadyAssigned.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Some students are already assigned to this batch`,
        details: alreadyAssigned.map(a => a.student)
      });
    }

    const addedCount = batch.addStudentAssignments(transformedAssignments);
    await batch.save();

    const populatedBatch = await Batch.findById(id)
      .populate('studentAssignments.student', 'name email')
      .populate('studentAssignments.assignedSubjects.teacher', 'name email')
      .populate('subjects.teacher', 'name email')
      .populate('createdBy', 'name email');

    res.json({
      success: true,
      message: `${addedCount} students assigned successfully`,
      data: populatedBatch
    });
  } catch (error) {
    console.error('Enhanced student assignment error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to assign students', 
      error: error.message 
    });
  }
};


// Remove students from batch
const removeStudentsFromBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { studentIds } = req.body;

    console.log('Received removal request:', { id, studentIds });

    if (!Array.isArray(studentIds) || !studentIds.length) {
      return res.status(400).json({ 
        success: false, 
        message: 'Student IDs array is required and cannot be empty' 
      });
    }

    const batch = await Batch.findById(id);
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    // Check if students are actually assigned to this batch
    const assignedStudents = studentIds.filter(studentId => 
      batch.hasStudent(studentId)
    );

    if (assignedStudents.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'None of the specified students are assigned to this batch'
      });
    }

    const removedCount = batch.removeStudentAssignments(studentIds);
    await batch.save();

    const populatedBatch = await Batch.findById(id)
      .populate('studentAssignments.student', 'name email')
      .populate('studentAssignments.assignedSubjects.teacher', 'name email')
      .populate('subjects.teacher', 'name email')
      .populate('createdBy', 'name email');

    res.json({
      success: true,
      message: `${removedCount} students removed successfully`,
      data: populatedBatch,
      details: {
        requestedCount: studentIds.length,
        removedCount: removedCount,
        removedStudents: assignedStudents
      }
    });
  } catch (error) {
    console.error('Student removal error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to remove students', 
      error: error.message 
    });
  }
};


// NEW: Enhanced teacher assignment endpoint
const assignTeachersEnhanced = async (req, res) => {
  try {
    const { id } = req.params;
    const { teacherAssignments } = req.body;

    console.log('Received teacher assignment request:', { id, teacherAssignments });

    if (!Array.isArray(teacherAssignments) || !teacherAssignments.length) {
      return res.status(400).json({ 
        success: false, 
        message: 'Teacher assignments array is required and cannot be empty' 
      });
    }

    const batch = await Batch.findById(id);
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    // Transform the frontend format
    const transformedAssignments = teacherAssignments.map(assignment => {
      const teacherId = assignment.teacherId || assignment.teacher;
      
      if (!teacherId) {
        throw new Error('Teacher ID is required for each assignment');
      }

      return {
        teacherId: teacherId,
        assignedSubjects: assignment.assignedSubjects || []
      };
    });

    // Validate all teacher IDs
    const teacherIds = transformedAssignments.map(a => a.teacherId);
    const validTeachers = await User.find({ 
      _id: { $in: teacherIds }, 
      role: 'teacher' 
    });
    
    if (validTeachers.length !== teacherIds.length) {
      return res.status(400).json({ 
        success: false, 
        message: 'Some teachers are invalid or not found' 
      });
    }

    let assignedCount = 0;
    const assignmentDetails = [];
    
    // Assign teachers to their selected subjects
    transformedAssignments.forEach(assignment => {
      assignment.assignedSubjects.forEach(subjectName => {
        const subject = batch.subjects.find(s => s.name === subjectName);
        if (subject) {
          const previousTeacher = subject.teacher;
          subject.teacher = assignment.teacherId;
          assignedCount++;
          assignmentDetails.push({
            subject: subjectName,
            teacher: assignment.teacherId,
            previousTeacher: previousTeacher
          });
        }
      });
    });

    if (assignedCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid subject assignments were made'
      });
    }

    // Update student subject teachers
    batch.updateStudentSubjectTeachers();
    await batch.save();

    const populatedBatch = await Batch.findById(id)
      .populate('studentAssignments.student', 'name email')
      .populate('subjects.teacher', 'name email')
      .populate('createdBy', 'name email');

    res.json({
      success: true,
      message: `Teachers assigned to ${assignedCount} subjects successfully`,
      data: populatedBatch,
      details: assignmentDetails
    });
  } catch (error) {
    console.error('Enhanced teacher assignment error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to assign teachers', 
      error: error.message 
    });
  }
};

// Assign teacher to subject
const assignTeacherToSubject = async (req, res) => {
  try {
    const { id, subjectId } = req.params;
    const { teacherId } = req.body;

    const batch = await Batch.findById(id);
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    const subject = batch.subjects.id(subjectId);
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    if (teacherId && !(await validateUsers([teacherId], 'teacher'))) {
      return res.status(400).json({ success: false, message: 'Invalid teacher ID' });
    }

    subject.teacher = teacherId || null;
    batch.updateStudentSubjectTeachers(); // Update student assignments
    await batch.save();

    const populatedBatch = await Batch.findById(id)
      .populate('studentAssignments.student', 'name email')
      .populate('subjects.teacher', 'name email')
      .populate('createdBy', 'name email');

    res.json({
      success: true,
      message: 'Teacher assigned to subject successfully',
      data: populatedBatch
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to assign teacher', error: error.message });
  }
};

// Get eligible students
const getEligibleStudents = async (req, res) => {
  try {
    const students = await Batch.findEligibleStudents();
    res.json({ success: true, data: students, count: students.length });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch eligible students', error: error.message });
  }
};

// Get all teachers
const getAllTeachers = async (req, res) => {
  try {
    const teachers = await User.find({ role: 'teacher' })
      .select('name email')
      .sort({ name: 1 });

    res.json({ success: true, data: teachers, count: teachers.length });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch teachers', error: error.message });
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
      .populate('studentAssignments.student', 'name email')
      .populate('subjects.teacher', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: batches, count: batches.length });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch batches', error: error.message });
  }
};

// Get teacher's batches
const getTeacherBatches = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const batches = await Batch.findByTeacher(teacherId);

    const teacherBatches = batches.map(batch => ({
      ...batch.toObject(),
      subjects: batch.subjects.filter(subject => 
        subject.teacher && subject.teacher._id.toString() === teacherId
      )
    }));

    res.json({ success: true, data: teacherBatches, count: teacherBatches.length });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch your batches', error: error.message });
  }
};

// Get teacher's batch by ID
const getTeacherBatchById = async (req, res) => {
  try {
    const { id } = req.params;
    const teacherId = req.user.id;

    const batch = await Batch.findOne({
      _id: id,
      'subjects.teacher': teacherId,
      isActive: true
    })
      .populate('studentAssignments.student', 'name email')
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

    res.json({ success: true, data: teacherBatch });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch batch', error: error.message });
  }
};

// Get batch statistics
const getBatchStatistics = async (req, res) => {
  try {
    const { id } = req.params;
    
    const batch = await Batch.findById(id)
      .populate('studentAssignments.student', 'name email')
      .populate('subjects.teacher', 'name email');

    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    const statistics = {
      totalStudents: batch.studentCount,
      totalSubjects: batch.subjectCount,
      totalClasses: batch.classes.length,
      assignedTeachers: batch.subjects.filter(s => s.teacher).length,
      unassignedSubjects: batch.subjects.filter(s => !s.teacher).length,
      isActive: batch.isActive,
      studentDetails: batch.getStudentDetails()
    };

    res.json({ success: true, data: { batch, statistics } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch statistics', error: error.message });
  }
};

// FIXED: Get students with their assignment details
const getStudentsWithAssignments = async (req, res) => {
  try {
    const { batchId } = req.params;
    
    const batch = await Batch.findById(batchId)
      .populate('studentAssignments.student', 'name email')
      .populate('studentAssignments.assignedSubjects.teacher', 'name email')
      .populate('subjects.teacher', 'name email');

    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    const allStudents = await User.find({ role: 'user' }).select('name email');
    
    const studentsWithStatus = allStudents.map(student => {
      const assignment = batch.studentAssignments.find(a => 
        a.student._id.toString() === student._id.toString()
      );
      
      return {
        ...student.toObject(),
        isAssigned: !!assignment,
        assignedClasses: assignment?.assignedClasses || [],
        assignedSubjects: assignment?.assignedSubjects?.map(s => s.subjectName) || [],
        enrolledAt: assignment?.enrolledAt
      };
    });

    res.json({
      success: true,
      data: {
        batch,
        students: studentsWithStatus,
        availableClasses: batch.classes,
        availableSubjects: batch.subjects,
        statistics: {
          totalStudents: batch.studentCount,
          totalSubjects: batch.subjectCount,
          totalClasses: batch.classes.length,
          assignedTeachers: batch.subjects.filter(s => s.teacher).length,
          unassignedSubjects: batch.subjects.filter(s => !s.teacher).length,
          isActive: batch.isActive
        }
      }
    });
  } catch (error) {
    console.error('Error in getStudentsWithAssignments:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch student assignments' });
  }
};

// NEW: Get teachers with assignment data
const getTeachersWithAssignments = async (req, res) => {
  try {
    const { batchId } = req.params;
    
    const batch = await Batch.findById(batchId)
      .populate('subjects.teacher', 'name email');

    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    const allTeachers = await User.find({ role: 'teacher' }).select('name email');
    
    res.json({
      success: true,
      data: {
        batch,
        teachers: allTeachers,
        availableSubjects: batch.subjects,
        statistics: {
          totalSubjects: batch.subjectCount,
          assignedTeachers: batch.subjects.filter(s => s.teacher).length,
          unassignedSubjects: batch.subjects.filter(s => !s.teacher).length
        }
      }
    });
  } catch (error) {
    console.error('Error in getTeachersWithAssignments:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch teacher assignments' });
  }
};

module.exports = {
  createBatch,
  getAllBatches,
  getBatchById,
  updateBatch,
  deleteBatch,
  assignStudentsToBatch,
  assignStudentsEnhanced, // NEW
  removeStudentsFromBatch,
  assignTeachersEnhanced, // NEW
  assignTeacherToSubject,
  getEligibleStudents,
  getAllTeachers,
  getBatchesByCategory,
  getTeacherBatches,
  getTeacherBatchById,
  getBatchStatistics,
  getStudentsWithAssignments,
  getTeachersWithAssignments // NEW
};