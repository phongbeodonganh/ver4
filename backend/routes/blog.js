const express = require('express');
const router = express.Router();
const { 
  BlogController, 
  createBlogValidation, 
  updateBlogValidation 
} = require('../controllers/blogController');
const { authenticateToken, requireAdmin } = require('../middlewares/authJwt');

// Public routes
router.get('/', BlogController.getAllBlogs);
router.get('/popular', BlogController.getPopularBlogs);
router.get('/latest', BlogController.getLatestBlogs);
router.get('/:id', BlogController.getBlogById);

// Admin only routes
router.post('/', authenticateToken, requireAdmin, createBlogValidation, BlogController.createBlog);
router.put('/:id', authenticateToken, requireAdmin, updateBlogValidation, BlogController.updateBlog);
router.delete('/:id', authenticateToken, requireAdmin, BlogController.deleteBlog);

module.exports = router;
