// controllers/enrollmentController.js - Fixed Razorpay authentication
const Enrollment = require('../models/Enrollment');
const UnpaidCourse = require('../models/UnpaidCourse');
const PaidCourse = require('../models/PaidCourse');
const User = require('../models/User');
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay with debug logging
console.log('Initializing Razorpay with keys:', {
  key_id: process.env.RAZORPAY_KEY_ID ? `${process.env.RAZORPAY_KEY_ID.substring(0, 8)}...` : 'NOT_SET',
  key_secret: process.env.RAZORPAY_KEY_SECRET ? `${process.env.RAZORPAY_KEY_SECRET.substring(0, 8)}...` : 'NOT_SET'
});

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Test Razorpay connection on startup
const testRazorpayConnection = async () => {
  try {
    // Try to fetch a non-existent order to test authentication
    await razorpay.orders.fetch('test_order_id');
  } catch (error) {
    if (error.statusCode === 401) {
      console.error('❌ RAZORPAY AUTHENTICATION FAILED - Check your API keys');
      console.error('Make sure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are set correctly');
    } else if (error.statusCode === 400 && error.error.code === 'BAD_REQUEST_ERROR') {
      console.log('✅ Razorpay authentication successful (expected 400 for invalid order ID)');
    } else {
      console.error('❌ Razorpay connection error:', error);
    }
  }
};

// Test connection
testRazorpayConnection();

// Enroll in a course (handles both free and paid)
const enrollInCourse = async (req, res) => {
  try {
    const { courseId, courseType, mode, schedule } = req.body;
    
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const studentId = req.user.id;
    console.log('Processing enrollment for user:', studentId, 'course:', courseId);

    // Validate required fields
    if (!courseId || !courseType || !mode || !schedule) {
      return res.status(400).json({
        success: false,
        message: 'Course ID, course type, mode, and schedule are required'
      });
    }

    // Check if courseType is valid
    if (!['UnpaidCourse', 'PaidCourse'].includes(courseType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid course type'
      });
    }

    // Check if student is already enrolled
    const existingEnrollment = await Enrollment.findOne({
      studentId,
      courseId,
      enrollmentStatus: { $in: ['enrolled', 'pending'] },
      isActive: true
    });

    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: 'You are already enrolled in this course'
      });
    }

    // Get course details
    const CourseModel = courseType === 'UnpaidCourse' ? UnpaidCourse : PaidCourse;
    const course = await CourseModel.findById(courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    if (!course.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Course is not available for enrollment'
      });
    }

    console.log('Course found:', { 
      id: course._id, 
      title: course.courseTitle, 
      type: courseType, 
      price: course.price 
    });

    // Create enrollment record
    const enrollment = new Enrollment({
      studentId,
      courseId,
      courseType,
      mode,
      schedule,
      enrollmentStatus: 'pending'
    });

    // Handle free courses
    if (courseType === 'UnpaidCourse' && course.price === 0) {
      console.log('Processing free course enrollment');
      await enrollment.completeEnrollment();
      
      // Add student to course's enrolled students array
      course.studentsEnrolled.push({
        studentId,
        mode,
        schedule,
        enrolledAt: new Date()
      });
      await course.save();

      return res.status(201).json({
        success: true,
        message: 'Successfully enrolled in the free course',
        enrollment: enrollment
      });
    }

    // Handle paid courses
    if (courseType === 'PaidCourse' || (courseType === 'UnpaidCourse' && course.price > 0)) {
      console.log('Processing paid course enrollment, creating Razorpay order...');
      
      // Validate Razorpay credentials before creating order
      if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        console.error('❌ Razorpay credentials not configured');
        return res.status(500).json({
          success: false,
          message: 'Payment gateway not configured'
        });
      }

      try {
        // Create Razorpay order with detailed logging
        const orderData = {
          amount: course.price * 100, // Convert to paise
          currency: 'INR',
          receipt: `course_${courseId}_${studentId}_${Date.now()}`,
          notes: {
            courseId: courseId,
            studentId: studentId,
            courseType: courseType
          }
        };

        console.log('Creating Razorpay order with data:', orderData);

        const razorpayOrder = await razorpay.orders.create(orderData);
        
        console.log('✅ Razorpay order created successfully:', {
          id: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          status: razorpayOrder.status
        });

        // Update enrollment with payment details
        enrollment.paymentStatus = 'pending';
        enrollment.paymentDetails.razorpayOrderId = razorpayOrder.id;
        enrollment.paymentDetails.amount = course.price;
        enrollment.paymentDetails.currency = 'INR';

        await enrollment.save();

        return res.status(201).json({
          success: true,
          message: 'Enrollment created. Please complete payment to access the course',
          enrollment: enrollment,
          razorpayOrder: {
            id: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency
          }
        });

      } catch (razorpayError) {
        console.error('❌ Razorpay order creation failed:', razorpayError);
        
        // Log detailed error information
        if (razorpayError.statusCode === 401) {
          console.error('❌ RAZORPAY AUTHENTICATION FAILED');
          console.error('- Check if RAZORPAY_KEY_ID is correct');
          console.error('- Check if RAZORPAY_KEY_SECRET is correct');
          console.error('- Make sure you are using the correct Test/Live mode keys');
          console.error('- Verify keys are properly loaded in environment variables');
        }

        return res.status(500).json({
          success: false,
          message: 'Failed to create payment order. Please try again.',
          error: process.env.NODE_ENV === 'development' ? razorpayError.message : 'Payment gateway error'
        });
      }
    }

    return res.status(400).json({
      success: false,
      message: 'Invalid course configuration'
    });

  } catch (error) {
    console.error('❌ Enrollment error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// Check if student has access to a course
const checkCourseAccess = async (req, res) => {
  try {
    const { courseId } = req.params;
    
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const studentId = req.user.id;

    const enrollment = await Enrollment.findOne({
      studentId,
      courseId,
      enrollmentStatus: 'enrolled',
      isActive: true
    });

    const hasAccess = enrollment && enrollment.isValidEnrollment;

    return res.status(200).json({
      success: true,
      hasAccess,
      enrollment: hasAccess ? enrollment : null
    });

  } catch (error) {
    console.error('Check course access error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Verify payment and complete enrollment
const verifyPaymentAndEnroll = async (req, res) => {
  try {
    const { enrollmentId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const studentId = req.user.id;

    // Find enrollment
    const enrollment = await Enrollment.findOne({
      _id: enrollmentId,
      studentId,
      paymentStatus: 'pending'
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found or payment already processed'
      });
    }

    // Verify Razorpay signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      enrollment.paymentStatus = 'failed';
      await enrollment.save();
      
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed'
      });
    }

    // Complete payment and enrollment
    await enrollment.completePayment({
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      paymentMethod: 'razorpay'
    });

    // Add student to course's enrolled students array
    const CourseModel = enrollment.courseType === 'UnpaidCourse' ? UnpaidCourse : PaidCourse;
    const course = await CourseModel.findById(enrollment.courseId);

    if (course) {
      course.studentsEnrolled.push({
        studentId,
        mode: enrollment.mode,
        schedule: enrollment.schedule,
        enrolledAt: new Date()
      });
      await course.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Payment verified and enrollment completed successfully',
      enrollment: enrollment
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

const getStudentEnrollments = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const studentId = req.user.id;
    const { status = 'enrolled' } = req.query;

    const enrollments = await Enrollment.find({
      studentId,
      enrollmentStatus: status,
      isActive: true
    }).populate('courseId').populate('studentId', 'name email');

    return res.status(200).json({
      success: true,
      count: enrollments.length,
      enrollments
    });

  } catch (error) {
    console.error('Get enrollments error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

const getEnrollmentDetails = async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const studentId = req.user.id;

    const enrollment = await Enrollment.findOne({
      _id: enrollmentId,
      studentId,
      isActive: true
    }).populate('courseId').populate('studentId', 'name email');

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    return res.status(200).json({
      success: true,
      enrollment
    });

  } catch (error) {
    console.error('Get enrollment details error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

const updateVideoProgress = async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    const { videoId, watchTime } = req.body;
    
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const studentId = req.user.id;

    const enrollment = await Enrollment.findOne({
      _id: enrollmentId,
      studentId,
      enrollmentStatus: 'enrolled',
      isActive: true
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Valid enrollment not found'
      });
    }

    await enrollment.updateProgress(videoId, watchTime);

    return res.status(200).json({
      success: true,
      message: 'Progress updated successfully',
      progress: enrollment.progress
    });

  } catch (error) {
    console.error('Update progress error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

const cancelEnrollment = async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const studentId = req.user.id;

    const enrollment = await Enrollment.findOne({
      _id: enrollmentId,
      studentId,
      enrollmentStatus: 'pending'
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Pending enrollment not found'
      });
    }

    enrollment.enrollmentStatus = 'cancelled';
    enrollment.isActive = false;
    await enrollment.save();

    return res.status(200).json({
      success: true,
      message: 'Enrollment cancelled successfully'
    });

  } catch (error) {
    console.error('Cancel enrollment error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  enrollInCourse,
  verifyPaymentAndEnroll,
  getStudentEnrollments,
  getEnrollmentDetails,
  updateVideoProgress,
  cancelEnrollment,
  checkCourseAccess
};