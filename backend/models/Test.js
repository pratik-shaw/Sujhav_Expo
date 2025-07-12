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
      default: null // null means not yet evaluated
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

// Add indexes for better performance
testSchema.index({ batch: 1, isActive: 1 });
testSchema.index({ createdBy: 1 });
testSchema.index({ 'assignedStudents.student': 1 });
testSchema.index({ createdAt: -1 });

// Virtual to get average marks
testSchema.virtual('averageMarks').get(function() {
  const evaluatedStudents = this.assignedStudents.filter(s => s.marksScored !== null);
  if (evaluatedStudents.length === 0) return 0;
  
  const totalMarks = evaluatedStudents.reduce((sum, s) => sum + s.marksScored, 0);
  return Math.round((totalMarks / evaluatedStudents.length) * 100) / 100;
});

// Virtual to get completion percentage
testSchema.virtual('completionPercentage').get(function() {
  if (this.assignedStudents.length === 0) return 0;
  
  const submittedStudents = this.assignedStudents.filter(s => s.submittedAt !== null);
  return Math.round((submittedStudents.length / this.assignedStudents.length) * 100);
});

// Ensure virtuals are included in JSON output
testSchema.set('toJSON', { virtuals: true });
testSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Test', testSchema);