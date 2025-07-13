const express = require('express');
const router = express.Router();
const { EnhancedDocumentController } = require('../controllers/enhancedDocumentController');
const { verifyToken } = require('../middlewares/authJwt');

// Public routes (no authentication required)
router.get('/', EnhancedDocumentController.getPublicDocuments);
router.get('/stats', EnhancedDocumentController.getDocumentStats);
router.get('/search', EnhancedDocumentController.searchDocuments);
router.get('/:id', EnhancedDocumentController.getDocumentById);

// Download and preview routes (optional authentication for logging)
router.get('/:id/download', (req, res, next) => {
  // Try to authenticate but don't require it
  if (req.headers.authorization) {
    verifyToken(req, res, next);
  } else {
    next();
  }
}, EnhancedDocumentController.downloadDocument);

router.get('/:id/preview', (req, res, next) => {
  // Try to authenticate but don't require it
  if (req.headers.authorization) {
    verifyToken(req, res, next);
  } else {
    next();
  }
}, EnhancedDocumentController.previewDocument);

module.exports = router;
