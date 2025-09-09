const Attendance = require('../models/Attendance');
const Batch = require('../models/Batch');

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

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    // Check if attendance already exists for this date
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

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      batch: batchId,
      subject: subject,
      date: attendanceDate,
      teacher: teacherId
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
      dateFilter = {
        date: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
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

module.exports = {
  markAttendance,
  getAttendanceByDate,
  getSubjectAttendance,
  getStudentStats,
  getStudentsForAttendance
};