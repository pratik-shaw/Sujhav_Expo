const Test = require('../models/Test');
const Batch = require('../models/Batch');
const User = require('../models/User');
const multer = require('multer');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    cb(file.mimetype === 'application/pdf' ? null : new Error('Only PDF files allowed'), 
       file.mimetype === 'application/pdf');
  }
}).fields([
  { name: 'questionPdf', maxCount: 1 },
  { name: 'answerPdf', maxCount: 1 }
]);

// Helper function to validate teacher access to batch/subject
const validateTeacherAccess = async (teacherId, batchId, subjectName) => {
  try {
    console.log('Validating teacher access:', { teacherId, batchId, subjectName });
    
    const batch = await Batch.findById(batchId).populate('subjects.teacher');
    if (!batch) {
      console.log('Batch not found:', batchId);
      return { valid: false, message: 'Batch not found' };
    }
    
    console.log('Batch found:', batch.batchName);
    console.log('Batch subjects:', batch.subjects);
    
    // More robust subject finding with detailed logging
    const subject = batch.subjects.find(s => {
      console.log('Checking subject:', {
        subjectName: s.name,
        teacherId: s.teacher ? s.teacher._id || s.teacher : null,
        requestedSubject: subjectName,
        requestedTeacher: teacherId
      });
      
      const teacherIdMatch = s.teacher && 
        (s.teacher._id ? s.teacher._id.toString() : s.teacher.toString()) === teacherId.toString();
      
      const subjectNameMatch = s.name === subjectName;
      
      console.log('Match results:', { teacherIdMatch, subjectNameMatch });
      
      return subjectNameMatch && teacherIdMatch;
    });
    
    if (!subject) {
      console.log('Subject not found or teacher not assigned');
      console.log('Available subjects for this teacher:', 
        batch.subjects
          .filter(s => s.teacher && 
            (s.teacher._id ? s.teacher._id.toString() : s.teacher.toString()) === teacherId.toString())
          .map(s => s.name)
      );
      
      return { 
        valid: false, 
        message: 'You are not assigned to this subject in this batch',
        availableSubjects: batch.subjects
          .filter(s => s.teacher && 
            (s.teacher._id ? s.teacher._id.toString() : s.teacher.toString()) === teacherId.toString())
          .map(s => s.name)
      };
    }
    
    console.log('Teacher access validated successfully');
    return { valid: true, batch, subject };
  } catch (error) {
    console.error('Error validating teacher access:', error);
    return { valid: false, message: 'Error validating access' };
  }
};

// Helper function to get eligible students for a class/subject
const getEligibleStudentsForTest = (batch, className, subjectName) => {
  console.log('Getting eligible students for:', { className, subjectName });
  
  const eligibleStudents = batch.studentAssignments.filter(assignment => {
    const hasClass = assignment.assignedClasses.includes(className);
    const hasSubject = assignment.assignedSubjects.some(s => 
      s.subjectName === subjectName && s.subjectName.trim() === subjectName.trim()
    );
    
    console.log(`Student ${assignment.student}: hasClass=${hasClass}, hasSubject=${hasSubject}`);
    return hasClass && hasSubject;
  }).map(assignment => assignment.student);
  
  console.log('Eligible student IDs:', eligibleStudents);
  return eligibleStudents;
};

// Create test with class and subject selection
const createTest = async (req, res) => {
  try {
    const {
      testTitle, fullMarks, batchId, className, subjectName,
      assignedStudents, dueDate, instructions, isActive
    } = req.body;

    // Validate required fields
    if (!testTitle?.trim() || !fullMarks || !batchId || !className || !subjectName) {
      return res.status(400).json({
        success: false,
        message: 'Test title, marks, batch, class, and subject are required'
      });
    }

    // Simple teacher access validation - check if teacher is assigned to this batch/subject
    const batch = await Batch.findById(batchId).populate('subjects.teacher');
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    // Check if teacher is assigned to the subject in this batch
    const teacherSubject = batch.subjects.find(s => 
      s.name === subjectName && 
      s.teacher && 
      s.teacher._id.toString() === req.user.id
    );

    if (!teacherSubject) {
      // Get available subjects for this teacher in this batch
      const availableSubjects = batch.subjects
        .filter(s => s.teacher && s.teacher._id.toString() === req.user.id)
        .map(s => s.name);
      
      return res.status(403).json({
        success: false,
        message: `You are not assigned to teach ${subjectName} in this batch. Available subjects: ${availableSubjects.join(', ') || 'None'}`,
        availableSubjects
      });
    }

    // Validate class exists in batch
    if (!batch.classes.includes(className)) {
      return res.status(400).json({
        success: false,
        message: 'Selected class is not available in this batch',
        availableClasses: batch.classes
      });
    }

    // Get eligible students for this class/subject
    const eligibleStudents = getEligibleStudentsForTest(batch, className, subjectName);
    let validatedStudents = [];

    if (assignedStudents?.length) {
      const studentIds = Array.isArray(assignedStudents) ? assignedStudents : JSON.parse(assignedStudents);
      const eligibleIds = eligibleStudents.map(s => s.toString());
      
      const invalidStudents = studentIds.filter(id => !eligibleIds.includes(id));
      if (invalidStudents.length) {
        return res.status(400).json({
          success: false,
          message: 'Some students are not eligible for this class/subject'
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
      className,
      subjectName,
      assignedStudents: validatedStudents,
      instructions: instructions?.trim() || '',
      dueDate: dueDate ? new Date(dueDate) : null,
      isActive: isActive !== undefined ? isActive : true
    };

    // Handle file uploads
    ['questionPdf', 'answerPdf'].forEach(fileType => {
      if (req.files?.[fileType]) {
        const file = req.files[fileType][0];
        testData[fileType] = {
          fileName: file.originalname,
          fileData: file.buffer,
          mimeType: file.mimetype,
          fileSize: file.size
        };
      }
    });

    const savedTest = await new Test(testData).save();
    const populatedTest = await Test.findById(savedTest._id)
      .populate('createdBy', 'name email')
      .populate('batch', 'batchName category')
      .populate('assignedStudents.student', 'name email')
      .select('-questionPdf.fileData -answerPdf.fileData');

    // Add file existence flags
    if (populatedTest) {
      populatedTest._doc.hasQuestionPdf = !!savedTest.questionPdf;
      populatedTest._doc.hasAnswerPdf = !!savedTest.answerPdf;
    }

    res.status(201).json({
      success: true,
      message: 'Test created successfully',
      data: populatedTest
    });
  } catch (error) {
    console.error('Test creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get teacher's tests (filtered by their assigned subjects)
const getTeacherTests = async (req, res) => {
  try {
    const teacherBatches = await Batch.find({
      'subjects.teacher': req.user.id,
      isActive: true
    }).select('_id subjects');

    const teacherSubjects = [];
    teacherBatches.forEach(batch => {
      batch.subjects.forEach(subject => {
        if (subject.teacher?.toString() === req.user.id) {
          teacherSubjects.push({
            batchId: batch._id,
            subjectName: subject.name
          });
        }
      });
    });

    const batchSubjectPairs = teacherSubjects.map(ts => ({
      batch: ts.batchId,
      subjectName: ts.subjectName
    }));

    const tests = await Test.find({
      $or: batchSubjectPairs
    })
      .populate('createdBy', 'name email')
      .populate('batch', 'batchName category')
      .populate('assignedStudents.student', 'name email')
      .select('-questionPdf.fileData -answerPdf.fileData')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: tests, count: tests.length });
  } catch (error) {
    console.error('Error fetching teacher tests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tests',
      error: error.message
    });
  }
};

// Get tests for specific batch/subject (Teacher only)
const getBatchSubjectTests = async (req, res) => {
  try {
    const { batchId, subjectName } = req.params;
    
    // Fix: Handle string 'undefined' from URL params
    const actualSubjectName = subjectName === 'undefined' ? undefined : subjectName;
    
    // Skip validation if no subject name provided - just fetch all teacher's tests for the batch
    if (!actualSubjectName) {
      // Get all teacher's subjects for this batch
      const teacherBatches = await Batch.find({
        _id: batchId,
        'subjects.teacher': req.user.id,
        isActive: true
      }).select('_id subjects');

      if (!teacherBatches.length) {
        return res.status(403).json({ 
          success: false, 
          message: 'You are not assigned to any subjects in this batch' 
        });
      }

      const batch = teacherBatches[0];
      const teacherSubjects = batch.subjects
        .filter(s => s.teacher && s.teacher.toString() === req.user.id)
        .map(s => s.name);

      if (!teacherSubjects.length) {
        return res.status(403).json({ 
          success: false, 
          message: 'You are not assigned to any subjects in this batch' 
        });
      }

      // Fetch tests for all teacher's subjects in this batch
      const tests = await Test.find({ 
        batch: batchId, 
        subjectName: { $in: teacherSubjects }
      })
        .populate('createdBy', 'name email')
        .populate('batch', 'batchName category')
        .populate('assignedStudents.student', 'name email')
        .select('-questionPdf.fileData -answerPdf.fileData')
        .sort({ createdAt: -1 });

      return res.json({ success: true, data: tests, count: tests.length });
    }
    
    // Original validation for specific subject
    const { valid, message } = await validateTeacherAccess(req.user.id, batchId, actualSubjectName);
    if (!valid) {
      return res.status(403).json({ success: false, message });
    }

    const tests = await Test.find({ 
      batch: batchId, 
      subjectName: actualSubjectName 
    })
      .populate('createdBy', 'name email')
      .populate('batch', 'batchName category')
      .populate('assignedStudents.student', 'name email')
      .select('-questionPdf.fileData -answerPdf.fileData')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: tests, count: tests.length });
  } catch (error) {
    console.error('Error fetching batch tests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch batch tests',
      error: error.message
    });
  }
};

// Get available students for test creation (filtered by class/subject)
const getAvailableStudentsForTest = async (req, res) => {
  try {
    const { batchId, className, subjectName } = req.params;
    
    console.log('Fetching students for:', { batchId, className, subjectName });
    
    const { valid, message, batch } = await validateTeacherAccess(req.user.id, batchId, subjectName);
    if (!valid) {
      return res.status(403).json({ success: false, message });
    }

    if (!batch.classes.includes(className)) {
      return res.status(400).json({
        success: false,
        message: `Class "${className}" is not available in this batch`,
        availableClasses: batch.classes
      });
    }

    const eligibleStudentIds = getEligibleStudentsForTest(batch, className, subjectName);
    console.log('Eligible student IDs from helper:', eligibleStudentIds);
    
    if (eligibleStudentIds.length === 0) {
      return res.json({
        success: true,
        data: [],
        count: 0,
        message: `No students found assigned to both "${className}" class and "${subjectName}" subject`
      });
    }

    console.log('Attempting to fetch students with IDs:', eligibleStudentIds);
    
    // ✅ FIXED: Query for role: 'user' instead of role: 'student'
    const populatedStudents = await User.find({
      _id: { $in: eligibleStudentIds },
      role: 'user' // ✅ Changed from 'student' to 'user'
    }).select('name email');
    
    console.log('Found students:', populatedStudents.length);
    console.log('Students data to return:', populatedStudents.map(s => ({ 
      id: s._id, 
      name: s.name, 
      email: s.email 
    })));

    res.json({
      success: true,
      data: populatedStudents,
      count: populatedStudents.length,
      debug: {
        eligibleIds: eligibleStudentIds.length,
        foundStudents: populatedStudents.length,
        idsUsed: eligibleStudentIds.map(id => id.toString())
      }
    });
    
  } catch (error) {
    console.error('Error fetching available students:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available students',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Update test (with class/subject validation)
const updateTest = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      testTitle, fullMarks, className, subjectName,
      assignedStudents, dueDate, instructions, isActive
    } = req.body;

    const test = await Test.findById(id);
    if (!test || test.createdBy.toString() !== req.user.id) {
      return res.status(404).json({
        success: false,
        message: 'Test not found or unauthorized'
      });
    }

    // If class/subject is being changed, validate access
    if (className || subjectName) {
      const targetClass = className || test.className;
      const targetSubject = subjectName || test.subjectName;
      
      const { valid, message, batch } = await validateTeacherAccess(
        req.user.id, test.batch, targetSubject
      );
      if (!valid) {
        return res.status(403).json({ success: false, message });
      }

      if (!batch.classes.includes(targetClass)) {
        return res.status(400).json({
          success: false,
          message: 'Selected class is not available in this batch'
        });
      }
    }

    // Handle student assignment updates
    let validatedStudents = test.assignedStudents;
    if (assignedStudents) {
      const batch = await Batch.findById(test.batch);
      const eligibleStudents = getEligibleStudentsForTest(
        batch, 
        className || test.className, 
        subjectName || test.subjectName
      );
      
      const studentIds = Array.isArray(assignedStudents) ? 
        assignedStudents : JSON.parse(assignedStudents);
      
      const eligibleIds = eligibleStudents.map(s => s.toString());
      const invalidStudents = studentIds.filter(id => !eligibleIds.includes(id));
      
      if (invalidStudents.length) {
        return res.status(400).json({
          success: false,
          message: 'Some students are not eligible for this class/subject'
        });
      }

      // Preserve existing data
      const existingData = {};
      test.assignedStudents.forEach(s => {
        existingData[s.student.toString()] = {
          marksScored: s.marksScored,
          submittedAt: s.submittedAt,
          evaluatedAt: s.evaluatedAt
        };
      });

      validatedStudents = studentIds.map(id => ({
        student: id,
        ...existingData[id] || { marksScored: null, submittedAt: null, evaluatedAt: null }
      }));
    }

    // Prepare update data
    const updateData = {};
    if (testTitle) updateData.testTitle = testTitle.trim();
    if (fullMarks) updateData.fullMarks = parseInt(fullMarks);
    if (className) updateData.className = className;
    if (subjectName) updateData.subjectName = subjectName;
    if (assignedStudents) updateData.assignedStudents = validatedStudents;
    if (instructions !== undefined) updateData.instructions = instructions.trim();
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Handle file uploads
    ['questionPdf', 'answerPdf'].forEach(fileType => {
      if (req.files?.[fileType]) {
        const file = req.files[fileType][0];
        updateData[fileType] = {
          fileName: file.originalname,
          fileData: file.buffer,
          mimeType: file.mimetype,
          fileSize: file.size
        };
      }
    });

    const updatedTest = await Test.findByIdAndUpdate(id, updateData, { 
      new: true, 
      runValidators: true 
    })
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

// Student Reports - Subject-wise performance
const getStudentSubjectReports = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { subjectName, batchId } = req.query;
    
    // First, verify the user has role 'user' (student)
    const user = await User.findById(studentId);
    if (!user || user.role !== 'user') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Student role required.'
      });
    }
    
    // Build query filters
    const query = {
      'assignedStudents.student': studentId,
      isActive: true
    };
    
    if (subjectName) query.subjectName = subjectName;
    if (batchId) query.batch = batchId;

    const tests = await Test.find(query)
      .populate('createdBy', 'name email')
      .populate('batch', 'batchName category')
      .select('-questionPdf.fileData -answerPdf.fileData')
      .sort({ createdAt: -1 });

    // Group by subject
    const subjectReports = {};
    
    tests.forEach(test => {
      const studentData = test.assignedStudents.find(
        s => s.student.toString() === studentId
      );
      
      if (!subjectReports[test.subjectName]) {
        subjectReports[test.subjectName] = {
          subjectName: test.subjectName,
          tests: [],
          totalTests: 0,
          evaluatedTests: 0,
          averagePercentage: 0,
          totalMarks: 0,
          totalFullMarks: 0
        };
      }
      
      const testData = {
        testId: test._id,
        testTitle: test.testTitle,
        fullMarks: test.fullMarks,
        marksScored: studentData.marksScored,
        className: test.className,
        createdAt: test.createdAt,
        evaluatedAt: studentData.evaluatedAt,
        batch: test.batch,
        percentage: studentData.marksScored ? 
          ((studentData.marksScored / test.fullMarks) * 100).toFixed(2) : null
      };
      
      subjectReports[test.subjectName].tests.push(testData);
      subjectReports[test.subjectName].totalTests++;
      
      if (studentData.marksScored !== null) {
        subjectReports[test.subjectName].evaluatedTests++;
        subjectReports[test.subjectName].totalMarks += studentData.marksScored;
        subjectReports[test.subjectName].totalFullMarks += test.fullMarks;
      }
    });

    // Calculate averages
    Object.values(subjectReports).forEach(report => {
      if (report.totalFullMarks > 0) {
        report.averagePercentage = parseFloat(
          ((report.totalMarks / report.totalFullMarks) * 100).toFixed(2)
        );
      }
    });

    res.json({
      success: true,
      data: Object.values(subjectReports),
      count: Object.keys(subjectReports).length
    });
  } catch (error) {
    console.error('Error fetching student reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student reports',
      error: error.message
    });
  }
};

// Get student's comprehensive reports with batch/subject breakdown
const getComprehensiveUserReports = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check batch assignments
    const batches = await Batch.find({
      'studentAssignments.student': userId
    })
      .populate('subjects.teacher', 'name email')
      .select('batchName category classes subjects studentAssignments');

    if (!batches.length) {
      return res.json({
        success: true,
        isAssigned: false,
        message: 'User is not assigned to any batch',
        data: { batches: [], tests: [], totalTests: 0, totalBatches: 0 }
      });
    }

    // Get user's class and subject assignments
    const userAssignments = [];
    batches.forEach(batch => {
      const assignment = batch.studentAssignments.find(
        a => a.student.toString() === userId
      );
      if (assignment) {
        assignment.assignedSubjects.forEach(subjectAssignment => {
          userAssignments.push({
            batchId: batch._id,
            batchName: batch.batchName,
            category: batch.category,
            subjectName: subjectAssignment.subjectName,
            classes: assignment.assignedClasses
          });
        });
      }
    });

    // Find tests for user's assigned subjects
    const subjectQueries = userAssignments.map(assignment => ({
      batch: assignment.batchId,
      subjectName: assignment.subjectName,
      'assignedStudents.student': userId
    }));

    const tests = await Test.find({
      $or: subjectQueries,
      isActive: true
    })
      .populate('createdBy', 'name email')
      .populate('batch', 'batchName category')
      .select('-questionPdf.fileData -answerPdf.fileData')
      .sort({ createdAt: -1 });

    // Format test data with subject context
    const studentReports = tests.map(test => {
      const studentData = test.assignedStudents.find(
        s => s.student.toString() === userId
      );
      
      const assignment = userAssignments.find(
        a => a.batchId.toString() === test.batch._id.toString() && 
             a.subjectName === test.subjectName
      );
      
      return {
        testId: test._id,
        testTitle: test.testTitle,
        fullMarks: test.fullMarks,
        marksScored: studentData.marksScored,
        className: test.className,
        subjectName: test.subjectName,
        createdAt: test.createdAt,
        evaluatedAt: studentData.evaluatedAt,
        batch: test.batch,
        assignment: assignment,
        percentage: studentData.marksScored ? 
          ((studentData.marksScored / test.fullMarks) * 100).toFixed(2) : null,
        status: studentData.marksScored !== null ? 'evaluated' : 'pending',
        hasQuestionPdf: !!test.questionPdf,
        hasAnswerPdf: !!test.answerPdf
      };
    });

    // Calculate statistics
    const evaluatedTests = studentReports.filter(test => test.marksScored !== null);
    const totalPercentage = evaluatedTests.reduce(
      (sum, test) => sum + parseFloat(test.percentage || '0'), 0
    );

    res.json({
      success: true,
      isAssigned: true,
      data: {
        batches: batches.map(batch => ({
          _id: batch._id,
          batchName: batch.batchName,
          category: batch.category,
          classes: batch.classes,
          subjects: batch.subjects,
          userAssignment: batch.studentAssignments.find(
            a => a.student.toString() === userId
          )
        })),
        tests: studentReports,
        userAssignments,
        statistics: {
          totalTests: studentReports.length,
          evaluatedTests: evaluatedTests.length,
          pendingTests: studentReports.length - evaluatedTests.length,
          averagePercentage: evaluatedTests.length > 0 ? 
            (totalPercentage / evaluatedTests.length).toFixed(2) : '0',
          totalMarksScored: evaluatedTests.reduce(
            (sum, test) => sum + (test.marksScored || 0), 0
          ),
          totalFullMarks: evaluatedTests.reduce(
            (sum, test) => sum + test.fullMarks, 0
          )
        }
      }
    });
  } catch (error) {
    console.error('Error fetching comprehensive reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch comprehensive reports',
      error: error.message
    });
  }
};

// Reuse other functions with minimal changes
const deleteTest = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test || test.createdBy.toString() !== req.user.id) {
      return res.status(404).json({
        success: false,
        message: 'Test not found or unauthorized'
      });
    }

    await Test.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Test deleted successfully' });
  } catch (error) {
    console.error('Error deleting test:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete test',
      error: error.message
    });
  }
};

const updateStudentMarks = async (req, res) => {
  try {
    const { id } = req.params;
    const { studentId, marksScored } = req.body;

    if (!studentId || marksScored === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Student ID and marks are required'
      });
    }

    const test = await Test.findById(id);
    if (!test || test.createdBy.toString() !== req.user.id) {
      return res.status(404).json({
        success: false,
        message: 'Test not found or unauthorized'
      });
    }

    if (marksScored < 0 || marksScored > test.fullMarks) {
      return res.status(400).json({
        success: false,
        message: `Marks must be between 0 and ${test.fullMarks}`
      });
    }

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
      message: 'Marks updated successfully',
      data: updatedTest
    });
  } catch (error) {
    console.error('Error updating marks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update marks',
      error: error.message
    });
  }
};

// Download PDF functions (unchanged)
const downloadPdf = async (req, res) => {
  try {
    const { id, type } = req.params;
    
    if (!['question', 'answer'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid PDF type'
      });
    }

    const test = await Test.findById(id);
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found' });
    }

    // Validate access
    const { valid } = await validateTeacherAccess(req.user.id, test.batch, test.subjectName);
    if (!valid) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const pdfField = `${type}Pdf`;
    const pdf = test[pdfField];

    if (!pdf?.fileData) {
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

const downloadQuestionPdfForStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = req.user.id;

    const test = await Test.findById(id);
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found' });
    }

    const studentAssignment = test.assignedStudents.find(
      s => s.student.toString() === studentId
    );

    if (!studentAssignment) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this test'
      });
    }

    const pdf = test.questionPdf;
    if (!pdf?.fileData) {
      return res.status(404).json({
        success: false,
        message: 'Question PDF not found'
      });
    }

    res.set({
      'Content-Type': pdf.mimeType,
      'Content-Disposition': `attachment; filename="${pdf.fileName}"`,
      'Content-Length': pdf.fileSize
    });

    res.send(pdf.fileData);
  } catch (error) {
    console.error('Error downloading question PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download question PDF',
      error: error.message
    });
  }
};

const downloadAnswerPdfForStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = req.user.id;

    const test = await Test.findById(id);
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found' });
    }

    const studentAssignment = test.assignedStudents.find(
      s => s.student.toString() === studentId
    );

    if (!studentAssignment) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this test'
      });
    }

    const pdf = test.answerPdf;
    if (!pdf?.fileData) {
      return res.status(404).json({
        success: false,
        message: 'Answer PDF not found'
      });
    }

    res.set({
      'Content-Type': pdf.mimeType,
      'Content-Disposition': `attachment; filename="${pdf.fileName}"`,
      'Content-Length': pdf.fileSize
    });

    res.send(pdf.fileData);
  } catch (error) {
    console.error('Error downloading answer PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download answer PDF',
      error: error.message
    });
  }
};
const getTeacherSubjectsForBatch = async (req, res) => {
  try {
    const { batchId } = req.params;
    const teacherId = req.user.id;

    const batch = await Batch.findById(batchId).populate('subjects.teacher', 'name email');
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    // Get subjects assigned to this teacher
    const teacherSubjects = batch.subjects
      .filter(s => s.teacher && s.teacher._id.toString() === teacherId)
      .map(s => ({
        name: s.name,
        teacher: s.teacher
      }));

    res.json({
      success: true,
      data: {
        batch: {
          _id: batch._id,
          batchName: batch.batchName,
          category: batch.category,
          classes: batch.classes
        },
        subjects: teacherSubjects
      }
    });
  } catch (error) {
    console.error('Error fetching teacher subjects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teacher subjects',
      error: error.message
    });
  }
};

module.exports = {
  upload,
  createTest,
  getTeacherTests,
  getBatchSubjectTests,
  getAvailableStudentsForTest,
  updateTest,
  deleteTest,
  updateStudentMarks,
  downloadPdf,
  getStudentSubjectReports,
  getComprehensiveUserReports,
  downloadQuestionPdfForStudent,
  downloadAnswerPdfForStudent,
  getTeacherSubjectsForBatch
};