const express = require('express');
const { UploadController, uploadValidation } = require('../controllers/uploadController');
const { authenticateToken, requireAdmin } = require('../middlewares/authJwt');
const { uploadImage, uploadVideo, uploadDocument, handleUploadError } = require('../middlewares/upload');

const router = express.Router();

// Upload single image (Admin only)
router.post('/image',
  authenticateToken,
  requireAdmin,
  uploadImage.single('image'),
  handleUploadError,
  uploadValidation,
  UploadController.uploadImage
);

// Upload single video (Admin only)
router.post('/video',
  authenticateToken,
  requireAdmin,
  uploadVideo.single('video'),
  handleUploadError,
  uploadValidation,
  UploadController.uploadVideo
);

// Upload single document (Admin only)
router.post('/document',
  authenticateToken,
  requireAdmin,
  uploadDocument.single('document'),
  handleUploadError,
  uploadValidation,
  UploadController.uploadDocument
);

// Upload multiple images for blog content (Admin only)
router.post('/images',
  authenticateToken,
  requireAdmin,
  uploadImage.array('images', 10), // Maximum 10 images
  handleUploadError,
  uploadValidation,
  UploadController.uploadMultipleImages
);

module.exports = router;
