// controllers/dppController.js
const DPP = require('../models/DPP');
const multer = require('multer');

// Configure multer for memory storage
const storage = multer.memoryStorage();

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
const formatResponseData = (dppData) => {
  const responseData = dppData.toObject();
  
  // Remove PDF binary data from response
  if (responseData.questionPDF) {
    delete responseData.questionPDF.pdfData;
  }
  
  if (responseData.answerPDF) {
    delete responseData.answerPDF.pdfData;
  }
  
  return responseData;
};

// Create new DPP
const createDPP = async (req, res) => {
  try {
    const {
      title,
      class: className,
      category,
      questionActive,
      answerActive,
      questionPages,
      answerPages
    } = req.body;

    // Validate required fields
    if (!title || !className || !category) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: title, class, and category are required'
      });
    }

    // Check if files are present
    const questionFile = req.files?.questionPDF?.[0];
    const answerFile = req.files?.answerPDF?.[0];

    if (!questionFile) {
      return res.status(400).json({
        success: false,
        message: 'Question PDF is required'
      });
    }

    // Validate file types
    if (questionFile.mimetype !== 'application/pdf') {
      return res.status(400).json({
        success: false,
        message: 'Question file must be a PDF'
      });
    }

    if (answerFile && answerFile.mimetype !== 'application/pdf') {
      return res.status(400).json({
        success: false,
        message: 'Answer file must be a PDF'
      });
    }

    // Create question PDF object
    const questionPDF = {
      pdfData: questionFile.buffer,
      pdfMimeType: questionFile.mimetype,
      originalName: questionFile.originalname,
      fileSize: questionFile.size,
      pages: parseInt(questionPages) || 0
    };

    // Create answer PDF object if provided
    let answerPDF = null;
    if (answerFile) {
      answerPDF = {
        pdfData: answerFile.buffer,
        pdfMimeType: answerFile.mimetype,
        originalName: answerFile.originalname,
        fileSize: answerFile.size,
        pages: parseInt(answerPages) || 0
      };
    }

    // Create new DPP
    const newDPP = new DPP({
      title,
      class: className,
      category: category.toLowerCase(),
      questionPDF,
      answerPDF,
      questionActive: questionActive === 'true' || questionActive === true,
      answerActive: answerActive === 'true' || answerActive === true
    });

    const savedDPP = await newDPP.save();
    
    // Format response data
    const responseData = formatResponseData(savedDPP);

    res.status(201).json({
      success: true,
      message: 'DPP created successfully',
      data: responseData
    });
  } catch (error) {
    console.error('Error creating DPP:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating DPP',
      error: error.message
    });
  }
};

// Get all DPPs
const getAllDPPs = async (req, res) => {
  try {
    const { category, class: className, questionActive, page = 1, limit = 10 } = req.query;
    
    const query = {};
    if (category) query.category = category.toLowerCase();
    if (className) query.class = className;
    if (questionActive !== undefined) query.questionActive = questionActive === 'true';
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const dpps = await DPP.find(query)
      .select('-questionPDF.pdfData -answerPDF.pdfData') // Exclude binary data
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await DPP.countDocuments(query);
    
    res.json({
      success: true,
      data: dpps,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error getting DPPs:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving DPPs',
      error: error.message
    });
  }
};

// Get DPP by ID
const getDPPById = async (req, res) => {
  try {
    const dpp = await DPP.findById(req.params.id)
      .select('-questionPDF.pdfData -answerPDF.pdfData'); // Exclude binary data
    
    if (!dpp) {
      return res.status(404).json({
        success: false,
        message: 'DPP not found'
      });
    }
    
    res.json({
      success: true,
      data: dpp
    });
  } catch (error) {
    console.error('Error getting DPP by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving DPP',
      error: error.message
    });
  }
};

// Get question PDF
const getQuestionPDF = async (req, res) => {
  try {
    const dpp = await DPP.findById(req.params.id);
    
    if (!dpp) {
      return res.status(404).json({
        success: false,
        message: 'DPP not found'
      });
    }

    if (!dpp.questionActive) {
      return res.status(403).json({
        success: false,
        message: 'Question PDF is not active'
      });
    }
    
    if (!dpp.questionPDF) {
      return res.status(404).json({
        success: false,
        message: 'Question PDF not found'
      });
    }
    
    res.set({
      'Content-Type': dpp.questionPDF.pdfMimeType,
      'Content-Length': dpp.questionPDF.fileSize,
      'Content-Disposition': `inline; filename="${dpp.questionPDF.originalName}"`
    });
    
    res.send(dpp.questionPDF.pdfData);
  } catch (error) {
    console.error('Error getting question PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving question PDF',
      error: error.message
    });
  }
};

// Get answer PDF (only if answer is active)
const getAnswerPDF = async (req, res) => {
  try {
    const dpp = await DPP.findById(req.params.id);
    
    if (!dpp) {
      return res.status(404).json({
        success: false,
        message: 'DPP not found'
      });
    }

    if (!dpp.answerActive) {
      return res.status(403).json({
        success: false,
        message: 'Answer PDF is not active or accessible'
      });
    }
    
    if (!dpp.answerPDF || !dpp.answerPDF.pdfData) {
      return res.status(404).json({
        success: false,
        message: 'Answer PDF not found'
      });
    }
    
    res.set({
      'Content-Type': dpp.answerPDF.pdfMimeType,
      'Content-Length': dpp.answerPDF.fileSize,
      'Content-Disposition': `inline; filename="${dpp.answerPDF.originalName}"`
    });
    
    res.send(dpp.answerPDF.pdfData);
  } catch (error) {
    console.error('Error getting answer PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving answer PDF',
      error: error.message
    });
  }
};

// Update DPP
const updateDPP = async (req, res) => {
  try {
    const {
      title,
      class: className,
      category,
      questionActive,
      answerActive,
      questionPages,
      answerPages
    } = req.body;

    const dpp = await DPP.findById(req.params.id);
    if (!dpp) {
      return res.status(404).json({
        success: false,
        message: 'DPP not found'
      });
    }

    // Handle file updates
    const questionFile = req.files?.questionPDF?.[0];
    const answerFile = req.files?.answerPDF?.[0];

    if (questionFile) {
      if (questionFile.mimetype !== 'application/pdf') {
        return res.status(400).json({
          success: false,
          message: 'Question file must be a PDF'
        });
      }
      
      dpp.questionPDF = {
        pdfData: questionFile.buffer,
        pdfMimeType: questionFile.mimetype,
        originalName: questionFile.originalname,
        fileSize: questionFile.size,
        pages: parseInt(questionPages) || dpp.questionPDF.pages
      };
    }

    if (answerFile) {
      if (answerFile.mimetype !== 'application/pdf') {
        return res.status(400).json({
          success: false,
          message: 'Answer file must be a PDF'
        });
      }
      
      dpp.answerPDF = {
        pdfData: answerFile.buffer,
        pdfMimeType: answerFile.mimetype,
        originalName: answerFile.originalname,
        fileSize: answerFile.size,
        pages: parseInt(answerPages) || (dpp.answerPDF?.pages || 0)
      };
    }

    // Update other fields
    if (title) dpp.title = title;
    if (className) dpp.class = className;
    if (category) dpp.category = category.toLowerCase();
    if (questionActive !== undefined) dpp.questionActive = questionActive === 'true' || questionActive === true;
    if (answerActive !== undefined) dpp.answerActive = answerActive === 'true' || answerActive === true;

    const updatedDPP = await dpp.save();
    
    // Format response data
    const responseData = formatResponseData(updatedDPP);
    
    res.json({
      success: true,
      message: 'DPP updated successfully',
      data: responseData
    });
  } catch (error) {
    console.error('Error updating DPP:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating DPP',
      error: error.message
    });
  }
};

// Delete DPP
const deleteDPP = async (req, res) => {
  try {
    const dpp = await DPP.findById(req.params.id);
    
    if (!dpp) {
      return res.status(404).json({
        success: false,
        message: 'DPP not found'
      });
    }

    await DPP.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'DPP deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting DPP:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting DPP',
      error: error.message
    });
  }
};

// Get DPPs by category
const getDPPsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 10, class: className } = req.query;
    
    const query = { 
      category: category.toLowerCase(), 
      questionActive: true 
    };
    
    if (className) query.class = className;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const dpps = await DPP.find(query)
      .select('-questionPDF.pdfData -answerPDF.pdfData') // Exclude binary data
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await DPP.countDocuments(query);
    
    res.json({
      success: true,
      data: dpps,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error getting DPPs by category:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving DPPs by category',
      error: error.message
    });
  }
};

// Get DPPs by class
const getDPPsByClass = async (req, res) => {
  try {
    const { class: className } = req.params;
    const { page = 1, limit = 10, category } = req.query;
    
    const query = { 
      class: className, 
      questionActive: true 
    };
    
    if (category) query.category = category.toLowerCase();
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const dpps = await DPP.find(query)
      .select('-questionPDF.pdfData -answerPDF.pdfData') // Exclude binary data
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await DPP.countDocuments(query);
    
    res.json({
      success: true,
      data: dpps,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error getting DPPs by class:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving DPPs by class',
      error: error.message
    });
  }
};

// Increment view count
const incrementViewCount = async (req, res) => {
  try {
    const dpp = await DPP.findByIdAndUpdate(
      req.params.id,
      { $inc: { viewCount: 1 } },
      { new: true }
    ).select('-questionPDF.pdfData -answerPDF.pdfData');
    
    if (!dpp) {
      return res.status(404).json({
        success: false,
        message: 'DPP not found'
      });
    }
    
    res.json({
      success: true,
      message: 'View count incremented',
      data: dpp
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

// Toggle answer accessibility
const toggleAnswerAccessibility = async (req, res) => {
  try {
    const dpp = await DPP.findById(req.params.id);
    
    if (!dpp) {
      return res.status(404).json({
        success: false,
        message: 'DPP not found'
      });
    }

    // Toggle answer active status
    dpp.answerActive = !dpp.answerActive;
    await dpp.save();

    // Format response data
    const responseData = formatResponseData(dpp);
    
    res.json({
      success: true,
      message: `Answer ${dpp.answerActive ? 'activated' : 'deactivated'} successfully`,
      data: responseData
    });
  } catch (error) {
    console.error('Error toggling answer accessibility:', error);
    res.status(500).json({
      success: false,
      message: 'Error toggling answer accessibility',
      error: error.message
    });
  }
};

module.exports = {
  createDPP,
  getAllDPPs,
  getDPPById,
  getQuestionPDF,
  getAnswerPDF,
  updateDPP,
  deleteDPP,
  getDPPsByCategory,
  getDPPsByClass,
  incrementViewCount,
  toggleAnswerAccessibility,
  pdfUpload
};