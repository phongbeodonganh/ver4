const express = require('express');
const router = express.Router();
const { 
  KhoaHocController, 
  createCourseValidation, 
  updateCourseValidation 
} = require('../controllers/khoahocController');
const { authenticateToken, requireAdmin, requireUser } = require('../middlewares/authJwt');

// Public routes
router.get('/featured', KhoaHocController.getFeaturedCourses);
router.get('/', KhoaHocController.getAllCourses);
router.get('/:id', KhoaHocController.getCourseById);

// Protected routes - require authentication
router.get('/:id/chuong', authenticateToken, KhoaHocController.getCourseChapters);

// Admin only routes
router.post('/', authenticateToken, requireAdmin, createCourseValidation, KhoaHocController.createCourse);
router.put('/:id', authenticateToken, requireAdmin, updateCourseValidation, KhoaHocController.updateCourse);
router.delete('/:id', authenticateToken, requireAdmin, KhoaHocController.deleteCourse);
router.get('/:id/statistics', authenticateToken, requireAdmin, KhoaHocController.getCourseStatistics);

module.exports = router;
