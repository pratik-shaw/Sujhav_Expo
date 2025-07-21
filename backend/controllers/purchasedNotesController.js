// controllers/purchasedNotesController.js - Fixed version
const PurchasedNotes = require('../models/PurchasedNotes');
const PaidNotes = require('../models/PaidNotes');
const User = require('../models/User');
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Helper functions
const generateShortReceipt = () => {
  const timestamp = Date.now().toString(36);
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `notes_${timestamp}_${randomSuffix}`;
};

const isMockPayment = (paymentId, signature) => {
  if (process.env.NODE_ENV !== 'development') return false;
  
  const mockPatterns = [/^pay_mock_/, /^pay_test_/, /^pay_[a-zA-Z0-9]{8,15}$/];
  const mockSigPatterns = [/^mock_signature_/, /^test_signature_/, /^dev_signature_/];
  
  return mockPatterns.some(p => p.test(paymentId)) && mockSigPatterns.some(p => p.test(signature));
};

const validateSignature = (orderId, paymentId, signature) => {
  try {
    const isThisMockPayment = isMockPayment(paymentId, signature);
    
    if (isThisMockPayment) {
      return process.env.NODE_ENV === 'development' && /^(mock_|test_|dev_)signature_/.test(signature);
    }
    
    const body = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');
    
    console.log('Signature validation:', {
      body,
      receivedSignature: signature,
      expectedSignature,
      matches: expectedSignature === signature
    });
    
    return expectedSignature === signature;
  } catch (error) {
    console.error('Signature validation error:', error);
    return false;
  }
};

const validateAuth = (req) => {
  if (!req.user?.id) {
    throw new Error('Authentication required');
  }
  return req.user.id;
};

// Purchase notes (handles both free and paid)
const purchaseNotes = async (req, res) => {
  try {
    const studentId = validateAuth(req);
    const { notesId } = req.body;
    
    if (!notesId) {
      return res.status(400).json({ success: false, message: 'Notes ID is required' });
    }

    // Check existing purchase
    const existingPurchase = await PurchasedNotes.findOne({
      studentId, notesId, purchaseStatus: { $in: ['completed', 'pending'] }, isActive: true
    });

    if (existingPurchase) {
      return res.status(400).json({
        success: false, message: 'You have already purchased these notes or have a pending purchase'
      });
    }

    // Get notes details
    const notes = await PaidNotes.findById(notesId);
    if (!notes?.isActive) {
      return res.status(404).json({ success: false, message: 'Notes not found or unavailable' });
    }

    // Create purchase record
    const purchase = new PurchasedNotes({
      studentId, notesId, purchaseStatus: 'pending',
      paymentDetails: { amount: notes.price, currency: 'INR' }
    });

    // Handle free notes
    if (notes.price === 0) {
      await purchase.completePurchase();
      return res.status(201).json({
        success: true, message: 'Successfully purchased the free notes', purchase
      });
    }

    // Handle paid notes - create Razorpay order
    const orderData = {
      amount: notes.price * 100,
      currency: 'INR',
      receipt: generateShortReceipt(),
      notes: { notesId, studentId, type: 'notes_purchase' }
    };

    const razorpayOrder = await razorpay.orders.create(orderData);
    
    purchase.paymentStatus = 'pending';
    purchase.paymentDetails.razorpayOrderId = razorpayOrder.id;
    await purchase.save();

    return res.status(201).json({
      success: true,
      message: 'Purchase created. Please complete payment to access the notes',
      purchase,
      razorpayOrder: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        receipt: razorpayOrder.receipt
      }
    });

  } catch (error) {
    console.error('Purchase error:', error);
    return res.status(500).json({
      success: false,
      message: error.message === 'Authentication required' ? error.message : 'Internal server error'
    });
  }
};

// FIXED: Verify payment and complete purchase - simplified and more robust
const verifyPaymentAndPurchase = async (req, res) => {
  try {
    console.log('=== Payment Verification Started ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const studentId = validateAuth(req);
    const { purchaseId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    
    // CRITICAL FIX: Better validation with specific error messages
    if (!razorpay_order_id && !purchaseId) {
      console.log('❌ No order ID or purchase ID provided');
      return res.status(400).json({ 
        success: false, 
        message: 'Order ID or Purchase ID is required',
        error: 'missing_identifiers'
      });
    }

    if (!razorpay_payment_id && razorpay_order_id) {
      console.log('❌ Payment ID missing for order verification');
      return res.status(400).json({ 
        success: false, 
        message: 'Payment ID is required for verification',
        error: 'missing_payment_id'
      });
    }

    // Find purchase
    let purchase = null;
    
    if (purchaseId) {
      purchase = await PurchasedNotes.findOne({
        _id: purchaseId,
        studentId
      });
    }
    
    if (!purchase && razorpay_order_id) {
      purchase = await PurchasedNotes.findOne({
        studentId,
        'paymentDetails.razorpayOrderId': razorpay_order_id,
        purchaseStatus: { $in: ['pending', 'failed'] }
      });
    }

    if (!purchase) {
      console.log('❌ Purchase not found');
      return res.status(404).json({ 
        success: false, 
        message: 'Purchase not found',
        error: 'purchase_not_found'
      });
    }

    // CRITICAL FIX: If already completed, return success immediately
    if (purchase.purchaseStatus === 'completed' && purchase.paymentStatus === 'completed') {
      console.log('✅ Purchase already completed - returning success');
      return res.status(200).json({
        success: true,
        message: 'Payment already verified and purchase completed',
        purchase,
        verified: true,
        status: 'already_completed'
      });
    }

    // CRITICAL FIX: If no payment details in request but purchase exists, return current status
    if (!razorpay_payment_id && !razorpay_order_id) {
      console.log('ℹ️ Status check request - returning current purchase status');
      return res.status(200).json({
        success: purchase.purchaseStatus === 'completed',
        message: `Purchase status: ${purchase.purchaseStatus}`,
        purchase,
        verified: purchase.purchaseStatus === 'completed',
        status: purchase.purchaseStatus
      });
    }

    // Continue with verification only if we have payment details
    let signatureValid = false;
    
    if (razorpay_signature) {
      signatureValid = validateSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    } else {
      signatureValid = process.env.NODE_ENV === 'development';
    }
    
    if (!signatureValid) {
      console.log('❌ Signature validation failed');
      purchase.paymentStatus = 'failed';
      await purchase.save();
      
      return res.status(400).json({ 
        success: false, 
        message: 'Payment verification failed',
        error: 'signature_verification_failed'
      });
    }

    // Complete payment
    purchase.paymentStatus = 'completed';
    purchase.purchaseStatus = 'completed';
    purchase.paymentDetails.razorpayPaymentId = razorpay_payment_id;
    purchase.paymentDetails.razorpaySignature = razorpay_signature;
    purchase.paymentDetails.paymentMethod = 'razorpay';
    purchase.paymentDetails.paidAt = new Date();
    purchase.purchasedAt = new Date();
    
    await purchase.save();
    
    console.log('✅ Payment completed successfully');

    return res.status(200).json({
      success: true,
      message: 'Payment verified and purchase completed successfully',
      purchase,
      verified: true,
      status: 'success'
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    return res.status(500).json({
      success: false,
      message: error.message === 'Authentication required' ? error.message : 'Internal server error',
      error: 'verification_error'
    });
  }
};

// Check if student has access to notes
const checkNotesAccess = async (req, res) => {
  try {
    const studentId = validateAuth(req);
    const { notesId } = req.params;

    const notes = await PaidNotes.findById(notesId);
    if (!notes) {
      return res.status(404).json({ success: false, message: 'Notes not found' });
    }

    // Free notes - grant immediate access
    if (notes.price === 0) {
      return res.status(200).json({
        success: true, hasAccess: true, isFree: true, purchase: null,
        message: 'These are free notes - access granted'
      });
    }

    // Paid notes - check purchase
    const purchase = await PurchasedNotes.findOne({
      studentId, notesId, purchaseStatus: 'completed', paymentStatus: 'completed', isActive: true
    });

    const hasAccess = !!purchase;
    return res.status(200).json({
      success: true, hasAccess, isFree: false, purchase: hasAccess ? purchase : null,
      message: hasAccess ? 'Access granted' : 'Purchase required'
    });

  } catch (error) {
    console.error('Check access error:', error);
    return res.status(500).json({
      success: false,
      message: error.message === 'Authentication required' ? error.message : 'Internal server error'
    });
  }
};

// Get student's purchased notes
const getStudentPurchasedNotes = async (req, res) => {
  try {
    const studentId = validateAuth(req);
    const { status = 'completed', page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [purchases, total] = await Promise.all([
      PurchasedNotes.find({ studentId, purchaseStatus: status, isActive: true })
        .populate('notesId', '-thumbnail.data -pdfs.pdfData')
        .populate('studentId', 'name email')
        .sort({ purchasedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      PurchasedNotes.countDocuments({ studentId, purchaseStatus: status, isActive: true })
    ]);

    return res.status(200).json({
      success: true, count: purchases.length, purchases,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
    });

  } catch (error) {
    console.error('Get purchased notes error:', error);
    return res.status(500).json({
      success: false,
      message: error.message === 'Authentication required' ? error.message : 'Internal server error'
    });
  }
};

// Get purchase details
const getPurchaseDetails = async (req, res) => {
  try {
    const studentId = validateAuth(req);
    const { purchaseId } = req.params;

    const purchase = await PurchasedNotes.findOne({ _id: purchaseId, studentId, isActive: true })
      .populate('notesId', '-thumbnail.data -pdfs.pdfData')
      .populate('studentId', 'name email');

    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase not found' });
    }

    return res.status(200).json({ success: true, purchase });

  } catch (error) {
    console.error('Get purchase details error:', error);
    return res.status(500).json({
      success: false,
      message: error.message === 'Authentication required' ? error.message : 'Internal server error'
    });
  }
};

// Get PDF with access control
const getPDFWithAccess = async (req, res) => {
  try {
    const studentId = validateAuth(req);
    const { notesId, pdfId } = req.params;

    const notes = await PaidNotes.findById(notesId);
    if (!notes) {
      return res.status(404).json({ success: false, message: 'Notes not found' });
    }

    // Handle free notes
    if (notes.price === 0) {
      const pdf = notes.pdfs.id(pdfId);
      if (!pdf) {
        return res.status(404).json({ success: false, message: 'PDF not found' });
      }

      res.set({
        'Content-Type': pdf.pdfMimeType || 'application/pdf',
        'Content-Length': pdf.fileSize,
        'Content-Disposition': `inline; filename="${pdf.originalName}"`,
        'Cache-Control': 'private, max-age=3600'
      });

      return res.send(pdf.pdfData);
    }

    // Handle paid notes - check purchase
    const purchase = await PurchasedNotes.findOne({
      studentId, notesId, purchaseStatus: 'completed', paymentStatus: 'completed', isActive: true
    });

    if (!purchase?.isValidPurchase) {
      return res.status(403).json({ success: false, message: 'Purchase required to access PDF' });
    }

    const pdf = notes.pdfs.id(pdfId);
    if (!pdf) {
      return res.status(404).json({ success: false, message: 'PDF not found' });
    }

    // Record download if available
    try {
      if (purchase.recordDownload) await purchase.recordDownload(pdfId, req.ip, req.get('User-Agent'));
    } catch (recordError) {
      console.log('Failed to record download:', recordError.message);
    }

    res.set({
      'Content-Type': pdf.pdfMimeType || 'application/pdf',
      'Content-Length': pdf.fileSize,
      'Content-Disposition': `inline; filename="${pdf.originalName}"`,
      'Cache-Control': 'private, max-age=3600'
    });

    res.send(pdf.pdfData);

  } catch (error) {
    console.error('PDF access error:', error);
    return res.status(500).json({
      success: false,
      message: error.message === 'Authentication required' ? error.message : 'Error retrieving PDF'
    });
  }
};

// Cancel purchase
const cancelPurchase = async (req, res) => {
  try {
    const studentId = validateAuth(req);
    const { purchaseId } = req.params;

    const purchase = await PurchasedNotes.findOneAndUpdate(
      { _id: purchaseId, studentId, purchaseStatus: 'pending' },
      { purchaseStatus: 'cancelled', isActive: false },
      { new: true }
    );

    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Pending purchase not found' });
    }

    return res.status(200).json({ success: true, message: 'Purchase cancelled successfully' });

  } catch (error) {
    console.error('Cancel purchase error:', error);
    return res.status(500).json({
      success: false,
      message: error.message === 'Authentication required' ? error.message : 'Internal server error'
    });
  }
};

// Get download history
const getDownloadHistory = async (req, res) => {
  try {
    const studentId = validateAuth(req);
    const { purchaseId } = req.params;

    const purchase = await PurchasedNotes.findOne({
      _id: purchaseId, studentId, purchaseStatus: 'completed', isActive: true
    }).populate('notesId', 'notesTitle pdfs.pdfTitle');

    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase not found' });
    }

    return res.status(200).json({
      success: true, downloadHistory: purchase.downloadHistory, accessDetails: purchase.accessDetails
    });

  } catch (error) {
    console.error('Get download history error:', error);
    return res.status(500).json({
      success: false,
      message: error.message === 'Authentication required' ? error.message : 'Internal server error'
    });
  }
};

// Admin functions - Get all purchases
const getAllPurchases = async (req, res) => {
  try {
    const { status, studentId, notesId, page = 1, limit = 20, sortBy = 'purchasedAt', sortOrder = 'desc' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const query = { isActive: true };
    if (status) query.purchaseStatus = status;
    if (studentId) query.studentId = studentId;
    if (notesId) query.notesId = notesId;

    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [purchases, total] = await Promise.all([
      PurchasedNotes.find(query)
        .populate('notesId', 'notesTitle tutor price category class')
        .populate('studentId', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      PurchasedNotes.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true, count: purchases.length, purchases,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
    });

  } catch (error) {
    console.error('Get all purchases error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get purchase stats
const getPurchaseStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    
    if (startDate || endDate) {
      dateFilter.purchasedAt = {};
      if (startDate) dateFilter.purchasedAt.$gte = new Date(startDate);
      if (endDate) dateFilter.purchasedAt.$lte = new Date(endDate);
    }

    const [totalPurchases, totalRevenue, completedPurchases, pendingPurchases, topNotes] = await Promise.all([
      PurchasedNotes.countDocuments({ ...dateFilter, isActive: true }),
      PurchasedNotes.aggregate([
        { $match: { ...dateFilter, purchaseStatus: 'completed', isActive: true } },
        { $group: { _id: null, total: { $sum: '$paymentDetails.amount' } } }
      ]),
      PurchasedNotes.countDocuments({ ...dateFilter, purchaseStatus: 'completed', isActive: true }),
      PurchasedNotes.countDocuments({ ...dateFilter, purchaseStatus: 'pending', isActive: true }),
      PurchasedNotes.aggregate([
        { $match: { ...dateFilter, purchaseStatus: 'completed', isActive: true } },
        { $group: { _id: '$notesId', count: { $sum: 1 }, revenue: { $sum: '$paymentDetails.amount' } } },
        { $lookup: { from: 'paidnotes', localField: '_id', foreignField: '_id', as: 'notes' } },
        { $unwind: '$notes' },
        { $project: { notesTitle: '$notes.notesTitle', tutor: '$notes.tutor', count: 1, revenue: 1 } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ])
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
    console.error('Get purchase stats error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
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