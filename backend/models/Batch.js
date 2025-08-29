const mongoose = require('mongoose');

// Enhanced student assignment schema
const studentAssignmentSchema = new mongoose.Schema({
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
      message: 'Student must be a valid user with user role'
    }
  },
  assignedClasses: [{
    type: String,
    required: true,
    trim: true,
    minlength: [1, 'Class name cannot be empty'],
    maxlength: [50, 'Class name cannot exceed 50 characters']
  }],
  assignedSubjects: [{
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    subjectName: {
      type: String,
      required: true,
      trim: true
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  }],
  enrolledAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const subjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Subject name is required'],
    trim: true,
    minlength: [1, 'Subject name cannot be empty'],
    maxlength: [100, 'Subject name cannot exceed 100 characters']
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    validate: {
      validator: async function(teacherId) {
        if (!teacherId) return true; // Allow null/undefined
        const User = mongoose.model('User');
        const teacher = await User.findById(teacherId);
        return teacher && teacher.role === 'teacher';
      },
      message: 'Teacher must be a valid user with teacher role'
    }
  }
}, { _id: true });

const batchSchema = new mongoose.Schema({
  batchName: {
    type: String,
    required: [true, 'Batch name is required'],
    trim: true,
    minlength: [1, 'Batch name cannot be empty'],
    maxlength: [100, 'Batch name cannot exceed 100 characters'],
    unique: true,
    index: true
  },
  classes: [{
    type: String,
    required: [true, 'Class name is required'],
    trim: true,
    minlength: [1, 'Class name cannot be empty'],
    maxlength: [50, 'Class name cannot exceed 50 characters']
  }],
  subjects: [subjectSchema],
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: {
      values: ['jee', 'neet', 'boards'],
      message: 'Category must be either jee, neet, or boards'
    },
    lowercase: true,
    index: true
  },
  // Enhanced student assignments instead of simple array
  studentAssignments: [studentAssignmentSchema],
  // Keep old students field for backward compatibility (will be deprecated)
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    validate: {
      validator: async function(studentId) {
        const User = mongoose.model('User');
        const student = await User.findById(studentId);
        return student && student.role === 'user';
      },
      message: 'Student must be a valid user with user role'
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by user is required'],
    validate: {
      validator: async function(userId) {
        const User = mongoose.model('User');
        const user = await User.findById(userId);
        return user && (user.role === 'admin' || user.role === 'teacher');
      },
      message: 'Created by must be a valid admin or teacher user'
    }
  },
  schedule: {
    type: String,
    trim: true,
    maxlength: [500, 'Schedule cannot exceed 500 characters'],
    default: ''
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters'],
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
batchSchema.index({ category: 1, isActive: 1 });
batchSchema.index({ createdBy: 1 });
batchSchema.index({ 'subjects.teacher': 1 });
batchSchema.index({ 'studentAssignments.student': 1 });

// Virtual for student count (using new assignments)
batchSchema.virtual('studentCount').get(function() {
  return this.studentAssignments ? this.studentAssignments.length : 0;
});

// Virtual for subject count
batchSchema.virtual('subjectCount').get(function() {
  return this.subjects ? this.subjects.length : 0;
});

// Pre-save middleware to ensure data consistency
batchSchema.pre('save', function(next) {
  // Remove empty classes
  this.classes = this.classes.filter(cls => cls && cls.trim());
  
  // Remove empty subjects
  this.subjects = this.subjects.filter(subject => subject.name && subject.name.trim());
  
  // Remove duplicate student assignments
  const uniqueAssignments = [];
  const seenStudents = new Set();
  
  this.studentAssignments.forEach(assignment => {
    const studentId = assignment.student.toString();
    if (!seenStudents.has(studentId)) {
      seenStudents.add(studentId);
      uniqueAssignments.push(assignment);
    }
  });
  
  this.studentAssignments = uniqueAssignments;
  
  // Sync old students array with new assignments for backward compatibility
  this.students = this.studentAssignments.map(assignment => assignment.student);
  
  next();
});

// Static method to find batches by teacher
batchSchema.statics.findByTeacher = function(teacherId) {
  return this.find({
    'subjects.teacher': teacherId,
    isActive: true
  }).populate('studentAssignments.student', 'name email')
    .populate('subjects.teacher', 'name email')
    .populate('createdBy', 'name email');
};

// Static method to find eligible students (not in any batch)
batchSchema.statics.findEligibleStudents = async function() {
  const User = mongoose.model('User');
  const batches = await this.find({}).select('studentAssignments.student');
  const assignedStudentIds = new Set();
  
  batches.forEach(batch => {
    batch.studentAssignments.forEach(assignment => {
      assignedStudentIds.add(assignment.student.toString());
    });
  });

  return await User.find({
    role: 'user',
    _id: { $nin: Array.from(assignedStudentIds) }
  }).select('name email').sort({ name: 1 });
};

// Instance method to check if a student is in this batch
batchSchema.methods.hasStudent = function(studentId) {
  return this.studentAssignments.some(assignment => 
    assignment.student.toString() === studentId.toString()
  );
};

// Enhanced method to add students with detailed assignments
batchSchema.methods.addStudentAssignments = function(assignments) {
  const existingStudentIds = this.studentAssignments.map(a => a.student.toString());
  let addedCount = 0;
  
  assignments.forEach(assignment => {
    if (!existingStudentIds.includes(assignment.student.toString())) {
      // Map assigned subjects to include subject details
      const assignedSubjects = assignment.assignedSubjects.map(subjectName => {
        const subject = this.subjects.find(s => s.name === subjectName);
        return {
          subjectId: subject ? subject._id : new mongoose.Types.ObjectId(),
          subjectName: subjectName,
          teacher: subject ? subject.teacher : null
        };
      });
      
      this.studentAssignments.push({
        student: assignment.student,
        assignedClasses: assignment.assignedClasses || [],
        assignedSubjects: assignedSubjects,
        enrolledAt: new Date()
      });
      addedCount++;
    }
  });
  
  return addedCount;
};

// Enhanced method to remove students
batchSchema.methods.removeStudentAssignments = function(studentIds) {
  const idsToRemove = studentIds.map(id => id.toString());
  const originalLength = this.studentAssignments.length;
  
  this.studentAssignments = this.studentAssignments.filter(assignment => 
    !idsToRemove.includes(assignment.student.toString())
  );
  
  return originalLength - this.studentAssignments.length;
};

// Method to update student's subject assignments when teachers change
batchSchema.methods.updateStudentSubjectTeachers = function() {
  this.studentAssignments.forEach(assignment => {
    assignment.assignedSubjects.forEach(assignedSubject => {
      const currentSubject = this.subjects.find(s => s.name === assignedSubject.subjectName);
      if (currentSubject) {
        assignedSubject.teacher = currentSubject.teacher;
      }
    });
  });
};

// Method to get detailed student information
batchSchema.methods.getStudentDetails = function() {
  return this.studentAssignments.map(assignment => ({
    studentId: assignment.student,
    assignedClasses: assignment.assignedClasses,
    assignedSubjects: assignment.assignedSubjects.map(subject => ({
      name: subject.subjectName,
      teacher: subject.teacher
    })),
    enrolledAt: assignment.enrolledAt
  }));
};

module.exports = mongoose.model('Batch', batchSchema);