// controllers/purchasedNotesController.js
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

// Test Razorpay connection on startup
const testRazorpayConnection = async () => {
  try {
    await razorpay.orders.fetch('test_order_id');
  } catch (error) {
    if (error.statusCode === 401) {
      console.error('❌ RAZORPAY AUTHENTICATION FAILED - Check your API keys');
    } else if (error.statusCode === 400 && error.error.code === 'BAD_REQUEST_ERROR') {
      console.log('✅ Razorpay authentication successful for notes module');
    } else {
      console.error('❌ Razorpay connection error:', error);
    }
  }
};

// Test connection
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
          receipt: `notes_${notesId}_${studentId}_${Date.now()}`,
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
          status: razorpayOrder.status
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
            currency: razorpayOrder.currency
          }
        });

      } catch (razorpayError) {
        console.error('❌ Razorpay order creation failed for notes:', razorpayError);
        
        // Log detailed error information
        if (razorpayError.statusCode === 401) {
          console.error('❌ RAZORPAY AUTHENTICATION FAILED');
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

    const purchase = await PurchasedNotes.findOne({
      studentId,
      notesId,
      purchaseStatus: 'completed',
      isActive: true
    });

    const hasAccess = purchase && purchase.isValidPurchase;

    return res.status(200).json({
      success: true,
      hasAccess,
      purchase: hasAccess ? purchase : null
    });

  } catch (error) {
    console.error('Check notes access error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Verify payment and complete purchase
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

    // Find purchase
    const purchase = await PurchasedNotes.findOne({
      _id: purchaseId,
      studentId,
      paymentStatus: 'pending'
    });

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found or payment already processed'
      });
    }

    // Verify Razorpay signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      purchase.paymentStatus = 'failed';
      purchase.purchaseStatus = 'failed';
      await purchase.save();
      
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed'
      });
    }

    // Complete payment and purchase
    await purchase.completePayment({
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      paymentMethod: 'razorpay'
    });

    return res.status(200).json({
      success: true,
      message: 'Payment verified and purchase completed successfully',
      purchase: purchase
    });

  } catch (error) {
    console.error('Payment verification error for notes:', error);
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
    console.error('Get purchased notes error:', error);
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
    console.error('Get purchase details error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Download PDF (with access control)
const downloadPDF = async (req, res) => {
  try {
    const { notesId, pdfId } = req.params;
    
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const studentId = req.user.id;

    // Check if student has purchased the notes
    const purchase = await PurchasedNotes.findOne({
      studentId,
      notesId,
      purchaseStatus: 'completed',
      isActive: true
    });

    if (!purchase || !purchase.isValidPurchase) {
      return res.status(403).json({
        success: false,
        message: 'You need to purchase these notes to access the PDF'
      });
    }

    // Check if student has access to this specific PDF
    if (!purchase.hasAccessToPDF(pdfId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this PDF'
      });
    }

    // Get the notes and PDF
    const notes = await PaidNotes.findById(notesId);
    if (!notes) {
      return res.status(404).json({
        success: false,
        message: 'Notes not found'
      });
    }

    const pdf = notes.pdfs.id(pdfId);
    if (!pdf) {
      return res.status(404).json({
        success: false,
        message: 'PDF not found'
      });
    }

    // Record the download
    await purchase.recordDownload(pdfId, req.ip, req.get('User-Agent'));

    // Set response headers
    res.set({
      'Content-Type': pdf.pdfMimeType,
      'Content-Length': pdf.fileSize,
      'Content-Disposition': `inline; filename="${pdf.originalName}"`
    });

    // Send the PDF
    res.send(pdf.pdfData);

  } catch (error) {
    console.error('Download PDF error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error downloading PDF',
      error: error.message
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

    return res.status(200).json({
      success: true,
      message: 'Purchase cancelled successfully'
    });

  } catch (error) {
    console.error('Cancel purchase error:', error);
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
    console.error('Get download history error:', error);
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
  getStudentPurchasedNotes,
  getPurchaseDetails,
  downloadPDF,
  cancelPurchase,
  checkNotesAccess,
  getDownloadHistory
};