// controllers/paidNotesController.js
const PaidNotes = require('../models/PaidNotes');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
const thumbnailsDir = path.join(uploadsDir, 'thumbnails');
const pdfsDir = path.join(uploadsDir, 'pdfs');

[uploadsDir, thumbnailsDir, pdfsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Multer configuration for thumbnails
const thumbnailStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, thumbnailsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'thumbnail-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const thumbnailUpload = multer({
  storage: thumbnailStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Multer configuration for PDFs
const pdfStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, pdfsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'pdf-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const pdfUpload = multer({
  storage: pdfStorage,
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

// Create new paid notes
const createNotes = async (req, res) => {
  try {
    console.log('Creating paid notes...');
    console.log('Request body:', req.body);
    console.log('Uploaded file:', req.file);

    const {
      notesTitle,
      tutor,
      rating,
      price,
      category,
      class: className,
      notesDetails,
      pdfLinks,
      isActive
    } = req.body;

    // Validate required fields
    if (!notesTitle || !tutor || !className) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: notesTitle, tutor, and class are required'
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

    // Parse pdfLinks if it's a string
    let parsedPdfLinks = [];
    if (pdfLinks) {
      try {
        parsedPdfLinks = typeof pdfLinks === 'string' ? JSON.parse(pdfLinks) : pdfLinks;
      } catch (error) {
        console.log('Error parsing pdfLinks:', error);
        parsedPdfLinks = [];
      }
    }

    // Handle thumbnail
    let thumbnailUrl = '';
    let thumbnailMetadata = {};
    
    if (req.file) {
      thumbnailUrl = `/api/uploads/thumbnails/${req.file.filename}`;
      thumbnailMetadata = {
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
        uploadedAt: new Date()
      };
    } else {
      return res.status(400).json({
        success: false,
        message: 'Thumbnail image is required'
      });
    }

    // Create new paid notes
    const newNotes = new PaidNotes({
      notesTitle,
      tutor,
      rating: parseFloat(rating) || 0,
      price: parseFloat(price) || 1,
      category: category?.toLowerCase() || 'jee',
      class: className,
      notesDetails: parsedNotesDetails,
      pdfLinks: parsedPdfLinks,
      notesThumbnail: thumbnailUrl,
      thumbnailMetadata,
      isActive: isActive === 'true' || isActive === true
    });

    const savedNotes = await newNotes.save();
    
    console.log('Paid notes created successfully:', savedNotes._id);

    res.status(201).json({
      success: true,
      message: 'Paid notes created successfully',
      data: savedNotes
    });
  } catch (error) {
    console.error('Error creating paid notes:', error);
    
    // Clean up uploaded file if there's an error
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting uploaded file:', err);
      });
    }
    
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
    const notes = await PaidNotes.findById(req.params.id);
    
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

// Update paid notes
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
      pdfLinks,
      isActive
    } = req.body;

    const notes = await PaidNotes.findById(req.params.id);
    if (!notes) {
      return res.status(404).json({
        success: false,
        message: 'Paid notes not found'
      });
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

    // Parse pdfLinks if it's a string
    let parsedPdfLinks;
    if (pdfLinks) {
      try {
        parsedPdfLinks = typeof pdfLinks === 'string' ? JSON.parse(pdfLinks) : pdfLinks;
      } catch (error) {
        console.log('Error parsing pdfLinks:', error);
      }
    }

    // Handle thumbnail update
    let thumbnailUrl = notes.notesThumbnail;
    let thumbnailMetadata = notes.thumbnailMetadata;
    
    if (req.file) {
      // Delete old thumbnail
      if (notes.notesThumbnail) {
        const oldThumbnailPath = path.join(__dirname, '../uploads', notes.notesThumbnail.replace('/api/uploads/', ''));
        fs.unlink(oldThumbnailPath, (err) => {
          if (err) console.error('Error deleting old thumbnail:', err);
        });
      }
      
      thumbnailUrl = `/api/uploads/thumbnails/${req.file.filename}`;
      thumbnailMetadata = {
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
        uploadedAt: new Date()
      };
    }

    // Update fields
    if (notesTitle) notes.notesTitle = notesTitle;
    if (tutor) notes.tutor = tutor;
    if (rating !== undefined) notes.rating = parseFloat(rating);
    if (price !== undefined) notes.price = parseFloat(price);
    if (category) notes.category = category.toLowerCase();
    if (className) notes.class = className;
    if (parsedNotesDetails) notes.notesDetails = parsedNotesDetails;
    if (parsedPdfLinks) notes.pdfLinks = parsedPdfLinks;
    if (isActive !== undefined) notes.isActive = isActive === 'true' || isActive === true;
    
    notes.notesThumbnail = thumbnailUrl;
    notes.thumbnailMetadata = thumbnailMetadata;

    const updatedNotes = await notes.save();
    
    res.json({
      success: true,
      message: 'Paid notes updated successfully',
      data: updatedNotes
    });
  } catch (error) {
    console.error('Error updating paid notes:', error);
    
    // Clean up uploaded file if there's an error
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting uploaded file:', err);
      });
    }
    
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

    // Delete thumbnail file
    if (notes.notesThumbnail) {
      const thumbnailPath = path.join(__dirname, '../uploads', notes.notesThumbnail.replace('/api/uploads/', ''));
      fs.unlink(thumbnailPath, (err) => {
        if (err) console.error('Error deleting thumbnail:', err);
      });
    }

    // Delete PDF files
    notes.pdfLinks.forEach(pdf => {
      if (pdf.pdfUrl) {
        const pdfPath = path.join(__dirname, '../uploads', pdf.pdfUrl.replace('/api/uploads/', ''));
        fs.unlink(pdfPath, (err) => {
          if (err) console.error('Error deleting PDF:', err);
        });
      }
    });

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
    const { pdfTitle, pdfDescription, fileSize, pages } = req.body;
    
    if (!pdfTitle || !pdfDescription) {
      return res.status(400).json({
        success: false,
        message: 'PDF title and description are required'
      });
    }

    const notes = await PaidNotes.findById(req.params.id);
    if (!notes) {
      return res.status(404).json({
        success: false,
        message: 'Paid notes not found'
      });
    }

    let pdfUrl = '';
    if (req.file) {
      pdfUrl = `/api/uploads/pdfs/${req.file.filename}`;
    } else {
      return res.status(400).json({
        success: false,
        message: 'PDF file is required'
      });
    }

    const newPDF = {
      pdfTitle,
      pdfDescription,
      pdfUrl,
      fileSize: fileSize || `${(req.file.size / 1024 / 1024).toFixed(2)} MB`,
      pages: parseInt(pages) || 0
    };

    notes.pdfLinks.push(newPDF);
    await notes.save();

    res.json({
      success: true,
      message: 'PDF added to paid notes successfully',
      data: notes
    });
  } catch (error) {
    console.error('Error adding PDF to paid notes:', error);
    
    // Clean up uploaded file if there's an error
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting uploaded file:', err);
      });
    }
    
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
    const { pdfTitle, pdfDescription, fileSize, pages } = req.body;
    
    const notes = await PaidNotes.findById(req.params.id);
    if (!notes) {
      return res.status(404).json({
        success: false,
        message: 'Paid notes not found'
      });
    }

    const pdfIndex = notes.pdfLinks.findIndex(pdf => pdf._id.toString() === req.params.pdfId);
    if (pdfIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'PDF not found in paid notes'
      });
    }

    const existingPDF = notes.pdfLinks[pdfIndex];
    
    // Update PDF file if new one is uploaded
    if (req.file) {
      // Delete old PDF file
      if (existingPDF.pdfUrl) {
        const oldPdfPath = path.join(__dirname, '../uploads', existingPDF.pdfUrl.replace('/api/uploads/', ''));
        fs.unlink(oldPdfPath, (err) => {
          if (err) console.error('Error deleting old PDF:', err);
        });
      }
      
      existingPDF.pdfUrl = `/api/uploads/pdfs/${req.file.filename}`;
      existingPDF.fileSize = fileSize || `${(req.file.size / 1024 / 1024).toFixed(2)} MB`;
    }

    // Update other fields
    if (pdfTitle) existingPDF.pdfTitle = pdfTitle;
    if (pdfDescription) existingPDF.pdfDescription = pdfDescription;
    if (pages !== undefined) existingPDF.pages = parseInt(pages);

    await notes.save();

    res.json({
      success: true,
      message: 'PDF updated successfully',
      data: notes
    });
  } catch (error) {
    console.error('Error updating PDF in paid notes:', error);
    
    // Clean up uploaded file if there's an error
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting uploaded file:', err);
      });
    }
    
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

    const pdfIndex = notes.pdfLinks.findIndex(pdf => pdf._id.toString() === req.params.pdfId);
    if (pdfIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'PDF not found in paid notes'
      });
    }

    const pdfToDelete = notes.pdfLinks[pdfIndex];
    
    // Delete PDF file
    if (pdfToDelete.pdfUrl) {
      const pdfPath = path.join(__dirname, '../uploads', pdfToDelete.pdfUrl.replace('/api/uploads/', ''));
      fs.unlink(pdfPath, (err) => {
        if (err) console.error('Error deleting PDF file:', err);
      });
    }

    // Remove PDF from array
    notes.pdfLinks.splice(pdfIndex, 1);
    await notes.save();

    res.json({
      success: true,
      message: 'PDF deleted from paid notes successfully',
      data: notes
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

// Enroll student in paid notes
const enrollStudent = async (req, res) => {
  try {
    const { studentId, paymentId } = req.body;
    
    if (!studentId || !paymentId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID and payment ID are required'
      });
    }

    const notes = await PaidNotes.findById(req.params.id);
    if (!notes) {
      return res.status(404).json({
        success: false,
        message: 'Paid notes not found'
      });
    }

    // Check if student is already enrolled
    const existingEnrollment = notes.studentsEnrolled.find(
      enrollment => enrollment.studentId.toString() === studentId
    );

    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: 'Student is already enrolled in this paid notes'
      });
    }

    // Add student to enrollment
    notes.studentsEnrolled.push({
      studentId,
      paymentId,
      paymentStatus: 'completed'
    });

    await notes.save();

    res.json({
      success: true,
      message: 'Student enrolled in paid notes successfully',
      data: notes
    });
  } catch (error) {
    console.error('Error enrolling student in paid notes:', error);
    res.status(500).json({
      success: false,
      message: 'Error enrolling student in paid notes',
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

module.exports = {
  createNotes,
  getAllNotes,
  getNotesById,
  updateNotes,
  deleteNotes,
  addPDFToNotes,
  updatePDFInNotes,
  deletePDFFromNotes,
  enrollStudent,
  getNotesByCategory,
  thumbnailUpload,
  pdfUpload
};