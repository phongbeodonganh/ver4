const express = require('express');
const router = express.Router();
const { 
  AuthController, 
  registerValidation, 
  loginValidation, 
  changePasswordValidation, 
  updateProfileValidation 
} = require('../controllers/authController');
const { authenticateToken } = require('../middlewares/authJwt');

// Public routes
router.post('/register', registerValidation, AuthController.register);
router.post('/login', loginValidation, AuthController.login);

// Protected routes
router.get('/me', authenticateToken, AuthController.getCurrentUser);
router.post('/logout', authenticateToken, AuthController.logout);
router.put('/change-password', authenticateToken, changePasswordValidation, AuthController.changePassword);
router.put('/profile', authenticateToken, updateProfileValidation, AuthController.updateProfile);

module.exports = router;
