const express = require('express');
const router = express.Router();
const { EnhancedHocVienController, searchStudentsValidation } = require('../controllers/enhancedHocVienController');
const { verifyToken, isAdmin } = require('../middlewares/authJwt');

// All routes require admin authentication
router.use(verifyToken, isAdmin);

// Advanced student search with AND/OR logic
router.get('/search', searchStudentsValidation, EnhancedHocVienController.searchStudents);

// Get student detailed profile
router.get('/profile/:id', EnhancedHocVienController.getStudentProfile);

// Get students by course
router.get('/course/:courseId', EnhancedHocVienController.getStudentsByCourse);

// Export students data
router.get('/export', EnhancedHocVienController.exportStudents);

module.exports = router;
