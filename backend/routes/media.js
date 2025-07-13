const express = require('express');
const router = express.Router();
const { MediaController, uploadMediaValidation, updateMediaValidation } = require('../controllers/mediaController');
const { verifyToken, isAdmin } = require('../middlewares/authJwt');
const fileUpload = require('express-fileupload');

// Configure file upload middleware
const uploadConfig = {
  limits: { 
    fileSize: 100 * 1024 * 1024 // 100MB limit
  },
  abortOnLimit: true,
  responseOnLimit: 'File size limit exceeded (100MB max)',
  useTempFiles: true,
  tempFileDir: '/tmp/',
  createParentPath: true
};

// Apply file upload middleware to upload routes
router.use('/upload', fileUpload(uploadConfig));

// Public routes
router.get('/stats', MediaController.getMediaStats);

// Protected routes (require authentication)
router.use(verifyToken);

// Upload media (authenticated users)
router.post('/upload', uploadMediaValidation, MediaController.uploadMedia);

// Get all media with filters and pagination
router.get('/', MediaController.getAllMedia);

// Get media by ID
router.get('/:id', MediaController.getMediaById);

// Update media information
router.put('/:id', updateMediaValidation, MediaController.updateMedia);

// Delete media (admin or owner only)
router.delete('/:id', MediaController.deleteMedia);

module.exports = router;
