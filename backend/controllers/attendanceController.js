const Attendance = require('../models/Attendance');
const Batch = require('../models/Batch');
const User = require('../models/User');

// Helper function to create date without timezone issues
const createLocalDate = (dateInput) => {
  if (typeof dateInput === 'string' && dateInput.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return new Date(dateInput + 'T00:00:00.000Z');
  }
  
  if (dateInput instanceof Date) {
    const year = dateInput.getFullYear();
    const month = dateInput.getMonth();
    const day = dateInput.getDate();
    return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  }
  
  const date = new Date(dateInput);
  if (!isNaN(date.getTime())) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  }
  
  throw new Error('Invalid date format');
};

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

    const existingAttendance = await Attendance.findOne({
      batch: batchId,
      subject: subject,
      date: attendanceDate
    });

    if (existingAttendance) {
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

const getAttendanceByDate = async (req, res) => {
  try {
    const { batchId, subject, date } = req.params;
    const teacherId = req.user.id;

    let queryDate;
    try {
      queryDate = createLocalDate(date);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Please use YYYY-MM-DD format.'
      });
    }

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

const getStudentStats = async (req, res) => {
  try {
    const { batchId, subject, studentId } = req.params;
    const teacherId = req.user.id;

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

const getStudentsForAttendance = async (req, res) => {
  try {
    const { batchId, subject } = req.params;
    const teacherId = req.user.id;

    const batch = await Batch.findById(batchId)
      .populate('studentAssignments.student', 'name email');

    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    const subjectData = batch.subjects.find(s => 
      s.name === subject && s.teacher && s.teacher.toString() === teacherId
    );

    if (!subjectData) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized for this subject'
      });
    }

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

    const batches = await Batch.find({
      'studentAssignments.student': studentId
    }).populate('studentAssignments.student', 'name email');

    if (!batches || batches.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'You are not assigned to any batch'
      });
    }

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

const getSubjectAttendanceForStudent = async (studentId, batchId, batchName, subjectName, teacherName) => {
  try {
    const attendanceRecords = await Attendance.find({
      batch: batchId,
      subject: subjectName,
      'studentAttendance.student': studentId
    }).sort({ date: -1 });

    if (attendanceRecords.length === 0) {
      return null;
    }

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

// NEW: Comprehensive attendance data for Admin/Teacher
const getAllAttendanceData = async (req, res) => {
  try {
    const { batchId, startDate, endDate } = req.query;

    // Build query filters
    let batchFilter = {};
    let dateFilter = {};

    if (batchId) {
      batchFilter = { _id: batchId };
    }

    if (startDate && endDate) {
      try {
        const start = createLocalDate(startDate);
        const end = createLocalDate(endDate);
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

    // Get all batches (filtered if batchId provided)
    const batches = await Batch.find(batchFilter)
      .populate('studentAssignments.student', 'name email')
      .populate('subjects.teacher', 'name email');

    if (!batches || batches.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No batches found'
      });
    }

    // Prepare comprehensive data
    const comprehensiveData = [];

    for (const batch of batches) {
      // Get all students in this batch
      const students = batch.studentAssignments.map(assignment => ({
        studentId: assignment.student._id.toString(),
        studentName: assignment.student.name,
        studentEmail: assignment.student.email,
        enrolledAt: assignment.enrolledAt,
        assignedSubjects: assignment.assignedSubjects
      }));

      // Process each student
      for (const student of students) {
        const studentData = {
          studentId: student.studentId,
          studentName: student.studentName,
          studentEmail: student.studentEmail,
          batchId: batch._id.toString(),
          batchName: batch.batchName,
          batchCategory: batch.category,
          enrolledAt: student.enrolledAt,
          subjects: []
        };

        // Process each subject assigned to the student
        for (const assignedSubject of student.assignedSubjects) {
          const subjectName = assignedSubject.subjectName;
          
          // Get attendance records for this student in this subject
          const attendanceQuery = {
            batch: batch._id,
            subject: subjectName,
            'studentAttendance.student': student.studentId,
            ...dateFilter
          };

          const attendanceRecords = await Attendance.find(attendanceQuery)
            .populate('teacher', 'name email')
            .sort({ date: -1 });

          // Calculate statistics
          let present = 0, absent = 0, noClass = 0;
          const attendanceDetails = [];

          attendanceRecords.forEach(record => {
            const studentRecord = record.studentAttendance.find(
              sa => sa.student.toString() === student.studentId
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

              attendanceDetails.push({
                date: record.date,
                status: studentRecord.status,
                markedAt: studentRecord.markedAt,
                markedBy: record.teacher ? {
                  id: record.teacher._id,
                  name: record.teacher.name,
                  email: record.teacher.email
                } : null
              });
            }
          });

          const totalClasses = present + absent;
          const attendancePercentage = totalClasses > 0 
            ? parseFloat(((present / totalClasses) * 100).toFixed(2))
            : 0;

          // Get teacher info for this subject
          const subjectInfo = batch.subjects.find(s => s.name === subjectName);
          const teacherInfo = subjectInfo && subjectInfo.teacher ? {
            id: subjectInfo.teacher._id,
            name: subjectInfo.teacher.name,
            email: subjectInfo.teacher.email
          } : null;

          studentData.subjects.push({
            subjectName,
            teacher: teacherInfo,
            statistics: {
              totalClasses,
              present,
              absent,
              noClass,
              attendancePercentage
            },
            attendanceRecords: attendanceDetails
          });
        }

        // Calculate overall statistics for the student
        let overallPresent = 0;
        let overallAbsent = 0;
        let overallNoClass = 0;
        let overallTotalClasses = 0;

        studentData.subjects.forEach(subject => {
          overallPresent += subject.statistics.present;
          overallAbsent += subject.statistics.absent;
          overallNoClass += subject.statistics.noClass;
          overallTotalClasses += subject.statistics.totalClasses;
        });

        const overallAttendancePercentage = overallTotalClasses > 0
          ? parseFloat(((overallPresent / overallTotalClasses) * 100).toFixed(2))
          : 0;

        studentData.overallStatistics = {
          totalClasses: overallTotalClasses,
          present: overallPresent,
          absent: overallAbsent,
          noClass: overallNoClass,
          attendancePercentage: overallAttendancePercentage,
          totalSubjects: studentData.subjects.length
        };

        comprehensiveData.push(studentData);
      }
    }

    // Sort students by overall attendance percentage (lowest to highest for easy identification)
    comprehensiveData.sort((a, b) => 
      a.overallStatistics.attendancePercentage - b.overallStatistics.attendancePercentage
    );

    // Calculate system-wide statistics
    const systemStats = {
      totalStudents: comprehensiveData.length,
      totalBatches: batches.length,
      averageAttendance: comprehensiveData.length > 0
        ? parseFloat((comprehensiveData.reduce((sum, student) => 
            sum + student.overallStatistics.attendancePercentage, 0) / comprehensiveData.length).toFixed(2))
        : 0,
      studentsBelow75: comprehensiveData.filter(s => s.overallStatistics.attendancePercentage < 75).length,
      studentsBelow50: comprehensiveData.filter(s => s.overallStatistics.attendancePercentage < 50).length
    };

    res.json({
      success: true,
      data: {
        systemStatistics: systemStats,
        students: comprehensiveData
      },
      filters: {
        batchId: batchId || 'all',
        startDate: startDate || 'all',
        endDate: endDate || 'all'
      }
    });

  } catch (error) {
    console.error('Get all attendance data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch comprehensive attendance data',
      error: error.message
    });
  }
};

module.exports = {
  markAttendance,
  getAttendanceByDate,
  getSubjectAttendance,
  getStudentStats,
  getStudentsForAttendance,
  getStudentAttendanceRecords,
  getAllAttendanceData
};