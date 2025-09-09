const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  batch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch',
    required: true,
    index: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  studentAttendance: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'no_class'],
      required: true
    },
    markedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Compound indexes for better performance
attendanceSchema.index({ batch: 1, subject: 1, date: 1 }, { unique: true });
attendanceSchema.index({ teacher: 1, date: 1 });
attendanceSchema.index({ 'studentAttendance.student': 1 });

// Static method to get attendance statistics
attendanceSchema.statics.getStudentStats = async function(studentId, batchId, subjectName) {
  const records = await this.find({
    batch: batchId,
    subject: subjectName,
    'studentAttendance.student': studentId
  });

  let present = 0, absent = 0, noClass = 0;
  
  records.forEach(record => {
    const studentRecord = record.studentAttendance.find(
      sa => sa.student.toString() === studentId.toString()
    );
    if (studentRecord) {
      switch (studentRecord.status) {
        case 'present': present++; break;
        case 'absent': absent++; break;
        case 'no_class': noClass++; break;
      }
    }
  });

  const totalClasses = present + absent;
  const attendancePercentage = totalClasses > 0 ? (present / totalClasses) * 100 : 0;

  return { present, absent, noClass, totalClasses, attendancePercentage };
};

module.exports = mongoose.model('Attendance', attendanceSchema);