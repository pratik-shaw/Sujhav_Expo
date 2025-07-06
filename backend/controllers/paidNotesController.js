// controllers/paidNotesController.js
const PaidNotes = require('../models/PaidNotes');
const multer = require('multer');

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
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Price must be greater than 0 for paid notes'
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
      message: 'Paid notes created successfully',
      data: responseData
    });
  } catch (error) {
    console.error('Error creating paid notes:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating paid notes',
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
    console.error('Error getting paid notes:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving paid notes',
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
        message: 'Paid notes not found'
      });
    }
    
    res.json({
      success: true,
      data: notes
    });
  } catch (error) {
    console.error('Error getting paid notes by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving paid notes',
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

// Get PDF file (only for purchased students)
const getPDF = async (req, res) => {
  try {
    const notes = await PaidNotes.findById(req.params.id);
    
    if (!notes) {
      return res.status(404).json({
        success: false,
        message: 'Notes not found'
      });
    }
    
    // Check if student has purchased the notes
    // This would require authentication middleware to get the student ID
    // For now, we'll assume the check is done in middleware
    
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
        message: 'Paid notes not found'
      });
    }

    // Validate price if provided
    if (price !== undefined) {
      const parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice) || parsedPrice <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Price must be greater than 0 for paid notes'
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
      message: 'Paid notes updated successfully',
      data: responseData
    });
  } catch (error) {
    console.error('Error updating paid notes:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating paid notes',
      error: error.message
    });
  }
};

// Delete paid notes
const deleteNotes = async (req, res) => {
  try {
    const notes = await PaidNotes.findById(req.params.id);
    
    if (!notes) {
      return res.status(404).json({
        success: false,
        message: 'Paid notes not found'
      });
    }

    await PaidNotes.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'Paid notes deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting paid notes:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting paid notes',
      error: error.message
    });
  }
};

// Add PDF to notes
const addPDFToNotes = async (req, res) => {
  try {
    console.log('Add PDF Request Body:', req.body);
    console.log('Add PDF File:', req.file);
    
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
        message: 'Paid notes not found'
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
      message: 'PDF added to paid notes successfully',
      data: responseData
    });
  } catch (error) {
    console.error('Error adding PDF to paid notes:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding PDF to paid notes',
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
        message: 'Paid notes not found'
      });
    }

    const pdf = notes.pdfs.id(req.params.pdfId);
    if (!pdf) {
      return res.status(404).json({
        success: false,
        message: 'PDF not found in paid notes'
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
    console.error('Error updating PDF in paid notes:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating PDF in paid notes',
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
        message: 'Paid notes not found'
      });
    }

    const pdf = notes.pdfs.id(req.params.pdfId);
    if (!pdf) {
      return res.status(404).json({
        success: false,
        message: 'PDF not found in paid notes'
      });
    }

    // Remove PDF from array
    notes.pdfs.pull(req.params.pdfId);
    await notes.save();

    // Format response data
    const responseData = formatResponseData(notes);

    res.json({
      success: true,
      message: 'PDF deleted from paid notes successfully',
      data: responseData
    });
  } catch (error) {
    console.error('Error deleting PDF from paid notes:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting PDF from paid notes',
      error: error.message
    });
  }
};

// Get paid notes by category
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
    console.error('Error getting paid notes by category:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving paid notes by category',
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
        message: 'Paid notes not found'
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
    const { studentId, paymentId, amount } = req.body;
    
    if (!studentId || !paymentId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Student ID, payment ID, and amount are required'
      });
    }

    const notes = await PaidNotes.findById(req.params.id);
    if (!notes) {
      return res.status(404).json({
        success: false,
        message: 'Paid notes not found'
      });
    }

    // Check if student has already purchased
    if (notes.hasPurchased(studentId)) {
      return res.status(400).json({
        success: false,
        message: 'Student has already purchased these notes'
      });
    }

    // Validate amount
    if (parseFloat(amount) !== notes.price) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount does not match notes price'
      });
    }

    // Add purchase
    notes.addPurchase(studentId, paymentId, parseFloat(amount));
    await notes.save();

    res.json({
      success: true,
      message: 'Notes purchased successfully',
      data: {
        notesId: notes._id,
        studentId,
        paymentId,
        amount: parseFloat(amount)
      }
    });
  } catch (error) {
    console.error('Error purchasing notes:', error);
    res.status(500).json({
      success: false,
      message: 'Error purchasing notes',
      error: error.message
    });
  }
};

// Get student's purchased notes
const getStudentPurchasedNotes = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const notes = await PaidNotes.find({
      'purchasedStudents.studentId': studentId,
      isActive: true
    })
      .select('-thumbnail.data -pdfs.pdfData')
      .sort({ 'purchasedStudents.purchasedAt': -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await PaidNotes.countDocuments({
      'purchasedStudents.studentId': studentId,
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
    console.error('Error getting student purchased notes:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving student purchased notes',
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
  getStudentPurchasedNotes,
  thumbnailUpload,
  pdfUpload
};