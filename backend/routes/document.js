const express = require('express');
const { DocumentController, createDocumentValidation, updateDocumentValidation } = require('../controllers/documentController');
const { authenticateToken, requireAdmin } = require('../middlewares/authJwt');
const { uploadDocument, handleUploadError } = require('../middlewares/upload');

const router = express.Router();

// Public routes
router.get('/', DocumentController.getAllDocuments);
router.get('/categories', DocumentController.getCategories);
router.get('/:id', DocumentController.getDocumentById);
router.post('/:id/download', DocumentController.incrementDownload);

// Admin only routes
router.post('/',
  authenticateToken,
  requireAdmin,
  uploadDocument.single('document'),
  handleUploadError,
  createDocumentValidation,
  DocumentController.createDocument
);

router.put('/:id',
  authenticateToken,
  requireAdmin,
  uploadDocument.single('document'),
  handleUploadError,
  updateDocumentValidation,
  DocumentController.updateDocument
);

router.delete('/:id',
  authenticateToken,
  requireAdmin,
  DocumentController.deleteDocument
);

module.exports = router;
