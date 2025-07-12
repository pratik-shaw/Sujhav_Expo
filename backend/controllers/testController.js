const Test = require('../models/Test');
const Batch = require('../models/Batch');
const User = require('../models/User');
const multer = require('multer');

// Configure multer for file uploads (store in memory)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
}).fields([
  { name: 'questionPdf', maxCount: 1 },
  { name: 'answerPdf', maxCount: 1 }
]);

// Create a new test (Teacher only)
const createTest = async (req, res) => {
  try {
    console.log('Creating test with body:', req.body);
    console.log('User creating test:', req.user);
    console.log('Files:', req.files);

    const {
      testTitle,
      fullMarks,
      batchId,
      assignedStudents,
      dueDate,
      instructions
    } = req.body;

    // Validate required fields
    if (!testTitle || !fullMarks || !batchId) {
      return res.status(400).json({
        success: false,
        message: 'Test title, full marks, and batch ID are required'
      });
    }

    // Validate batch exists
    const batch = await Batch.findById(batchId);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    // Check if teacher is assigned to this batch
    const isTeacherAssigned = batch.teachers.some(
      teacherId => teacherId.toString() === req.user.id
    );

    if (!isTeacherAssigned) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this batch'
      });
    }

    // Validate assigned students if provided
    let validatedStudents = [];
    if (assignedStudents && assignedStudents.length > 0) {
      const studentIds = typeof assignedStudents === 'string' 
        ? JSON.parse(assignedStudents) 
        : assignedStudents;

      // Check if all students are in the batch
      const batchStudentIds = batch.students.map(s => s.toString());
      const invalidStudents = studentIds.filter(id => !batchStudentIds.includes(id));
      
      if (invalidStudents.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Some selected students are not in this batch'
        });
      }

      // Validate student users exist and have correct role
      const studentUsers = await User.find({
        _id: { $in: studentIds },
        role: 'user'
      });

      if (studentUsers.length !== studentIds.length) {
        return res.status(400).json({
          success: false,
          message: 'All selected students must have valid user accounts'
        });
      }

      validatedStudents = studentIds.map(id => ({
        student: id,
        marksScored: null,
        submittedAt: null,
        evaluatedAt: null
      }));
    }

    // Prepare test data
    const testData = {
      testTitle: testTitle.trim(),
      fullMarks: parseInt(fullMarks),
      createdBy: req.user.id,
      batch: batchId,
      assignedStudents: validatedStudents,
      instructions: instructions ? instructions.trim() : '',
      dueDate: dueDate ? new Date(dueDate) : null
    };

    // Handle question PDF upload
    if (req.files && req.files.questionPdf) {
      const questionFile = req.files.questionPdf[0];
      testData.questionPdf = {
        fileName: questionFile.originalname,
        fileData: questionFile.buffer,
        mimeType: questionFile.mimetype,
        fileSize: questionFile.size
      };
    }

    // Handle answer PDF upload
    if (req.files && req.files.answerPdf) {
      const answerFile = req.files.answerPdf[0];
      testData.answerPdf = {
        fileName: answerFile.originalname,
        fileData: answerFile.buffer,
        mimeType: answerFile.mimetype,
        fileSize: answerFile.size
      };
    }

    // Create and save test
    const newTest = new Test(testData);
    const savedTest = await newTest.save();

    // Populate the saved test with user and batch details
    const populatedTest = await Test.findById(savedTest._id)
      .populate('createdBy', 'name email')
      .populate('batch', 'batchName category')
      .populate('assignedStudents.student', 'name email')
      .select('-questionPdf.fileData -answerPdf.fileData'); // Exclude file data from response

    console.log('Test created successfully:', populatedTest);

    res.status(201).json({
      success: true,
      message: 'Test created successfully',
      data: populatedTest
    });

  } catch (error) {
    console.error('Error creating test:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get all tests created by the teacher
const getTeacherTests = async (req, res) => {
  try {
    const tests = await Test.find({ createdBy: req.user.id })
      .populate('createdBy', 'name email')
      .populate('batch', 'batchName category')
      .populate('assignedStudents.student', 'name email')
      .select('-questionPdf.fileData -answerPdf.fileData')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: tests,
      count: tests.length
    });
  } catch (error) {
    console.error('Error fetching teacher tests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tests',
      error: error.message
    });
  }
};

// Get all tests for a specific batch (Teacher only for their batches)
const getBatchTests = async (req, res) => {
  try {
    const { batchId } = req.params;

    // Validate batch exists and teacher is assigned
    const batch = await Batch.findById(batchId);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    const isTeacherAssigned = batch.teachers.some(
      teacherId => teacherId.toString() === req.user.id
    );

    if (!isTeacherAssigned) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this batch'
      });
    }

    const tests = await Test.find({ batch: batchId })
      .populate('createdBy', 'name email')
      .populate('batch', 'batchName category')
      .populate('assignedStudents.student', 'name email')
      .select('-questionPdf.fileData -answerPdf.fileData')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: tests,
      count: tests.length
    });
  } catch (error) {
    console.error('Error fetching batch tests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch batch tests',
      error: error.message
    });
  }
};

// Get test by ID (Teacher only for their batches)
const getTestById = async (req, res) => {
  try {
    const { id } = req.params;

    const test = await Test.findById(id)
      .populate('createdBy', 'name email')
      .populate('batch', 'batchName category')
      .populate('assignedStudents.student', 'name email')
      .select('-questionPdf.fileData -answerPdf.fileData');

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    // Check if teacher is assigned to this batch
    const batch = await Batch.findById(test.batch._id);
    const isTeacherAssigned = batch.teachers.some(
      teacherId => teacherId.toString() === req.user.id
    );

    if (!isTeacherAssigned) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this batch'
      });
    }

    res.json({
      success: true,
      data: test
    });
  } catch (error) {
    console.error('Error fetching test:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch test',
      error: error.message
    });
  }
};

// Update test (Teacher only for their own tests)
const updateTest = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      testTitle,
      fullMarks,
      assignedStudents,
      dueDate,
      instructions,
      isActive
    } = req.body;

    // Find test and verify ownership
    const test = await Test.findById(id);
    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    if (test.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own tests'
      });
    }

    // Validate assigned students if provided
    let validatedStudents = test.assignedStudents;
    if (assignedStudents && assignedStudents.length > 0) {
      const studentIds = typeof assignedStudents === 'string' 
        ? JSON.parse(assignedStudents) 
        : assignedStudents;

      // Get batch info
      const batch = await Batch.findById(test.batch);
      const batchStudentIds = batch.students.map(s => s.toString());
      const invalidStudents = studentIds.filter(id => !batchStudentIds.includes(id));
      
      if (invalidStudents.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Some selected students are not in this batch'
        });
      }

      // Preserve existing marks for students who were already assigned
      const existingStudentData = {};
      test.assignedStudents.forEach(s => {
        existingStudentData[s.student.toString()] = {
          marksScored: s.marksScored,
          submittedAt: s.submittedAt,
          evaluatedAt: s.evaluatedAt
        };
      });

      validatedStudents = studentIds.map(id => ({
        student: id,
        marksScored: existingStudentData[id]?.marksScored || null,
        submittedAt: existingStudentData[id]?.submittedAt || null,
        evaluatedAt: existingStudentData[id]?.evaluatedAt || null
      }));
    }

    // Prepare update data
    const updateData = {};
    if (testTitle) updateData.testTitle = testTitle.trim();
    if (fullMarks) updateData.fullMarks = parseInt(fullMarks);
    if (assignedStudents) updateData.assignedStudents = validatedStudents;
    if (instructions !== undefined) updateData.instructions = instructions.trim();
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Handle file uploads
    if (req.files && req.files.questionPdf) {
      const questionFile = req.files.questionPdf[0];
      updateData.questionPdf = {
        fileName: questionFile.originalname,
        fileData: questionFile.buffer,
        mimeType: questionFile.mimetype,
        fileSize: questionFile.size
      };
    }

    if (req.files && req.files.answerPdf) {
      const answerFile = req.files.answerPdf[0];
      updateData.answerPdf = {
        fileName: answerFile.originalname,
        fileData: answerFile.buffer,
        mimeType: answerFile.mimetype,
        fileSize: answerFile.size
      };
    }

    // Update test
    const updatedTest = await Test.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('createdBy', 'name email')
      .populate('batch', 'batchName category')
      .populate('assignedStudents.student', 'name email')
      .select('-questionPdf.fileData -answerPdf.fileData');

    res.json({
      success: true,
      message: 'Test updated successfully',
      data: updatedTest
    });

  } catch (error) {
    console.error('Error updating test:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update test',
      error: error.message
    });
  }
};

// Delete test (Teacher only for their own tests)
const deleteTest = async (req, res) => {
  try {
    const { id } = req.params;

    const test = await Test.findById(id);
    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    if (test.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own tests'
      });
    }

    await Test.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Test deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting test:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete test',
      error: error.message
    });
  }
};

// Update student marks (Teacher only)
const updateStudentMarks = async (req, res) => {
  try {
    const { id } = req.params;
    const { studentId, marksScored } = req.body;

    if (!studentId || marksScored === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Student ID and marks scored are required'
      });
    }

    const test = await Test.findById(id);
    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    if (test.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only update marks for your own tests'
      });
    }

    if (marksScored < 0 || marksScored > test.fullMarks) {
      return res.status(400).json({
        success: false,
        message: `Marks must be between 0 and ${test.fullMarks}`
      });
    }

    // Find and update student marks
    const studentIndex = test.assignedStudents.findIndex(
      s => s.student.toString() === studentId
    );

    if (studentIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Student not found in this test'
      });
    }

    test.assignedStudents[studentIndex].marksScored = marksScored;
    test.assignedStudents[studentIndex].evaluatedAt = new Date();

    await test.save();

    const updatedTest = await Test.findById(id)
      .populate('createdBy', 'name email')
      .populate('batch', 'batchName category')
      .populate('assignedStudents.student', 'name email')
      .select('-questionPdf.fileData -answerPdf.fileData');

    res.json({
      success: true,
      message: 'Student marks updated successfully',
      data: updatedTest
    });

  } catch (error) {
    console.error('Error updating student marks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update student marks',
      error: error.message
    });
  }
};

// Get available students for a test (students in the batch)
const getAvailableStudentsForTest = async (req, res) => {
  try {
    const { batchId } = req.params;

    // Validate batch exists and teacher is assigned
    const batch = await Batch.findById(batchId)
      .populate('students', 'name email')
      .populate('teachers', 'name email');

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    const isTeacherAssigned = batch.teachers.some(
      teacher => teacher._id.toString() === req.user.id
    );

    if (!isTeacherAssigned) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this batch'
      });
    }

    res.json({
      success: true,
      data: batch.students,
      count: batch.students.length
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

// Download PDF files
const downloadPdf = async (req, res) => {
  try {
    const { id, type } = req.params;

    if (!['question', 'answer'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid PDF type. Must be "question" or "answer"'
      });
    }

    const test = await Test.findById(id);
    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    // Check if teacher is assigned to this batch
    const batch = await Batch.findById(test.batch);
    const isTeacherAssigned = batch.teachers.some(
      teacherId => teacherId.toString() === req.user.id
    );

    if (!isTeacherAssigned) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this batch'
      });
    }

    const pdfField = type === 'question' ? 'questionPdf' : 'answerPdf';
    const pdf = test[pdfField];

    if (!pdf || !pdf.fileData) {
      return res.status(404).json({
        success: false,
        message: `${type} PDF not found`
      });
    }

    res.set({
      'Content-Type': pdf.mimeType,
      'Content-Disposition': `attachment; filename="${pdf.fileName}"`,
      'Content-Length': pdf.fileSize
    });

    res.send(pdf.fileData);

  } catch (error) {
    console.error('Error downloading PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download PDF',
      error: error.message
    });
  }
};

// Add this function to your testController.js file

// Assign students to test (Teacher only)
const assignStudentsToTest = async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedStudents } = req.body;

    console.log('Assigning students to test:', id);
    console.log('Students to assign:', assignedStudents);

    // Validate input
    if (!Array.isArray(assignedStudents)) {
      return res.status(400).json({
        success: false,
        message: 'assignedStudents must be an array of student IDs'
      });
    }

    // Find test and verify ownership
    const test = await Test.findById(id);
    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    if (test.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only assign students to your own tests'
      });
    }

    // Get batch info to validate students
    const batch = await Batch.findById(test.batch);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    // Check if teacher is assigned to this batch
    const isTeacherAssigned = batch.teachers.some(
      teacherId => teacherId.toString() === req.user.id
    );

    if (!isTeacherAssigned) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this batch'
      });
    }

    // Validate all student IDs are in the batch
    const batchStudentIds = batch.students.map(s => s.toString());
    const invalidStudents = assignedStudents.filter(id => !batchStudentIds.includes(id));
    
    if (invalidStudents.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Some selected students are not in this batch'
      });
    }

    // Validate student users exist and have correct role
    if (assignedStudents.length > 0) {
      const studentUsers = await User.find({
        _id: { $in: assignedStudents },
        role: 'user'
      });

      if (studentUsers.length !== assignedStudents.length) {
        return res.status(400).json({
          success: false,
          message: 'All selected students must have valid user accounts'
        });
      }
    }

    // Preserve existing marks and submission data for students who were already assigned
    const existingStudentData = {};
    test.assignedStudents.forEach(s => {
      existingStudentData[s.student.toString()] = {
        marksScored: s.marksScored,
        submittedAt: s.submittedAt,
        evaluatedAt: s.evaluatedAt
      };
    });

    // Create new assignment array
    const newAssignedStudents = assignedStudents.map(studentId => ({
      student: studentId,
      marksScored: existingStudentData[studentId]?.marksScored || null,
      submittedAt: existingStudentData[studentId]?.submittedAt || null,
      evaluatedAt: existingStudentData[studentId]?.evaluatedAt || null
    }));

    // Update test with new assignments
    test.assignedStudents = newAssignedStudents;
    await test.save();

    // Return updated test with populated data
    const updatedTest = await Test.findById(id)
      .populate('createdBy', 'name email')
      .populate('batch', 'batchName category')
      .populate('assignedStudents.student', 'name email')
      .select('-questionPdf.fileData -answerPdf.fileData');

    console.log('Students assigned successfully:', updatedTest.assignedStudents.length);

    res.json({
      success: true,
      message: assignedStudents.length === 0 
        ? 'All students unassigned successfully' 
        : `${assignedStudents.length} students assigned successfully`,
      data: updatedTest
    });

  } catch (error) {
    console.error('Error assigning students to test:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign students to test',
      error: error.message
    });
  }
};

module.exports = {
  upload,
  createTest,
  getTeacherTests,
  getBatchTests,
  getTestById,
  updateTest,
  deleteTest,
  updateStudentMarks,
  assignStudentsToTest,
  getAvailableStudentsForTest,
  downloadPdf
};