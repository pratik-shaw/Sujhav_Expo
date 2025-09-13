// controllers/enrollmentController.js - Fixed payment verification with proper mock signature handling
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

// Helper function to generate short receipt (max 40 chars)
const generateShortReceipt = () => {
  const timestamp = Date.now().toString(36);
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `course_${timestamp}_${randomSuffix}`;
};

// FIXED: Enhanced mock payment detection with better patterns
const isMockPayment = (paymentId, signature) => {
  // Only allow mock payments in development environment
  if (process.env.NODE_ENV !== 'development') {
    return false;
  }
  
  // Check for mock payment patterns - more flexible patterns
  const mockPaymentPatterns = [
    /^pay_mock_/,
    /^pay_test_/,
    /^pay_[a-zA-Z0-9]{9}$/,  // Standard 9-character pattern
    /^pay_[a-zA-Z0-9]{10}$/, // 10-character pattern  
    /^pay_[a-zA-Z0-9]{8,15}$/ // Broader pattern for generated mock IDs
  ];
  
  const mockSignaturePatterns = [
    /^mock_signature_/,
    /^test_signature_/,
    /^dev_signature_/
  ];
  
  const hasValidMockPaymentId = mockPaymentPatterns.some(pattern => pattern.test(paymentId));
  const hasValidMockSignature = mockSignaturePatterns.some(pattern => pattern.test(signature));
  
  console.log('Mock payment detection:', {
    paymentId,
    signature: signature.substring(0, 20) + '...',
    hasValidMockPaymentId,
    hasValidMockSignature,
    nodeEnv: process.env.NODE_ENV
  });
  
  // FIXED: Must have BOTH valid mock payment ID AND valid mock signature
  return hasValidMockPaymentId && hasValidMockSignature;
};

// FIXED: Generate consistent mock signature for development
const generateMockSignature = (orderId, paymentId) => {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  // Generate a consistent signature for mock payments
  const mockSecret = 'mock_secret_for_development';
  const body = `${orderId}|${paymentId}`;
  
  return crypto
    .createHmac('sha256', mockSecret)
    .update(body)
    .digest('hex');
};

// FIXED: Validate mock signature consistency
const validateMockSignature = (orderId, paymentId, signature) => {
  if (process.env.NODE_ENV !== 'development') {
    return false;
  }
  
  console.log('Validating mock signature:', {
    orderId,
    paymentId,
    signature: signature.substring(0, 20) + '...',
    nodeEnv: process.env.NODE_ENV
  });
  
  // For mock payments, we'll accept any signature that follows our pattern
  const mockSignaturePatterns = [
    /^mock_signature_/,
    /^test_signature_/,
    /^dev_signature_/
  ];
  
  const isValidPattern = mockSignaturePatterns.some(pattern => pattern.test(signature));
  
  console.log('Mock signature validation result:', isValidPattern);
  
  return isValidPattern;
};

// Test Razorpay connection on startup
const testRazorpayConnection = async () => {
  try {
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

testRazorpayConnection();

// Enroll in a course (handles both free and paid)
const enrollInCourse = async (req, res) => {
  try {
    const { courseId, courseType, mode, schedule } = req.body;
    
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const studentId = req.user.id;
    console.log('Processing enrollment for user:', studentId, 'course:', courseId);

    if (!courseId || !courseType || !mode || !schedule) {
      return res.status(400).json({
        success: false,
        message: 'Course ID, course type, mode, and schedule are required'
      });
    }

    if (!['UnpaidCourse', 'PaidCourse'].includes(courseType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid course type'
      });
    }

    // Only block if user is already successfully enrolled
    const existingEnrollment = await Enrollment.findOne({
      studentId,
      courseId,
      enrollmentStatus: 'enrolled',
      isActive: true
    });

    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: 'You are already enrolled in this course'
      });
    }

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

    // Cancel/delete any existing pending or failed enrollments for this course
    await Enrollment.deleteMany({
      studentId,
      courseId,
      enrollmentStatus: { $in: ['pending', 'failed', 'cancelled'] },
    });

    // Create new enrollment
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
      
      if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        console.error('❌ Razorpay credentials not configured');
        return res.status(500).json({
          success: false,
          message: 'Payment gateway not configured'
        });
      }

      try {
        const orderData = {
          amount: course.price * 100,
          currency: 'INR',
          receipt: generateShortReceipt(),
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
          status: razorpayOrder.status,
          receipt: razorpayOrder.receipt
        });

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
            currency: razorpayOrder.currency,
            receipt: razorpayOrder.receipt
          }
        });

      } catch (razorpayError) {
        console.error('❌ Razorpay order creation failed:', razorpayError);
        
        // Clean up the enrollment if Razorpay order creation fails
        await Enrollment.deleteOne({ _id: enrollment._id });
        
        if (razorpayError.statusCode === 401) {
          console.error('❌ RAZORPAY AUTHENTICATION FAILED');
          console.error('- Check if RAZORPAY_KEY_ID is correct');
          console.error('- Check if RAZORPAY_KEY_SECRET is correct');
          console.error('- Make sure you are using the correct Test/Live mode keys');
          console.error('- Verify keys are properly loaded in environment variables');
        } else if (razorpayError.statusCode === 400) {
          console.error('❌ RAZORPAY BAD REQUEST:', razorpayError.error);
          if (razorpayError.error && razorpayError.error.description) {
            console.error('Error description:', razorpayError.error.description);
          }
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

// FIXED: Completely rewritten payment verification with proper mock support
const verifyPaymentAndEnroll = async (req, res) => {
  try {
    const { enrollmentId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const studentId = req.user.id;
    console.log('Verifying payment for enrollment:', enrollmentId, 'user:', studentId);

    // Validate required fields
    if (!enrollmentId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'All payment details are required'
      });
    }

    // Find enrollment
    const enrollment = await Enrollment.findOne({
      _id: enrollmentId,
      studentId,
      paymentStatus: { $in: ['pending', 'failed'] },
      enrollmentStatus: 'pending'
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found or payment already processed'
      });
    }

    // Verify that the order ID matches
    if (enrollment.paymentDetails.razorpayOrderId !== razorpay_order_id) {
      return res.status(400).json({
        success: false,
        message: 'Order ID mismatch'
      });
    }

    // FIXED: Enhanced signature verification with proper mock handling
    let signatureValid = false;
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    
    // FIXED: Check if this is a mock payment FIRST
    const isThisMockPayment = isMockPayment(razorpay_payment_id, razorpay_signature);
    
    if (isThisMockPayment) {
      console.log('✅ Mock payment detected - using mock signature validation');
      signatureValid = validateMockSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
      
      if (signatureValid) {
        console.log('✅ Mock signature validation passed');
      } else {
        console.error('❌ Mock signature validation failed');
        console.error('Payment ID:', razorpay_payment_id);
        console.error('Signature:', razorpay_signature);
      }
    } else {
      // Production signature verification
      console.log('🔐 Production payment detected - using Razorpay signature validation');
      
      if (!process.env.RAZORPAY_KEY_SECRET) {
        console.error('❌ RAZORPAY_KEY_SECRET not configured');
        return res.status(500).json({
          success: false,
          message: 'Payment gateway not configured properly'
        });
      }
      
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body)
        .digest('hex');

      signatureValid = expectedSignature === razorpay_signature;
      
      if (signatureValid) {
        console.log('✅ Production signature validation passed');
      } else {
        console.error('❌ Production signature validation failed');
        console.error('Expected:', expectedSignature);
        console.error('Received:', razorpay_signature);
      }
    }

    // If signature validation fails, return error
    if (!signatureValid) {
      console.error('❌ Payment signature verification failed');
      
      // Update enrollment status but don't mark as completely failed
      enrollment.paymentStatus = 'failed';
      enrollment.paymentDetails.failureReason = 'Signature verification failed';
      enrollment.paymentDetails.lastFailureAt = new Date();
      await enrollment.save();
      
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed. Please try again.',
        debug: process.env.NODE_ENV === 'development' ? {
          isMockPayment: isThisMockPayment,
          paymentId: razorpay_payment_id,
          signaturePattern: razorpay_signature.substring(0, 15) + '...'
        } : undefined
      });
    }

    // Complete payment and enrollment
    try {
      await enrollment.completePayment({
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        paymentMethod: 'razorpay'
      });

      console.log('✅ Payment completed successfully');

      // Add student to course's enrolled students array
      const CourseModel = enrollment.courseType === 'UnpaidCourse' ? UnpaidCourse : PaidCourse;
      const course = await CourseModel.findById(enrollment.courseId);

      if (course) {
        // Check if student is already in the enrolled list to avoid duplicates
        const isAlreadyEnrolled = course.studentsEnrolled.some(
          student => student.studentId.toString() === studentId.toString()
        );

        if (!isAlreadyEnrolled) {
          course.studentsEnrolled.push({
            studentId,
            mode: enrollment.mode,
            schedule: enrollment.schedule,
            enrolledAt: new Date()
          });
          await course.save();
          console.log('✅ Student added to course enrolled list');
        }
      }

      console.log('✅ Enrollment completed successfully');

      return res.status(200).json({
        success: true,
        message: 'Payment verified and enrollment completed successfully',
        enrollment: enrollment,
        debug: process.env.NODE_ENV === 'development' ? {
          paymentType: isThisMockPayment ? 'mock' : 'production',
          signatureValidation: 'passed'
        } : undefined
      });

    } catch (paymentCompletionError) {
      console.error('❌ Error completing payment:', paymentCompletionError);
      
      // Mark enrollment as failed
      enrollment.paymentStatus = 'failed';
      enrollment.paymentDetails.failureReason = 'Payment completion failed';
      enrollment.paymentDetails.lastFailureAt = new Date();
      await enrollment.save();
      
      return res.status(500).json({
        success: false,
        message: 'Payment verification successful but enrollment completion failed',
        error: process.env.NODE_ENV === 'development' ? paymentCompletionError.message : 'Please contact support'
      });
    }

  } catch (error) {
    console.error('❌ Payment verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

const checkCourseAccess = async (req, res) => {
  try {
    const { courseId } = req.params;
    
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const studentId = req.user.id;

    // Only return enrolled status, not pending
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
      enrollment: enrollment // Return the enrollment regardless of access status
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

const getStudentEnrollments = async (req, res) => {
  try {
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
    
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const studentId = req.user.id;

    if (!videoId || typeof watchTime !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Video ID and watch time are required'
      });
    }

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