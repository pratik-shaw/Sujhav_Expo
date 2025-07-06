// controllers/paidMaterialsController.js
const PaidMaterials = require('../models/PaidMaterials');
const multer = require('multer');

// Configure multer for memory storage
const storage = multer.memoryStorage();

const photoUpload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit per photo
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

// Helper function to safely format response data
const formatResponseData = (materialData) => {
  const responseData = materialData.toObject();
  
  // Remove the binary data from photos for general responses
  if (responseData.materialPhotos) {
    responseData.materialPhotos = responseData.materialPhotos.map(photo => ({
      _id: photo._id,
      originalName: photo.originalName,
      filename: photo.filename,
      mimeType: photo.mimeType,
      size: photo.size,
      createdAt: photo.createdAt,
      updatedAt: photo.updatedAt
    }));
  }
  
  return responseData;
};

// Create new paid material
const createMaterial = async (req, res) => {
  try {
    const {
      materialTitle,
      description,
      price,
      category,
      class: className,
      rating,
      isActive
    } = req.body;

    // Validate required fields
    if (!materialTitle || !description || !price || !className) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: materialTitle, description, price, and class are required'
      });
    }

    // Validate price
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Price must be greater than 0 for paid materials'
      });
    }

    // Handle photos - store binary data in database
    const materialPhotos = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        materialPhotos.push({
          originalName: file.originalname,
          filename: `${Date.now()}-${Math.round(Math.random() * 1E9)}-${file.originalname}`,
          mimeType: file.mimetype,
          size: file.size,
          data: file.buffer
        });
      }
    }

    // Create new paid material
    const newMaterial = new PaidMaterials({
      materialTitle,
      description,
      price: parsedPrice,
      category: category?.toLowerCase() || 'jee',
      class: className,
      rating: parseFloat(rating) || 0,
      materialPhotos,
      isActive: isActive === 'true' || isActive === true
    });

    const savedMaterial = await newMaterial.save();
    
    // Format response data
    const responseData = formatResponseData(savedMaterial);

    res.status(201).json({
      success: true,
      message: 'Paid material created successfully',
      data: responseData
    });
  } catch (error) {
    console.error('Error creating paid material:', error);
    
    res.status(500).json({
      success: false,
      message: 'Error creating paid material',
      error: error.message
    });
  }
};

// Get all paid materials
const getAllMaterials = async (req, res) => {
  try {
    const { category, isActive, page = 1, limit = 10 } = req.query;
    
    const query = {};
    if (category) query.category = category.toLowerCase();
    if (isActive !== undefined) query.isActive = isActive === 'true';
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const materials = await PaidMaterials.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await PaidMaterials.countDocuments(query);
    
    // Format response data for all materials
    const formattedMaterials = materials.map(material => formatResponseData(material));
    
    res.json({
      success: true,
      data: formattedMaterials,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error getting paid materials:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving paid materials',
      error: error.message
    });
  }
};

// Get paid material by ID
const getMaterialById = async (req, res) => {
  try {
    const material = await PaidMaterials.findById(req.params.id);
    
    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Paid material not found'
      });
    }
    
    // Format response data
    const responseData = formatResponseData(material);
    
    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('Error getting paid material by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving paid material',
      error: error.message
    });
  }
};

// Get material photo by serving the binary data
const getMaterialPhoto = async (req, res) => {
  try {
    const material = await PaidMaterials.findById(req.params.id).select('materialPhotos');
    
    if (!material || !material.materialPhotos || material.materialPhotos.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Material or photos not found'
      });
    }
    
    const photo = material.materialPhotos.id(req.params.photoId);
    
    if (!photo) {
      return res.status(404).json({
        success: false,
        message: 'Photo not found'
      });
    }
    
    // Set appropriate headers
    res.set({
      'Content-Type': photo.mimeType,
      'Content-Length': photo.size,
      'Content-Disposition': `inline; filename="${photo.originalName}"`
    });
    
    // Send binary data
    res.send(photo.data);
  } catch (error) {
    console.error('Error getting material photo:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving material photo',
      error: error.message
    });
  }
};

// Update paid material
const updateMaterial = async (req, res) => {
  try {
    const {
      materialTitle,
      description,
      price,
      category,
      class: className,
      rating,
      isActive
    } = req.body;

    const material = await PaidMaterials.findById(req.params.id);
    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Paid material not found'
      });
    }

    // Validate price if provided
    if (price !== undefined) {
      const parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice) || parsedPrice <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Price must be greater than 0 for paid materials'
        });
      }
      material.price = parsedPrice;
    }

    // Handle new photos
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        material.materialPhotos.push({
          originalName: file.originalname,
          filename: `${Date.now()}-${Math.round(Math.random() * 1E9)}-${file.originalname}`,
          mimeType: file.mimetype,
          size: file.size,
          data: file.buffer
        });
      }
    }

    // Update fields
    if (materialTitle) material.materialTitle = materialTitle;
    if (description) material.description = description;
    if (category) material.category = category.toLowerCase();
    if (className) material.class = className;
    if (rating !== undefined) material.rating = parseFloat(rating);
    if (isActive !== undefined) material.isActive = isActive === 'true' || isActive === true;

    const updatedMaterial = await material.save();
    
    // Format response data
    const responseData = formatResponseData(updatedMaterial);
    
    res.json({
      success: true,
      message: 'Paid material updated successfully',
      data: responseData
    });
  } catch (error) {
    console.error('Error updating paid material:', error);
    
    res.status(500).json({
      success: false,
      message: 'Error updating paid material',
      error: error.message
    });
  }
};

// Delete paid material
const deleteMaterial = async (req, res) => {
  try {
    const material = await PaidMaterials.findById(req.params.id);
    
    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Paid material not found'
      });
    }

    await PaidMaterials.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'Paid material deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting paid material:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting paid material',
      error: error.message
    });
  }
};

// Add photo to material
const addPhotoToMaterial = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Photo file is required'
      });
    }

    const material = await PaidMaterials.findById(req.params.id);
    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Paid material not found'
      });
    }

    // Add new photo
    material.materialPhotos.push({
      originalName: req.file.originalname,
      filename: `${Date.now()}-${Math.round(Math.random() * 1E9)}-${req.file.originalname}`,
      mimeType: req.file.mimetype,
      size: req.file.size,
      data: req.file.buffer
    });

    await material.save();

    // Format response data
    const responseData = formatResponseData(material);

    res.json({
      success: true,
      message: 'Photo added to material successfully',
      data: responseData
    });
  } catch (error) {
    console.error('Error adding photo to material:', error);
    
    res.status(500).json({
      success: false,
      message: 'Error adding photo to material',
      error: error.message
    });
  }
};

// Delete photo from material
const deletePhotoFromMaterial = async (req, res) => {
  try {
    const material = await PaidMaterials.findById(req.params.id);
    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Paid material not found'
      });
    }

    const photo = material.materialPhotos.id(req.params.photoId);
    if (!photo) {
      return res.status(404).json({
        success: false,
        message: 'Photo not found in material'
      });
    }

    // Remove photo from array
    material.materialPhotos.pull(req.params.photoId);
    await material.save();

    // Format response data
    const responseData = formatResponseData(material);

    res.json({
      success: true,
      message: 'Photo deleted from material successfully',
      data: responseData
    });
  } catch (error) {
    console.error('Error deleting photo from material:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting photo from material',
      error: error.message
    });
  }
};

// Get materials by category
const getMaterialsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const materials = await PaidMaterials.find({ 
      category: category.toLowerCase(), 
      isActive: true 
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await PaidMaterials.countDocuments({ 
      category: category.toLowerCase(), 
      isActive: true 
    });
    
    // Format response data for all materials
    const formattedMaterials = materials.map(material => formatResponseData(material));
    
    res.json({
      success: true,
      data: formattedMaterials,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error getting materials by category:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving materials by category',
      error: error.message
    });
  }
};

// Increment view count
const incrementViewCount = async (req, res) => {
  try {
    const material = await PaidMaterials.findByIdAndUpdate(
      req.params.id,
      { $inc: { viewCount: 1 } },
      { new: true }
    );
    
    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Paid material not found'
      });
    }
    
    // Format response data
    const responseData = formatResponseData(material);
    
    res.json({
      success: true,
      message: 'View count incremented',
      data: responseData
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

// Purchase material
const purchaseMaterial = async (req, res) => {
  try {
    const { studentId, paymentId, amount } = req.body;
    
    if (!studentId || !paymentId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Student ID, payment ID, and amount are required'
      });
    }

    const material = await PaidMaterials.findById(req.params.id);
    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Paid material not found'
      });
    }

    // Check if student has already purchased
    if (material.hasPurchased(studentId)) {
      return res.status(400).json({
        success: false,
        message: 'Student has already purchased this material'
      });
    }

    // Validate amount
    if (parseFloat(amount) !== material.price) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount does not match material price'
      });
    }

    // Add purchase
    material.addPurchase(studentId, paymentId, parseFloat(amount));
    await material.save();

    res.json({
      success: true,
      message: 'Material purchased successfully',
      data: {
        materialId: material._id,
        studentId,
        paymentId,
        amount: parseFloat(amount)
      }
    });
  } catch (error) {
    console.error('Error purchasing material:', error);
    res.status(500).json({
      success: false,
      message: 'Error purchasing material',
      error: error.message
    });
  }
};

// Get student's purchased materials
const getStudentPurchasedMaterials = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const materials = await PaidMaterials.find({
      'purchasedStudents.studentId': studentId,
      isActive: true
    })
      .sort({ 'purchasedStudents.purchasedAt': -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await PaidMaterials.countDocuments({
      'purchasedStudents.studentId': studentId,
      isActive: true
    });
    
    // Format response data for all materials
    const formattedMaterials = materials.map(material => formatResponseData(material));
    
    res.json({
      success: true,
      data: formattedMaterials,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error getting student purchased materials:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving student purchased materials',
      error: error.message
    });
  }
};

module.exports = {
  createMaterial,
  getAllMaterials,
  getMaterialById,
  getMaterialPhoto,
  updateMaterial,
  deleteMaterial,
  addPhotoToMaterial,
  deletePhotoFromMaterial,
  getMaterialsByCategory,
  incrementViewCount,
  purchaseMaterial,
  getStudentPurchasedMaterials,
  photoUpload
};