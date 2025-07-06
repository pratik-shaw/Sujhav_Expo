// routes/paidMaterialsRoutes.js
const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/paidMaterialsController');

// Admin routes (require admin authentication)
router.post('/', photoUpload.array('photos', 10), createMaterial); // Allow up to 10 photos
router.put('/:id', photoUpload.array('photos', 10), updateMaterial);
router.delete('/:id', deleteMaterial);

// Photo management routes (Admin only)
router.post('/:id/photos', photoUpload.single('photo'), addPhotoToMaterial);
router.delete('/:id/photos/:photoId', deletePhotoFromMaterial);

// Public routes (accessible by users)
router.get('/', getAllMaterials);
router.get('/category/:category', getMaterialsByCategory);
router.get('/:id', getMaterialById);

// Photo serving routes
router.get('/:id/photos/:photoId', getMaterialPhoto);

// User interaction routes
router.post('/:id/view', incrementViewCount);
router.post('/:id/purchase', purchaseMaterial);

// Student purchase history
router.get('/student/:studentId/purchased', getStudentPurchasedMaterials);

module.exports = router;