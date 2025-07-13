const express = require('express');
const router = express.Router();
const { EnhancedNewsController, createNewsValidation, updateNewsValidation } = require('../controllers/enhancedNewsController');
const { verifyToken, isAdmin } = require('../middlewares/authJwt');

// Public routes
router.get('/', EnhancedNewsController.getAllNews);
router.get('/featured', EnhancedNewsController.getFeaturedNews);
router.get('/:id', EnhancedNewsController.getNewsById);

// Protected routes (admin only)
router.use(verifyToken);
router.post('/', isAdmin, createNewsValidation, EnhancedNewsController.createNews);
router.put('/:id', isAdmin, updateNewsValidation, EnhancedNewsController.updateNews);
router.delete('/:id', isAdmin, EnhancedNewsController.deleteNews);

module.exports = router;
