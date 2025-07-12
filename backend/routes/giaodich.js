const express = require('express');
const router = express.Router();
const { 
  GiaoDichController, 
  createTransactionValidation, 
  updateTransactionValidation 
} = require('../controllers/giaodichController');
const { authenticateToken, requireAdmin, requireUser } = require('../middlewares/authJwt');

// User routes - Tạo giao dịch mua khóa học
router.post('/', authenticateToken, requireUser, createTransactionValidation, GiaoDichController.createTransaction);

// User routes - Lấy lịch sử giao dịch của chính mình
router.get('/my-transactions', authenticateToken, requireUser, GiaoDichController.getStudentTransactions);

// User/Admin routes - Lấy giao dịch của học viên cụ thể
router.get('/student/:studentId', authenticateToken, GiaoDichController.getStudentTransactions);

// Admin only routes
router.get('/', authenticateToken, requireAdmin, GiaoDichController.getAllTransactions);
router.put('/:id/status', authenticateToken, requireAdmin, updateTransactionValidation, GiaoDichController.updateTransactionStatus);
router.get('/statistics/revenue', authenticateToken, requireAdmin, GiaoDichController.getRevenueStatistics);

module.exports = router;
