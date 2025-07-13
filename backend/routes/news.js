const express = require('express');
const { NewsController, createNewsValidation, updateNewsValidation } = require('../controllers/newsController');
const { authenticateToken, requireAdmin } = require('../middlewares/authJwt');

const router = express.Router();

// Public routes
router.get('/', NewsController.getAllNews);
router.get('/featured', NewsController.getFeaturedNews);
router.get('/:id', NewsController.getNewsById);

// Admin routes
router.get('/admin/all', 
  authenticateToken, 
  requireAdmin, 
  NewsController.getAdminNews
);

router.post('/', 
  authenticateToken, 
  requireAdmin, 
  createNewsValidation, 
  NewsController.createNews
);

router.put('/:id', 
  authenticateToken, 
  requireAdmin, 
  updateNewsValidation, 
  NewsController.updateNews
);

router.delete('/:id', 
  authenticateToken, 
  requireAdmin, 
  NewsController.deleteNews
);

module.exports = router;
