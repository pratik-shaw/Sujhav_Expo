// controllers/paidNotesController.js
const PaidNotes = require('../models/PaidNotes');
const PurchasedNotes = require('../models/PurchasedNotes');
const multer = require('multer');
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Configure multer for memory storage
const storage = multer.memoryStorage();

const thumbnailUpload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

const pdfUpload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed!'));
    }
  }
});

// Helper function to safely format response data
const formatResponseData = (notesData) => {
  const responseData = notesData.toObject();
  
  // Remove thumbnail binary data
  if (responseData.thumbnail) {
    delete responseData.thumbnail.data;
  }
  
  // Remove PDF binary data
  if (responseData.pdfs && Array.isArray(responseData.pdfs)) {
    responseData.pdfs = responseData.pdfs.map(pdf => {
      // Handle both Mongoose subdocuments and plain objects
      const pdfObj = typeof pdf.toObject === 'function' ? pdf.toObject() : { ...pdf };
      delete pdfObj.pdfData;
      return pdfObj;
    });
  }
  
  return responseData;
};

// Create new paid notes
const createNotes = async (req, res) => {
  try {
    const {
      notesTitle,
      tutor,
      rating,
      price,
      category,
      class: className,
      notesDetails,
      isActive
    } = req.body;

    // Validate required fields
    if (!notesTitle || !tutor || !className || !price) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: notesTitle, tutor, class, and price are required'
      });
    }

    // Validate price for paid notes
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({
        success: false,
        message: 'Price must be 0 or greater'
      });
    }

    // Parse notesDetails if it's a string
    let parsedNotesDetails;
    try {
      parsedNotesDetails = typeof notesDetails === 'string' ? JSON.parse(notesDetails) : notesDetails;
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notesDetails format'
      });
    }

    // Validate notesDetails
    if (!parsedNotesDetails || !parsedNotesDetails.subtitle || !parsedNotesDetails.description) {
      return res.status(400).json({
        success: false,
        message: 'notesDetails must contain subtitle and description'
      });
    }

    // Handle thumbnail
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Thumbnail image is required'
      });
    }

    const thumbnail = {
      data: req.file.buffer,
      mimeType: req.file.mimetype,
      originalName: req.file.originalname,
      size: req.file.size
    };

    // Create new paid notes
    const newNotes = new PaidNotes({
      notesTitle,
      tutor,
      rating: parseFloat(rating) || 0,
      price: parsedPrice,
      category: category?.toLowerCase() || 'jee',
      class: className,
      notesDetails: parsedNotesDetails,
      thumbnail,
      isActive: isActive === 'true' || isActive === true
    });

    const savedNotes = await newNotes.save();
    
    // Format response data
    const responseData = formatResponseData(savedNotes);

    res.status(201).json({
      success: true,
      message: 'Notes created successfully',
      data: responseData
    });
  } catch (error) {
    console.error('Error creating notes:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating notes',
      error: error.message
    });
  }
};

// Get all paid notes
const getAllNotes = async (req, res) => {
  try {
    const { category, isActive, page = 1, limit = 10 } = req.query;
    
    const query = {};
    if (category) query.category = category.toLowerCase();
    if (isActive !== undefined) query.isActive = isActive === 'true';
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const notes = await PaidNotes.find(query)
      .select('-thumbnail.data -pdfs.pdfData') // Exclude binary data
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await PaidNotes.countDocuments(query);
    
    res.json({
      success: true,
      data: notes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error getting notes:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving notes',
      error: error.message
    });
  }
};

// Get paid notes by ID
const getNotesById = async (req, res) => {
  try {
    const notes = await PaidNotes.findById(req.params.id)
      .select('-thumbnail.data -pdfs.pdfData'); // Exclude binary data
    
    if (!notes) {
      return res.status(404).json({
        success: false,
        message: 'Notes not found'
      });
    }
    
    res.json({
      success: true,
      data: notes
    });
  } catch (error) {
    console.error('Error getting notes by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving notes',
      error: error.message
    });
  }
};

// Get thumbnail image
const getThumbnail = async (req, res) => {
  try {
    const notes = await PaidNotes.findById(req.params.id).select('thumbnail');
    
    if (!notes || !notes.thumbnail) {
      return res.status(404).json({
        success: false,
        message: 'Thumbnail not found'
      });
    }
    
    res.set({
      'Content-Type': notes.thumbnail.mimeType,
      'Content-Length': notes.thumbnail.size
    });
    
    res.send(notes.thumbnail.data);
  } catch (error) {
    console.error('Error getting thumbnail:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving thumbnail',
      error: error.message
    });
  }
};

// Get PDF file (with access control)
const getPDF = async (req, res) => {
  try {
    const notes = await PaidNotes.findById(req.params.id);
    
    if (!notes) {
      return res.status(404).json({
        success: false,
        message: 'Notes not found'
      });
    }
    
    // Check if user has purchased the notes (if not free)
    if (notes.price > 0) {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const purchase = await PurchasedNotes.findOne({
        studentId: req.user.id,
        notesId: req.params.id,
        purchaseStatus: 'completed',
        isActive: true
      });

      if (!purchase) {
        return res.status(403).json({
          success: false,
          message: 'You need to purchase these notes to access the PDF'
        });
      }
    }
    
    const pdf = notes.pdfs.id(req.params.pdfId);
    
    if (!pdf) {
      return res.status(404).json({
        success: false,
        message: 'PDF not found'
      });
    }
    
    res.set({
      'Content-Type': pdf.pdfMimeType,
      'Content-Length': pdf.fileSize,
      'Content-Disposition': `inline; filename="${pdf.originalName}"`
    });
    
    res.send(pdf.pdfData);
  } catch (error) {
    console.error('Error getting PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving PDF',
      error: error.message
    });
  }
};

// Update notes
const updateNotes = async (req, res) => {
  try {
    const {
      notesTitle,
      tutor,
      rating,
      price,
      category,
      class: className,
      notesDetails,
      isActive
    } = req.body;

    const notes = await PaidNotes.findById(req.params.id);
    if (!notes) {
      return res.status(404).json({
        success: false,
        message: 'Notes not found'
      });
    }

    // Validate price if provided
    if (price !== undefined) {
      const parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        return res.status(400).json({
          success: false,
          message: 'Price must be 0 or greater'
        });
      }
      notes.price = parsedPrice;
    }

    // Parse notesDetails if it's a string
    let parsedNotesDetails;
    if (notesDetails) {
      try {
        parsedNotesDetails = typeof notesDetails === 'string' ? JSON.parse(notesDetails) : notesDetails;
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'Invalid notesDetails format'
        });
      }
    }

    // Handle thumbnail update
    if (req.file) {
      notes.thumbnail = {
        data: req.file.buffer,
        mimeType: req.file.mimetype,
        originalName: req.file.originalname,
        size: req.file.size
      };
    }

    // Update fields
    if (notesTitle) notes.notesTitle = notesTitle;
    if (tutor) notes.tutor = tutor;
    if (rating !== undefined) notes.rating = parseFloat(rating);
    if (category) notes.category = category.toLowerCase();
    if (className) notes.class = className;
    if (parsedNotesDetails) notes.notesDetails = parsedNotesDetails;
    if (isActive !== undefined) notes.isActive = isActive === 'true' || isActive === true;

    const updatedNotes = await notes.save();
    
    // Format response data
    const responseData = formatResponseData(updatedNotes);
    
    res.json({
      success: true,
      message: 'Notes updated successfully',
      data: responseData
    });
  } catch (error) {
    console.error('Error updating notes:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating notes',
      error: error.message
    });
  }
};

// Delete notes
const deleteNotes = async (req, res) => {
  try {
    const notes = await PaidNotes.findById(req.params.id);
    
    if (!notes) {
      return res.status(404).json({
        success: false,
        message: 'Notes not found'
      });
    }

    await PaidNotes.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'Notes deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting notes:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting notes',
      error: error.message
    });
  }
};

// Add PDF to notes
const addPDFToNotes = async (req, res) => {
  try {
    const { pdfTitle, pdfDescription, pages } = req.body;
    
    // Validate required fields
    if (!pdfTitle || !pdfDescription) {
      return res.status(400).json({
        success: false,
        message: 'PDF title and description are required'
      });
    }

    // Check if file is present
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'PDF file is required'
      });
    }

    // Validate file type
    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({
        success: false,
        message: 'Only PDF files are allowed'
      });
    }

    // Find notes
    const notes = await PaidNotes.findById(req.params.id);
    if (!notes) {
      return res.status(404).json({
        success: false,
        message: 'Notes not found'
      });
    }

    // Create new PDF object
    const newPDF = {
      pdfTitle: pdfTitle.trim(),
      pdfDescription: pdfDescription.trim(),
      pdfData: req.file.buffer,
      pdfMimeType: req.file.mimetype,
      originalName: req.file.originalname,
      fileSize: req.file.size,
      pages: parseInt(pages) || 0
    };

    // Add PDF to notes
    notes.pdfs.push(newPDF);
    const savedNotes = await notes.save();

    // Format response data
    const responseData = formatResponseData(savedNotes);

    res.status(200).json({
      success: true,
      message: 'PDF added successfully',
      data: responseData
    });
  } catch (error) {
    console.error('Error adding PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding PDF',
      error: error.message
    });
  }
};

// Update PDF in notes
const updatePDFInNotes = async (req, res) => {
  try {
    const { pdfTitle, pdfDescription, pages } = req.body;
    
    const notes = await PaidNotes.findById(req.params.id);
    if (!notes) {
      return res.status(404).json({
        success: false,
        message: 'Notes not found'
      });
    }

    const pdf = notes.pdfs.id(req.params.pdfId);
    if (!pdf) {
      return res.status(404).json({
        success: false,
        message: 'PDF not found'
      });
    }

    // Update PDF file if new one is uploaded
    if (req.file) {
      pdf.pdfData = req.file.buffer;
      pdf.pdfMimeType = req.file.mimetype;
      pdf.originalName = req.file.originalname;
      pdf.fileSize = req.file.size;
    }

    // Update other fields
    if (pdfTitle) pdf.pdfTitle = pdfTitle;
    if (pdfDescription) pdf.pdfDescription = pdfDescription;
    if (pages !== undefined) pdf.pages = parseInt(pages);

    await notes.save();

    // Format response data
    const responseData = formatResponseData(notes);

    res.json({
      success: true,
      message: 'PDF updated successfully',
      data: responseData
    });
  } catch (error) {
    console.error('Error updating PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating PDF',
      error: error.message
    });
  }
};

// Delete PDF from notes
const deletePDFFromNotes = async (req, res) => {
  try {
    const notes = await PaidNotes.findById(req.params.id);
    if (!notes) {
      return res.status(404).json({
        success: false,
        message: 'Notes not found'
      });
    }

    const pdf = notes.pdfs.id(req.params.pdfId);
    if (!pdf) {
      return res.status(404).json({
        success: false,
        message: 'PDF not found'
      });
    }

    // Remove PDF from array
    notes.pdfs.pull(req.params.pdfId);
    await notes.save();

    // Format response data
    const responseData = formatResponseData(notes);

    res.json({
      success: true,
      message: 'PDF deleted successfully',
      data: responseData
    });
  } catch (error) {
    console.error('Error deleting PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting PDF',
      error: error.message
    });
  }
};

// Get notes by category
const getNotesByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const notes = await PaidNotes.find({ 
      category: category.toLowerCase(), 
      isActive: true 
    })
      .select('-thumbnail.data -pdfs.pdfData') // Exclude binary data
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await PaidNotes.countDocuments({ 
      category: category.toLowerCase(), 
      isActive: true 
    });
    
    res.json({
      success: true,
      data: notes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error getting notes by category:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving notes by category',
      error: error.message
    });
  }
};

// Increment view count
const incrementViewCount = async (req, res) => {
  try {
    const notes = await PaidNotes.findByIdAndUpdate(
      req.params.id,
      { $inc: { viewCount: 1 } },
      { new: true }
    ).select('-thumbnail.data -pdfs.pdfData');
    
    if (!notes) {
      return res.status(404).json({
        success: false,
        message: 'Notes not found'
      });
    }
    
    res.json({
      success: true,
      message: 'View count incremented',
      data: notes
    });
  } catch (error) {
    console.error('Error incrementing view count:', error);
    res.status(500).json({
      success: false,
      message: 'Error incrementing view count',
      error: error.message
    });
  }
};

// Purchase notes
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
      await purchase.completePurchase();

      return res.status(201).json({
        success: true,
        message: 'Successfully purchased the free notes',
        purchase: purchase
      });
    }

    // Handle paid notes
    if (notes.price > 0) {
      if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        return res.status(500).json({
          success: false,
          message: 'Payment gateway not configured'
        });
      }

      try {
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

        const razorpayOrder = await razorpay.orders.create(orderData);

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
        console.error('Razorpay order creation failed:', razorpayError);
        return res.status(500).json({
          success: false,
          message: 'Failed to create payment order. Please try again.',
          error: process.env.NODE_ENV === 'development' ? razorpayError.message : 'Payment gateway error'
        });
      }
    }

  } catch (error) {
    console.error('Notes purchase error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// Verify payment and complete purchase
const verifyPayment = async (req, res) => {
  try {
    const { purchaseId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    
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
    console.error('Payment verification error:', error);
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

// Check if student has access to notes
const checkNotesAccess = async (req, res) => {
  try {
    const { notesId } = req.params;
    
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const studentId = req.user.id;

    // Check if notes are free
    const notes = await PaidNotes.findById(notesId);
    if (!notes) {
      return res.status(404).json({
        success: false,
        message: 'Notes not found'
      });
    }

    if (notes.price === 0) {
      return res.status(200).json({
        success: true,
        hasAccess: true,
        isFree: true
      });
    }

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
      isFree: false,
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

module.exports = {
  createNotes,
  getAllNotes,
  getNotesById,
  getThumbnail,
  getPDF,
  updateNotes,
  deleteNotes,
  addPDFToNotes,
  updatePDFInNotes,
  deletePDFFromNotes,
  getNotesByCategory,
  incrementViewCount,
  purchaseNotes,
  verifyPayment,
  getStudentPurchasedNotes,
  checkNotesAccess,
  thumbnailUpload,
  pdfUpload
};