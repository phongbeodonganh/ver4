const express = require('express');
const router = express.Router();
const { 
  HocVienController, 
  createStudentValidation, 
  updateStudentValidation,
  updateProgressValidation
} = require('../controllers/hocvienController');
const { authenticateToken, requireAdmin, requireOwnerOrAdmin } = require('../middlewares/authJwt');

// Admin only routes
router.get('/', authenticateToken, requireAdmin, HocVienController.getAllStudents);
router.post('/', authenticateToken, requireAdmin, createStudentValidation, HocVienController.createStudent);
router.delete('/:id', authenticateToken, requireAdmin, HocVienController.deleteStudent);

// Owner or Admin routes
router.get('/:id', authenticateToken, requireOwnerOrAdmin, HocVienController.getStudentById);
router.put('/:id', authenticateToken, requireOwnerOrAdmin, updateStudentValidation, HocVienController.updateStudent);
router.get('/:id/tien-do', authenticateToken, requireOwnerOrAdmin, HocVienController.getStudentProgress);
router.get('/:id/courses', authenticateToken, requireOwnerOrAdmin, HocVienController.getPurchasedCourses);

// User routes (own progress only)
router.post('/progress', authenticateToken, updateProgressValidation, HocVienController.updateProgress);

module.exports = router;
