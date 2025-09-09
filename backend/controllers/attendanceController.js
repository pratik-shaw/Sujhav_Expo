const Attendance = require('../models/Attendance');
const Batch = require('../models/Batch');

// Helper function to create date without timezone issues
const createLocalDate = (dateInput) => {
  if (typeof dateInput === 'string' && dateInput.match(/^\d{4}-\d{2}-\d{2}$/)) {
    // For YYYY-MM-DD format, create date in UTC to avoid timezone shifts
    return new Date(dateInput + 'T00:00:00.000Z');
  }
  
  if (dateInput instanceof Date) {
    // If it's already a Date object, normalize it to start of day in UTC
    const year = dateInput.getFullYear();
    const month = dateInput.getMonth();
    const day = dateInput.getDate();
    return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  }
  
  // Fallback: try to parse and normalize
  const date = new Date(dateInput);
  if (!isNaN(date.getTime())) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  }
  
  throw new Error('Invalid date format');
};

// Helper function to get date string for comparison
const getDateString = (date) => {
  return date.toISOString().split('T')[0];
};

// Mark attendance for a subject
const markAttendance = async (req, res) => {
  try {
    const { batchId, subject, date, studentAttendance } = req.body;
    const teacherId = req.user.id;

    if (!batchId || !subject || !date || !Array.isArray(studentAttendance)) {
      return res.status(400).json({
        success: false,
        message: 'Batch ID, subject, date, and student attendance are required'
      });
    }

    // Verify teacher is assigned to this subject in the batch
    const batch = await Batch.findById(batchId);
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    const subjectData = batch.subjects.find(s => 
      s.name === subject && s.teacher && s.teacher.toString() === teacherId
    );

    if (!subjectData) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to mark attendance for this subject'
      });
    }

    // FIXED: Use timezone-agnostic date creation
    let attendanceDate;
    try {
      attendanceDate = createLocalDate(date);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Please use YYYY-MM-DD format.'
      });
    }

    const dateString = getDateString(attendanceDate);

    console.log('Original date input:', date);
    console.log('Processed attendance date:', attendanceDate);
    console.log('Date string for storage:', dateString);

    // Check if attendance already exists for this date using date string comparison
    const existingAttendance = await Attendance.findOne({
      batch: batchId,
      subject: subject,
      date: attendanceDate
    });

    if (existingAttendance) {
      // Update existing attendance
      existingAttendance.studentAttendance = studentAttendance.map(sa => ({
        student: sa.student,
        status: sa.status,
        markedAt: new Date()
      }));
      
      await existingAttendance.save();
      
      const populatedAttendance = await Attendance.findById(existingAttendance._id)
        .populate('batch', 'batchName')
        .populate('teacher', 'name email')
        .populate('studentAttendance.student', 'name email');

      return res.json({
        success: true,
        message: 'Attendance updated successfully',
        data: populatedAttendance
      });
    }

    // Create new attendance record
    const newAttendance = new Attendance({
      batch: batchId,
      subject: subject,
      teacher: teacherId,
      date: attendanceDate,
      studentAttendance: studentAttendance.map(sa => ({
        student: sa.student,
        status: sa.status,
        markedAt: new Date()
      }))
    });

    await newAttendance.save();

    const populatedAttendance = await Attendance.findById(newAttendance._id)
      .populate('batch', 'batchName')
      .populate('teacher', 'name email')
      .populate('studentAttendance.student', 'name email');

    res.status(201).json({
      success: true,
      message: 'Attendance marked successfully',
      data: populatedAttendance
    });
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark attendance',
      error: error.message
    });
  }
};

// Get attendance for a specific date and subject
const getAttendanceByDate = async (req, res) => {
  try {
    const { batchId, subject, date } = req.params;
    const teacherId = req.user.id;

    // FIXED: Use timezone-agnostic date creation
    let queryDate;
    try {
      queryDate = createLocalDate(date);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Please use YYYY-MM-DD format.'
      });
    }

    console.log('Query date input:', date);
    console.log('Processed query date:', queryDate);

    const attendance = await Attendance.findOne({
      batch: batchId,
      subject: subject,
      teacher: teacherId,
      date: queryDate
    })
    .populate('batch', 'batchName')
    .populate('teacher', 'name email')
    .populate('studentAttendance.student', 'name email');

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found for this date'
      });
    }

    res.json({ success: true, data: attendance });
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance',
      error: error.message
    });
  }
};

// Get all attendance records for a subject
const getSubjectAttendance = async (req, res) => {
  try {
    const { batchId, subject } = req.params;
    const teacherId = req.user.id;
    const { startDate, endDate } = req.query;

    let dateFilter = {};
    if (startDate && endDate) {
      try {
        const start = createLocalDate(startDate);
        const end = createLocalDate(endDate);
        
        // Add 24 hours to end date to include the entire end day
        const endOfDay = new Date(end.getTime() + 24 * 60 * 60 * 1000);
        
        dateFilter = {
          date: {
            $gte: start,
            $lt: endOfDay
          }
        };
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format. Please use YYYY-MM-DD format.'
        });
      }
    }

    const attendance = await Attendance.find({
      batch: batchId,
      subject: subject,
      teacher: teacherId,
      ...dateFilter
    })
    .populate('batch', 'batchName')
    .populate('teacher', 'name email')
    .populate('studentAttendance.student', 'name email')
    .sort({ date: -1 });

    res.json({
      success: true,
      data: attendance,
      count: attendance.length
    });
  } catch (error) {
    console.error('Get subject attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subject attendance',
      error: error.message
    });
  }
};

// Get student attendance statistics
const getStudentStats = async (req, res) => {
  try {
    const { batchId, subject, studentId } = req.params;
    const teacherId = req.user.id;

    // Verify teacher has access to this subject
    const batch = await Batch.findById(batchId);
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    const subjectData = batch.subjects.find(s => 
      s.name === subject && s.teacher && s.teacher.toString() === teacherId
    );

    if (!subjectData) {
      return res.status(403).json({
        success: false,
        message: 'Access denied for this subject'
      });
    }

    const stats = await Attendance.getStudentStats(studentId, batchId, subject);
    
    // Get recent attendance records
    const recentAttendance = await Attendance.find({
      batch: batchId,
      subject: subject,
      'studentAttendance.student': studentId
    })
    .populate('studentAttendance.student', 'name email')
    .sort({ date: -1 })
    .limit(10);

    const studentRecords = recentAttendance.map(record => ({
      date: record.date,
      status: record.studentAttendance.find(sa => 
        sa.student._id.toString() === studentId
      )?.status || 'absent',
      markedAt: record.studentAttendance.find(sa => 
        sa.student._id.toString() === studentId
      )?.markedAt
    }));

    res.json({
      success: true,
      data: {
        statistics: stats,
        recentAttendance: studentRecords
      }
    });
  } catch (error) {
    console.error('Get student stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student statistics',
      error: error.message
    });
  }
};

// Get students for attendance marking
const getStudentsForAttendance = async (req, res) => {
  try {
    const { batchId, subject } = req.params;
    const teacherId = req.user.id;

    const batch = await Batch.findById(batchId)
      .populate('studentAssignments.student', 'name email');

    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    // Verify teacher is assigned to this subject
    const subjectData = batch.subjects.find(s => 
      s.name === subject && s.teacher && s.teacher.toString() === teacherId
    );

    if (!subjectData) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized for this subject'
      });
    }

    // Get students assigned to this subject
    const studentsForSubject = batch.studentAssignments
      .filter(assignment => 
        assignment.assignedSubjects.some(as => as.subjectName === subject)
      )
      .map(assignment => ({
        student: assignment.student,
        enrolledAt: assignment.enrolledAt
      }));

    res.json({
      success: true,
      data: {
        batch: {
          _id: batch._id,
          batchName: batch.batchName
        },
        subject: subject,
        students: studentsForSubject
      },
      count: studentsForSubject.length
    });
  } catch (error) {
    console.error('Get students for attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch students',
      error: error.message
    });
  }
};

const getStudentAttendanceRecords = async (req, res) => {
  try {
    const studentId = req.user.id;

    // Find all batches where this student is assigned
    const batches = await Batch.find({
      'studentAssignments.student': studentId
    }).populate('studentAssignments.student', 'name email');

    if (!batches || batches.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'You are not assigned to any batch'
      });
    }

    // Extract student's batch assignments
    const batchAssignments = [];
    for (const batch of batches) {
      const studentAssignment = batch.studentAssignments.find(
        assignment => assignment.student._id.toString() === studentId
      );
      
      if (studentAssignment) {
        batchAssignments.push({
          batchId: batch._id.toString(),
          batchName: batch.batchName,
          category: batch.category,
          assignedSubjects: studentAssignment.assignedSubjects.map(subject => ({
            subjectName: subject.subjectName,
            teacherId: subject.teacherId ? subject.teacherId.toString() : null,
            teacherName: subject.teacherName || 'Unknown'
          }))
        });
      }
    }

    if (batchAssignments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No valid batch assignments found'
      });
    }

    // Get attendance records for each subject
    const subjectAttendancePromises = [];
    
    for (const batchAssignment of batchAssignments) {
      for (const subject of batchAssignment.assignedSubjects) {
        subjectAttendancePromises.push(
          getSubjectAttendanceForStudent(
            studentId,
            batchAssignment.batchId,
            batchAssignment.batchName,
            subject.subjectName,
            subject.teacherName
          )
        );
      }
    }

    const subjectAttendanceResults = await Promise.all(subjectAttendancePromises);
    const subjectAttendance = subjectAttendanceResults.filter(result => result !== null);

    // Calculate overall statistics
    let totalClassesAcrossSubjects = 0;
    let totalPresentAcrossSubjects = 0;
    
    subjectAttendance.forEach(subject => {
      totalClassesAcrossSubjects += subject.statistics.totalClasses;
      totalPresentAcrossSubjects += subject.statistics.present;
    });

    const overallAttendancePercentage = totalClassesAcrossSubjects > 0 
      ? (totalPresentAcrossSubjects / totalClassesAcrossSubjects) * 100 
      : 0;

    const responseData = {
      batches: batchAssignments,
      subjectAttendance: subjectAttendance,
      overallStats: {
        totalClassesAcrossSubjects,
        totalPresentAcrossSubjects,
        overallAttendancePercentage,
        totalSubjects: subjectAttendance.length
      }
    };

    res.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('Get student attendance records error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance records',
      error: error.message
    });
  }
};

// Helper function to get attendance for a specific subject
const getSubjectAttendanceForStudent = async (studentId, batchId, batchName, subjectName, teacherName) => {
  try {
    // Get all attendance records for this student in this subject
    const attendanceRecords = await Attendance.find({
      batch: batchId,
      subject: subjectName,
      'studentAttendance.student': studentId
    }).sort({ date: -1 });

    if (attendanceRecords.length === 0) {
      return null; // No attendance records for this subject
    }

    // Calculate statistics
    let present = 0, absent = 0, noClass = 0;
    const recentAttendance = [];

    attendanceRecords.forEach(record => {
      const studentRecord = record.studentAttendance.find(
        sa => sa.student.toString() === studentId
      );

      if (studentRecord) {
        switch (studentRecord.status) {
          case 'present':
            present++;
            break;
          case 'absent':
            absent++;
            break;
          case 'no_class':
            noClass++;
            break;
        }

        // Add to recent attendance (limit to 10 most recent)
        if (recentAttendance.length < 10) {
          recentAttendance.push({
            date: record.date.toISOString(),
            status: studentRecord.status,
            markedAt: studentRecord.markedAt.toISOString()
          });
        }
      }
    });

    const totalClasses = present + absent;
    const attendancePercentage = totalClasses > 0 ? (present / totalClasses) * 100 : 0;

    return {
      subjectName,
      batchId,
      batchName,
      teacherName,
      statistics: {
        present,
        absent,
        noClass,
        totalClasses,
        attendancePercentage
      },
      recentAttendance
    };

  } catch (error) {
    console.error(`Error getting attendance for subject ${subjectName}:`, error);
    return null;
  }
};

module.exports = {
  markAttendance,
  getAttendanceByDate,
  getSubjectAttendance,
  getStudentStats,
  getStudentsForAttendance,
  getStudentAttendanceRecords
};