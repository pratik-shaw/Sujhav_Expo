const mongoose = require('mongoose');

const testSchema = new mongoose.Schema({
  testTitle: {
    type: String,
    required: [true, 'Test title is required'],
    trim: true,
    maxLength: [200, 'Test title cannot exceed 200 characters']
  },
  fullMarks: {
    type: Number,
    required: [true, 'Full marks is required'],
    min: [1, 'Full marks must be at least 1'],
    max: [1000, 'Full marks cannot exceed 1000']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    validate: {
      validator: async function(teacherId) {
        const User = mongoose.model('User');
        const teacher = await User.findById(teacherId);
        return teacher && teacher.role === 'teacher';
      },
      message: 'Test can only be created by a teacher'
    }
  },
  batch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch',
    required: [true, 'Batch is required']
  },
  className: {
    type: String,
    required: [true, 'Class name is required'],
    trim: true,
    validate: {
      validator: async function(className) {
        if (!this.batch) return true; // Skip validation if batch not set yet
        
        const Batch = mongoose.model('Batch');
        const batch = await Batch.findById(this.batch);
        return batch && batch.classes.includes(className);
      },
      message: 'Selected class is not available in this batch'
    }
  },
  subjectName: {
    type: String,
    required: [true, 'Subject name is required'],
    trim: true,
    validate: {
      validator: async function(subjectName) {
        if (!this.batch || !this.createdBy) return true; // Skip validation if dependencies not set
        
        const Batch = mongoose.model('Batch');
        const batch = await Batch.findById(this.batch);
        
        if (!batch) return false;
        
        const subject = batch.subjects.find(s => 
          s.name === subjectName && 
          s.teacher && 
          s.teacher.toString() === this.createdBy.toString()
        );
        
        return !!subject;
      },
      message: 'You are not assigned to teach this subject in this batch'
    }
  },
  questionPdf: {
    fileName: {
      type: String,
      trim: true
    },
    fileData: {
      type: Buffer
    },
    mimeType: {
      type: String,
      enum: ['application/pdf']
    },
    fileSize: {
      type: Number,
      max: [10 * 1024 * 1024, 'Question PDF size cannot exceed 10MB'] // 10MB limit
    }
  },
  answerPdf: {
    fileName: {
      type: String,
      trim: true
    },
    fileData: {
      type: Buffer
    },
    mimeType: {
      type: String,
      enum: ['application/pdf']
    },
    fileSize: {
      type: Number,
      max: [10 * 1024 * 1024, 'Answer PDF size cannot exceed 10MB'] // 10MB limit
    }
  },
  assignedStudents: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      validate: {
        validator: async function(studentId) {
          const User = mongoose.model('User');
          const student = await User.findById(studentId);
          return student && student.role === 'user';
        },
        message: 'Assigned user must be a student'
      }
    },
    marksScored: {
      type: Number,
      min: [0, 'Marks scored cannot be negative'],
      default: null, // null means not yet evaluated
      validate: {
        validator: function(marks) {
          // Allow null values (not evaluated)
          if (marks === null || marks === undefined) return true;
          
          // If marks is provided, check against fullMarks
          const test = this.parent();
          return marks <= test.fullMarks;
        },
        message: 'Marks scored cannot exceed full marks'
      }
    },
    submittedAt: {
      type: Date,
      default: null // null means not yet submitted
    },
    evaluatedAt: {
      type: Date,
      default: null // null means not yet evaluated
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  dueDate: {
    type: Date,
    validate: {
      validator: function(dueDate) {
        return !dueDate || dueDate > new Date();
      },
      message: 'Due date must be in the future'
    }
  },
  instructions: {
    type: String,
    trim: true,
    maxLength: [1000, 'Instructions cannot exceed 1000 characters']
  }
}, {
  timestamps: true
});

// Add compound indexes for better performance
testSchema.index({ batch: 1, className: 1, subjectName: 1, isActive: 1 });
testSchema.index({ createdBy: 1, isActive: 1 });
testSchema.index({ 'assignedStudents.student': 1 });
testSchema.index({ createdAt: -1 });
testSchema.index({ batch: 1, subjectName: 1 });

// Virtual to get average marks for the test
testSchema.virtual('averageMarks').get(function() {
  const evaluatedStudents = this.assignedStudents.filter(s => s.marksScored !== null);
  if (evaluatedStudents.length === 0) return 0;
  
  const totalMarks = evaluatedStudents.reduce((sum, s) => sum + s.marksScored, 0);
  return Math.round((totalMarks / evaluatedStudents.length) * 100) / 100;
});

// Virtual to get average percentage for the test
testSchema.virtual('averagePercentage').get(function() {
  const evaluatedStudents = this.assignedStudents.filter(s => s.marksScored !== null);
  if (evaluatedStudents.length === 0) return 0;
  
  const totalPercentage = evaluatedStudents.reduce((sum, s) => sum + ((s.marksScored / this.fullMarks) * 100), 0);
  return Math.round((totalPercentage / evaluatedStudents.length) * 100) / 100;
});

// Virtual to get completion percentage (how many students have submitted)
testSchema.virtual('completionPercentage').get(function() {
  if (this.assignedStudents.length === 0) return 0;
  
  const submittedStudents = this.assignedStudents.filter(s => s.submittedAt !== null);
  return Math.round((submittedStudents.length / this.assignedStudents.length) * 100);
});

// Virtual to get evaluation percentage (how many students have been evaluated)
testSchema.virtual('evaluationPercentage').get(function() {
  if (this.assignedStudents.length === 0) return 0;
  
  const evaluatedStudents = this.assignedStudents.filter(s => s.marksScored !== null);
  return Math.round((evaluatedStudents.length / this.assignedStudents.length) * 100);
});

// Virtual to get test statistics
testSchema.virtual('statistics').get(function() {
  const totalStudents = this.assignedStudents.length;
  const submittedStudents = this.assignedStudents.filter(s => s.submittedAt !== null).length;
  const evaluatedStudents = this.assignedStudents.filter(s => s.marksScored !== null).length;
  const pendingEvaluation = submittedStudents - evaluatedStudents;
  
  return {
    totalStudents,
    submittedStudents,
    evaluatedStudents,
    pendingSubmission: totalStudents - submittedStudents,
    pendingEvaluation,
    completionRate: totalStudents > 0 ? Math.round((submittedStudents / totalStudents) * 100) : 0,
    evaluationRate: totalStudents > 0 ? Math.round((evaluatedStudents / totalStudents) * 100) : 0
  };
});

// Virtual to check if test has expired
testSchema.virtual('isExpired').get(function() {
  return this.dueDate && this.dueDate < new Date();
});

// Virtual to get highest marks
testSchema.virtual('highestMarks').get(function() {
  const evaluatedStudents = this.assignedStudents.filter(s => s.marksScored !== null);
  if (evaluatedStudents.length === 0) return null;
  
  return Math.max(...evaluatedStudents.map(s => s.marksScored));
});

// Virtual to get lowest marks
testSchema.virtual('lowestMarks').get(function() {
  const evaluatedStudents = this.assignedStudents.filter(s => s.marksScored !== null);
  if (evaluatedStudents.length === 0) return null;
  
  return Math.min(...evaluatedStudents.map(s => s.marksScored));
});

// Pre-save middleware to validate student eligibility
testSchema.pre('save', async function(next) {
  if (!this.isModified('assignedStudents') || !this.assignedStudents.length) {
    return next();
  }

  try {
    const Batch = mongoose.model('Batch');
    const batch = await Batch.findById(this.batch);
    
    if (!batch) {
      return next(new Error('Batch not found'));
    }

    // Get eligible students for this class/subject combination
    const eligibleStudents = batch.studentAssignments.filter(assignment => 
      assignment.assignedClasses.includes(this.className) &&
      assignment.assignedSubjects.some(s => s.subjectName === this.subjectName)
    ).map(assignment => assignment.student.toString());

    // Check if all assigned students are eligible
    for (const assignedStudent of this.assignedStudents) {
      if (!eligibleStudents.includes(assignedStudent.student.toString())) {
        return next(new Error(`Student ${assignedStudent.student} is not eligible for class ${this.className} and subject ${this.subjectName}`));
      }
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Ensure virtuals are included in JSON output
testSchema.set('toJSON', { virtuals: true });
testSchema.set('toObject', { virtuals: true });

// Static method to find tests by teacher and subject
testSchema.statics.findByTeacherSubject = function(teacherId, subjectName, batchId) {
  const query = { createdBy: teacherId, subjectName };
  if (batchId) query.batch = batchId;
  
  return this.find(query)
    .populate('createdBy', 'name email')
    .populate('batch', 'batchName category')
    .populate('assignedStudents.student', 'name email')
    .select('-questionPdf.fileData -answerPdf.fileData')
    .sort({ createdAt: -1 });
};

// Static method to find student's tests
testSchema.statics.findStudentTests = function(studentId, filters = {}) {
  const query = {
    'assignedStudents.student': studentId,
    isActive: true,
    ...filters
  };
  
  return this.find(query)
    .populate('createdBy', 'name email')
    .populate('batch', 'batchName category')
    .select('-questionPdf.fileData -answerPdf.fileData')
    .sort({ createdAt: -1 });
};

// Instance method to get student's performance in this test
testSchema.methods.getStudentPerformance = function(studentId) {
  const studentData = this.assignedStudents.find(
    s => s.student.toString() === studentId.toString()
  );
  
  if (!studentData) return null;
  
  return {
    testId: this._id,
    testTitle: this.testTitle,
    fullMarks: this.fullMarks,
    marksScored: studentData.marksScored,
    className: this.className,
    subjectName: this.subjectName,
    submittedAt: studentData.submittedAt,
    evaluatedAt: studentData.evaluatedAt,
    percentage: studentData.marksScored !== null ? 
      ((studentData.marksScored / this.fullMarks) * 100).toFixed(2) : null,
    status: studentData.marksScored !== null ? 'evaluated' : 
             studentData.submittedAt !== null ? 'submitted' : 'pending',
    isLate: this.dueDate && studentData.submittedAt && studentData.submittedAt > this.dueDate
  };
};

module.exports = mongoose.model('Test', testSchema);