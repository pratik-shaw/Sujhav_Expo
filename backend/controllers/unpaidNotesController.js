// controllers/unpaidNotesController.js
const UnpaidNotes = require('../models/UnpaidNotes');
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

// Create new unpaid notes
const createNotes = async (req, res) => {
  try {
    const {
      notesTitle,
      tutor,
      rating,
      category,
      class: className,
      notesDetails,
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

    // Create new unpaid notes
    const newNotes = new UnpaidNotes({
      notesTitle,
      tutor,
      rating: parseFloat(rating) || 0,
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
      message: 'Unpaid notes created successfully',
      data: responseData
    });
  } catch (error) {
    console.error('Error creating unpaid notes:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating unpaid notes',
      error: error.message
    });
  }
};

// Get all unpaid notes
const getAllNotes = async (req, res) => {
  try {
    const { category, isActive, page = 1, limit = 10 } = req.query;
    
    const query = {};
    if (category) query.category = category.toLowerCase();
    if (isActive !== undefined) query.isActive = isActive === 'true';
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const notes = await UnpaidNotes.find(query)
      .select('-thumbnail.data -pdfs.pdfData') // Exclude binary data
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await UnpaidNotes.countDocuments(query);
    
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
    console.error('Error getting unpaid notes:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving unpaid notes',
      error: error.message
    });
  }
};

// Get unpaid notes by ID
const getNotesById = async (req, res) => {
  try {
    const notes = await UnpaidNotes.findById(req.params.id)
      .select('-thumbnail.data -pdfs.pdfData'); // Exclude binary data
    
    if (!notes) {
      return res.status(404).json({
        success: false,
        message: 'Unpaid notes not found'
      });
    }
    
    res.json({
      success: true,
      data: notes
    });
  } catch (error) {
    console.error('Error getting unpaid notes by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving unpaid notes',
      error: error.message
    });
  }
};

// Get thumbnail image
const getThumbnail = async (req, res) => {
  try {
    const notes = await UnpaidNotes.findById(req.params.id).select('thumbnail');
    
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

// Get PDF file
const getPDF = async (req, res) => {
  try {
    const notes = await UnpaidNotes.findById(req.params.id);
    
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
      category,
      class: className,
      notesDetails,
      isActive
    } = req.body;

    const notes = await UnpaidNotes.findById(req.params.id);
    if (!notes) {
      return res.status(404).json({
        success: false,
        message: 'Unpaid notes not found'
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
      message: 'Unpaid notes updated successfully',
      data: responseData
    });
  } catch (error) {
    console.error('Error updating unpaid notes:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating unpaid notes',
      error: error.message
    });
  }
};

// Delete unpaid notes
const deleteNotes = async (req, res) => {
  try {
    const notes = await UnpaidNotes.findById(req.params.id);
    
    if (!notes) {
      return res.status(404).json({
        success: false,
        message: 'Unpaid notes not found'
      });
    }

    await UnpaidNotes.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'Unpaid notes deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting unpaid notes:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting unpaid notes',
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
    const notes = await UnpaidNotes.findById(req.params.id);
    if (!notes) {
      return res.status(404).json({
        success: false,
        message: 'Unpaid notes not found'
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
      message: 'PDF added to unpaid notes successfully',
      data: responseData
    });
  } catch (error) {
    console.error('Error adding PDF to unpaid notes:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding PDF to unpaid notes',
      error: error.message
    });
  }
};

// Update PDF in notes
const updatePDFInNotes = async (req, res) => {
  try {
    const { pdfTitle, pdfDescription, pages } = req.body;
    
    const notes = await UnpaidNotes.findById(req.params.id);
    if (!notes) {
      return res.status(404).json({
        success: false,
        message: 'Unpaid notes not found'
      });
    }

    const pdf = notes.pdfs.id(req.params.pdfId);
    if (!pdf) {
      return res.status(404).json({
        success: false,
        message: 'PDF not found in unpaid notes'
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
    console.error('Error updating PDF in unpaid notes:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating PDF in unpaid notes',
      error: error.message
    });
  }
};

// Delete PDF from notes
const deletePDFFromNotes = async (req, res) => {
  try {
    const notes = await UnpaidNotes.findById(req.params.id);
    if (!notes) {
      return res.status(404).json({
        success: false,
        message: 'Unpaid notes not found'
      });
    }

    const pdf = notes.pdfs.id(req.params.pdfId);
    if (!pdf) {
      return res.status(404).json({
        success: false,
        message: 'PDF not found in unpaid notes'
      });
    }

    // Remove PDF from array
    notes.pdfs.pull(req.params.pdfId);
    await notes.save();

    // Format response data
    const responseData = formatResponseData(notes);

    res.json({
      success: true,
      message: 'PDF deleted from unpaid notes successfully',
      data: responseData
    });
  } catch (error) {
    console.error('Error deleting PDF from unpaid notes:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting PDF from unpaid notes',
      error: error.message
    });
  }
};

// Get unpaid notes by category
const getNotesByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const notes = await UnpaidNotes.find({ 
      category: category.toLowerCase(), 
      isActive: true 
    })
      .select('-thumbnail.data -pdfs.pdfData') // Exclude binary data
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await UnpaidNotes.countDocuments({ 
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
    console.error('Error getting unpaid notes by category:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving unpaid notes by category',
      error: error.message
    });
  }
};

// Increment view count
const incrementViewCount = async (req, res) => {
  try {
    const notes = await UnpaidNotes.findByIdAndUpdate(
      req.params.id,
      { $inc: { viewCount: 1 } },
      { new: true }
    ).select('-thumbnail.data -pdfs.pdfData');
    
    if (!notes) {
      return res.status(404).json({
        success: false,
        message: 'Unpaid notes not found'
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
  thumbnailUpload,
  pdfUpload
};