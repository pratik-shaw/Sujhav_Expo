// controllers/purchasedNotesController.js - Enhanced with consistent payment verification
const PurchasedNotes = require('../models/PurchasedNotes');
const PaidNotes = require('../models/PaidNotes');
const User = require('../models/User');
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay with debug logging
console.log('Initializing Razorpay for Notes with keys:', {
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
  return `notes_${timestamp}_${randomSuffix}`;
};

// ENHANCED: Mock payment detection with better patterns
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
  
  console.log('Mock payment detection for notes:', {
    paymentId,
    signature: signature.substring(0, 20) + '...',
    hasValidMockPaymentId,
    hasValidMockSignature,
    nodeEnv: process.env.NODE_ENV
  });
  
  // Must have BOTH valid mock payment ID AND valid mock signature
  return hasValidMockPaymentId && hasValidMockSignature;
};

// Generate consistent mock signature for development
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

// Validate mock signature consistency
const validateMockSignature = (orderId, paymentId, signature) => {
  if (process.env.NODE_ENV !== 'development') {
    return false;
  }
  
  console.log('Validating mock signature for notes:', {
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
  
  console.log('Mock signature validation result for notes:', isValidPattern);
  
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
      console.log('✅ Razorpay authentication successful for notes module (expected 400 for invalid order ID)');
    } else {
      console.error('❌ Razorpay connection error for notes:', error);
    }
  }
};

// Test connection on module load
testRazorpayConnection();

// Purchase notes (handles both free and paid)
const purchaseNotes = async (req, res) => {
  try {
    const { notesId } = req.body;
    
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const studentId = req.user.id;
    console.log('Processing notes purchase for user:', studentId, 'notes:', notesId);

    // Validate required fields
    if (!notesId) {
      return res.status(400).json({
        success: false,
        message: 'Notes ID is required'
      });
    }

    // Check if student has already purchased
    const existingPurchase = await PurchasedNotes.findOne({
      studentId,
      notesId,
      purchaseStatus: { $in: ['completed', 'pending'] },
      isActive: true
    });

    if (existingPurchase) {
      return res.status(400).json({
        success: false,
        message: 'You have already purchased these notes or have a pending purchase'
      });
    }

    // Get notes details
    const notes = await PaidNotes.findById(notesId);

    if (!notes) {
      return res.status(404).json({
        success: false,
        message: 'Notes not found'
      });
    }

    if (!notes.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Notes are not available for purchase'
      });
    }

    console.log('Notes found:', { 
      id: notes._id, 
      title: notes.notesTitle, 
      price: notes.price 
    });

    // Create purchase record
    const purchase = new PurchasedNotes({
      studentId,
      notesId,
      purchaseStatus: 'pending',
      paymentDetails: {
        amount: notes.price,
        currency: 'INR'
      }
    });

    // Handle free notes
    if (notes.price === 0) {
      console.log('Processing free notes purchase');
      await purchase.completePurchase();

      return res.status(201).json({
        success: true,
        message: 'Successfully purchased the free notes',
        purchase: purchase
      });
    }

    // Handle paid notes
    if (notes.price > 0) {
      console.log('Processing paid notes purchase, creating Razorpay order...');
      
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
          amount: notes.price * 100, // Convert to paise
          currency: 'INR',
          receipt: generateShortReceipt(),
          notes: {
            notesId: notesId,
            studentId: studentId,
            type: 'notes_purchase'
          }
        };

        console.log('Creating Razorpay order for notes with data:', orderData);

        const razorpayOrder = await razorpay.orders.create(orderData);
        
        console.log('✅ Razorpay order created successfully for notes:', {
          id: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          status: razorpayOrder.status,
          receipt: razorpayOrder.receipt
        });

        // Update purchase with payment details
        purchase.paymentStatus = 'pending';
        purchase.paymentDetails.razorpayOrderId = razorpayOrder.id;
        purchase.paymentDetails.amount = notes.price;
        purchase.paymentDetails.currency = 'INR';

        await purchase.save();

        return res.status(201).json({
          success: true,
          message: 'Purchase created. Please complete payment to access the notes',
          purchase: purchase,
          razorpayOrder: {
            id: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            receipt: razorpayOrder.receipt
          }
        });

      } catch (razorpayError) {
        console.error('❌ Razorpay order creation failed for notes:', razorpayError);
        
        // Log detailed error information
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
      message: 'Invalid notes configuration'
    });

  } catch (error) {
    console.error('❌ Notes purchase error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// ENHANCED: Completely rewritten payment verification with proper mock support
const verifyPaymentAndPurchase = async (req, res) => {
  try {
    const { purchaseId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const studentId = req.user.id;
    console.log('Verifying payment for notes purchase:', purchaseId, 'user:', studentId);

    // Validate required fields
    if (!purchaseId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'All payment details are required'
      });
    }

    // Find purchase
    const purchase = await PurchasedNotes.findOne({
      _id: purchaseId,
      studentId,
      paymentStatus: { $in: ['pending', 'failed'] },
      purchaseStatus: 'pending'
    });

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found or payment already processed'
      });
    }

    // Verify that the order ID matches
    if (purchase.paymentDetails.razorpayOrderId !== razorpay_order_id) {
      return res.status(400).json({
        success: false,
        message: 'Order ID mismatch'
      });
    }

    console.log('Found purchase for verification:', {
      id: purchase._id,
      studentId: purchase.studentId,
      notesId: purchase.notesId,
      amount: purchase.paymentDetails.amount,
      orderIdMatch: purchase.paymentDetails.razorpayOrderId === razorpay_order_id
    });

    // ENHANCED: Enhanced signature verification with proper mock handling
    let signatureValid = false;
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    
    // Check if this is a mock payment FIRST
    const isThisMockPayment = isMockPayment(razorpay_payment_id, razorpay_signature);
    
    if (isThisMockPayment) {
      console.log('✅ Mock payment detected for notes - using mock signature validation');
      signatureValid = validateMockSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
      
      if (signatureValid) {
        console.log('✅ Mock signature validation passed for notes');
      } else {
        console.error('❌ Mock signature validation failed for notes');
        console.error('Payment ID:', razorpay_payment_id);
        console.error('Signature:', razorpay_signature);
      }
    } else {
      // Production signature verification
      console.log('🔐 Production payment detected for notes - using Razorpay signature validation');
      
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
        console.log('✅ Production signature validation passed for notes');
      } else {
        console.error('❌ Production signature validation failed for notes');
        console.error('Expected:', expectedSignature);
        console.error('Received:', razorpay_signature);
      }
    }

    // If signature validation fails, return error
    if (!signatureValid) {
      console.error('❌ Payment signature verification failed for notes');
      
      // Update purchase status but don't mark as completely failed
      purchase.paymentStatus = 'failed';
      purchase.paymentDetails.failureReason = 'Signature verification failed';
      purchase.paymentDetails.lastFailureAt = new Date();
      await purchase.save();
      
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

    // Complete payment and purchase
    try {
      await purchase.completePayment({
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        paymentMethod: 'razorpay'
      });

      console.log('✅ Notes purchase payment completed successfully');
      console.log('✅ Notes purchase completed successfully');

      return res.status(200).json({
        success: true,
        message: 'Payment verified and purchase completed successfully',
        purchase: purchase,
        debug: process.env.NODE_ENV === 'development' ? {
          paymentType: isThisMockPayment ? 'mock' : 'production',
          signatureValidation: 'passed'
        } : undefined
      });

    } catch (paymentCompletionError) {
      console.error('❌ Error completing notes payment:', paymentCompletionError);
      
      // Mark purchase as failed
      purchase.paymentStatus = 'failed';
      purchase.purchaseStatus = 'failed';
      purchase.paymentDetails.failureReason = 'Payment completion failed';
      purchase.paymentDetails.lastFailureAt = new Date();
      await purchase.save();
      
      return res.status(500).json({
        success: false,
        message: 'Payment verification successful but purchase completion failed',
        error: process.env.NODE_ENV === 'development' ? paymentCompletionError.message : 'Please contact support'
      });
    }

  } catch (error) {
    console.error('❌ Payment verification error for notes:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// Check if student has access to notes
const checkNotesAccess = async (req, res) => {
  try {
    const { notesId } = req.params;
    
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const studentId = req.user.id;

    // Check if notes exist first
    const notes = await PaidNotes.findById(notesId);
    if (!notes) {
      return res.status(404).json({
        success: false,
        message: 'Notes not found'
      });
    }

    // If notes are free, grant access immediately
    if (notes.price === 0) {
      return res.status(200).json({
        success: true,
        hasAccess: true,
        isFree: true,
        purchase: null,
        message: 'These are free notes - access granted'
      });
    }

    // For paid notes, check if user has purchased
    const purchase = await PurchasedNotes.findOne({
      studentId,
      notesId,
      purchaseStatus: 'completed',
      paymentStatus: 'completed', // Add this check
      isActive: true
    });

    console.log(`🔍 Access check for user ${studentId}, notes ${notesId}:`, {
      notesPrice: notes.price,
      purchaseFound: !!purchase,
      purchaseStatus: purchase?.purchaseStatus,
      paymentStatus: purchase?.paymentStatus,
      isActive: purchase?.isActive
    });

    // Check if purchase exists and is valid
    const hasAccess = purchase && 
                     purchase.purchaseStatus === 'completed' && 
                     purchase.paymentStatus === 'completed' &&
                     purchase.isActive === true;

    return res.status(200).json({
      success: true,
      hasAccess,
      isFree: false,
      purchase: hasAccess ? purchase : null,
      message: hasAccess ? 'Access granted' : 'Purchase required'
    });

  } catch (error) {
    console.error('❌ Check notes access error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get student's purchased notes
const getStudentPurchasedNotes = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const studentId = req.user.id;
    const { status = 'completed', page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const purchases = await PurchasedNotes.find({
      studentId,
      purchaseStatus: status,
      isActive: true
    })
    .populate('notesId', '-thumbnail.data -pdfs.pdfData')
    .populate('studentId', 'name email')
    .sort({ purchasedAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

    const total = await PurchasedNotes.countDocuments({
      studentId,
      purchaseStatus: status,
      isActive: true
    });

    return res.status(200).json({
      success: true,
      count: purchases.length,
      purchases,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('❌ Get purchased notes error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get purchase details
const getPurchaseDetails = async (req, res) => {
  try {
    const { purchaseId } = req.params;
    
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const studentId = req.user.id;

    const purchase = await PurchasedNotes.findOne({
      _id: purchaseId,
      studentId,
      isActive: true
    })
    .populate('notesId', '-thumbnail.data -pdfs.pdfData')
    .populate('studentId', 'name email');

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found'
      });
    }

    return res.status(200).json({
      success: true,
      purchase
    });

  } catch (error) {
    console.error('❌ Get purchase details error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get PDF with access control (handles download)
const getPDFWithAccess = async (req, res) => {
  try {
    const { notesId, pdfId } = req.params;
    
    console.log('🔍 PDF Access Request:', {
      notesId,
      pdfId,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      method: req.method,
      url: req.originalUrl,
      headers: {
        authorization: req.headers.authorization ? 'Present' : 'Missing',
        contentType: req.headers['content-type'],
      },
      query: req.query
    });
    
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      console.log('❌ PDF Access: User not authenticated');
      console.log('req.user:', req.user);
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const studentId = req.user.id;
    console.log('✅ PDF Access: User authenticated:', {
      studentId,
      userName: req.user.name,
      userEmail: req.user.email
    });

    // Get the notes first
    const notes = await PaidNotes.findById(notesId);
    if (!notes) {
      console.log('❌ PDF Access: Notes not found:', notesId);
      return res.status(404).json({
        success: false,
        message: 'Notes not found'
      });
    }

    console.log('📚 PDF Access: Notes found:', {
      notesId: notes._id,
      title: notes.notesTitle,
      price: notes.price,
      pdfCount: notes.pdfs.length
    });

    // Check if notes are free
    if (notes.price === 0) {
      console.log('🆓 PDF Access: Free notes - granting access');
      
      const pdf = notes.pdfs.id(pdfId);
      if (!pdf) {
        console.log('❌ PDF Access: PDF not found in free notes:', pdfId);
        return res.status(404).json({
          success: false,
          message: 'PDF not found'
        });
      }

      console.log('📄 PDF Access: Serving free PDF:', {
        pdfId: pdf._id,
        title: pdf.pdfTitle,
        size: pdf.fileSize,
        pages: pdf.pages
      });

      // Set response headers and send PDF
      res.set({
        'Content-Type': pdf.pdfMimeType || 'application/pdf',
        'Content-Length': pdf.fileSize,
        'Content-Disposition': `inline; filename="${pdf.originalName}"`,
        'Cache-Control': 'private, max-age=3600'
      });

      return res.send(pdf.pdfData);
    }

    console.log('💰 PDF Access: Paid notes - checking purchase');

    // For paid notes, check if student has purchased
    const purchase = await PurchasedNotes.findOne({
      studentId,
      notesId,
      purchaseStatus: 'completed',
      paymentStatus: 'completed',
      isActive: true
    });

    console.log('🔍 PDF Access: Purchase check result:', {
      purchaseFound: !!purchase,
      purchaseId: purchase?._id,
      purchaseStatus: purchase?.purchaseStatus,
      paymentStatus: purchase?.paymentStatus,
      isActive: purchase?.isActive,
      purchasedAt: purchase?.purchasedAt
    });

    if (!purchase || !purchase.isValidPurchase) {
      console.log('❌ PDF Access: No valid purchase found');
      return res.status(403).json({
        success: false,
        message: 'You need to purchase these notes to access the PDF'
      });
    }

    // Check if student has access to this specific PDF
    const hasAccessToPDF = purchase.hasAccessToPDF ? purchase.hasAccessToPDF(pdfId) : true;
    if (!hasAccessToPDF) {
      console.log('❌ PDF Access: No access to specific PDF:', pdfId);
      return res.status(403).json({
        success: false,
        message: 'Access denied to this PDF'
      });
    }

    const pdf = notes.pdfs.id(pdfId);
    if (!pdf) {
      console.log('❌ PDF Access: PDF not found in purchased notes:', pdfId);
      return res.status(404).json({
        success: false,
        message: 'PDF not found'
      });
    }

    console.log('📄 PDF Access: Serving purchased PDF:', {
      pdfId: pdf._id,
      title: pdf.pdfTitle,
      size: pdf.fileSize,
      pages: pdf.pages,
      originalName: pdf.originalName
    });

    // Record the download if method exists
    try {
      if (purchase.recordDownload && typeof purchase.recordDownload === 'function') {
        await purchase.recordDownload(pdfId, req.ip, req.get('User-Agent'));
        console.log('✅ PDF Access: Download recorded');
      }
    } catch (recordError) {
      console.log('⚠️ PDF Access: Failed to record download:', recordError.message);
    }

    // Set response headers
    res.set({
      'Content-Type': pdf.pdfMimeType || 'application/pdf',
      'Content-Length': pdf.fileSize,
      'Content-Disposition': `inline; filename="${pdf.originalName}"`,
      'Cache-Control': 'private, max-age=3600',
      'X-PDF-Title': encodeURIComponent(pdf.pdfTitle || pdf.originalName)
    });

    console.log('✅ PDF Access: Sending PDF data');
    // Send the PDF
    res.send(pdf.pdfData);

  } catch (error) {
    console.error('❌ PDF Access Error:', error);
    console.error('Error Stack:', error.stack);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving PDF',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};


// Cancel purchase (for pending purchases)
const cancelPurchase = async (req, res) => {
  try {
    const { purchaseId } = req.params;
    
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const studentId = req.user.id;

    const purchase = await PurchasedNotes.findOne({
      _id: purchaseId,
      studentId,
      purchaseStatus: 'pending'
    });

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Pending purchase not found'
      });
    }

    purchase.purchaseStatus = 'cancelled';
    purchase.isActive = false;
    await purchase.save();

    console.log('Purchase cancelled:', purchaseId);

    return res.status(200).json({
      success: true,
      message: 'Purchase cancelled successfully'
    });

  } catch (error) {
    console.error('❌ Cancel purchase error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get download history for a purchase
const getDownloadHistory = async (req, res) => {
  try {
    const { purchaseId } = req.params;
    
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const studentId = req.user.id;

    const purchase = await PurchasedNotes.findOne({
      _id: purchaseId,
      studentId,
      purchaseStatus: 'completed',
      isActive: true
    }).populate('notesId', 'notesTitle pdfs.pdfTitle');

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found'
      });
    }

    return res.status(200).json({
      success: true,
      downloadHistory: purchase.downloadHistory,
      accessDetails: purchase.accessDetails
    });

  } catch (error) {
    console.error('❌ Get download history error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get all purchases (admin only)
const getAllPurchases = async (req, res) => {
  try {
    const { 
      status, 
      studentId, 
      notesId, 
      page = 1, 
      limit = 20,
      sortBy = 'purchasedAt',
      sortOrder = 'desc' 
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build query
    const query = { isActive: true };
    if (status) query.purchaseStatus = status;
    if (studentId) query.studentId = studentId;
    if (notesId) query.notesId = notesId;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const purchases = await PurchasedNotes.find(query)
      .populate('notesId', 'notesTitle tutor price category class')
      .populate('studentId', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await PurchasedNotes.countDocuments(query);

    return res.status(200).json({
      success: true,
      count: purchases.length,
      purchases,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('❌ Get all purchases error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get purchase analytics/stats (admin only)
const getPurchaseStats = async (req, res) => {
  try {
    const { startDate, endDate, period = 'month' } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.purchasedAt = {};
      if (startDate) dateFilter.purchasedAt.$gte = new Date(startDate);
      if (endDate) dateFilter.purchasedAt.$lte = new Date(endDate);
    }

    // Get basic stats
    const [totalPurchases, totalRevenue, completedPurchases, pendingPurchases] = await Promise.all([
      PurchasedNotes.countDocuments({ ...dateFilter, isActive: true }),
      PurchasedNotes.aggregate([
        { $match: { ...dateFilter, purchaseStatus: 'completed', isActive: true } },
        { $group: { _id: null, total: { $sum: '$paymentDetails.amount' } } }
      ]),
      PurchasedNotes.countDocuments({ ...dateFilter, purchaseStatus: 'completed', isActive: true }),
      PurchasedNotes.countDocuments({ ...dateFilter, purchaseStatus: 'pending', isActive: true })
    ]);

    // Get top notes by purchases
    const topNotes = await PurchasedNotes.aggregate([
      { $match: { ...dateFilter, purchaseStatus: 'completed', isActive: true } },
      { $group: { _id: '$notesId', count: { $sum: 1 }, revenue: { $sum: '$paymentDetails.amount' } } },
      { $lookup: { from: 'paidnotes', localField: '_id', foreignField: '_id', as: 'notes' } },
      { $unwind: '$notes' },
      { $project: { notesTitle: '$notes.notesTitle', tutor: '$notes.tutor', count: 1, revenue: 1 } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        totalPurchases,
        totalRevenue: totalRevenue[0]?.total || 0,
        completedPurchases,
        pendingPurchases,
        conversionRate: totalPurchases > 0 ? (completedPurchases / totalPurchases * 100).toFixed(2) : 0
      },
      topNotes
    });

  } catch (error) {
    console.error('❌ Get purchase stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  purchaseNotes,
  verifyPaymentAndPurchase,
  checkNotesAccess,
  getStudentPurchasedNotes,
  getPurchaseDetails,
  getPDFWithAccess,
  cancelPurchase,
  getDownloadHistory,
  getAllPurchases,
  getPurchaseStats
};