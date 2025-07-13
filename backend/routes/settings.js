const express = require('express');
const { body } = require('express-validator');
const { SettingsController } = require('../controllers/settingsController');
const { authenticateToken, requireAdmin } = require('../middlewares/authJwt');

const router = express.Router();

// Validation rules
const updateSettingsValidation = [
  body('siteName')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Tên website phải từ 1-100 ký tự'),
  body('seoTitle')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Tiêu đề SEO không được quá 200 ký tự'),
  body('seoDescription')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Mô tả SEO không được quá 500 ký tự'),
  body('headerText')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Văn bản header không được quá 200 ký tự'),
  body('footerText')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Văn bản footer không được quá 200 ký tự')
];

const bannerSlideValidation = [
  body('title')
    .notEmpty()
    .withMessage('Tiêu đề slide là bắt buộc')
    .isLength({ max: 100 })
    .withMessage('Tiêu đề không được quá 100 ký tự'),
  body('description')
    .optional()
    .isLength({ max: 300 })
    .withMessage('Mô tả không được quá 300 ký tự'),
  body('imageUrl')
    .notEmpty()
    .withMessage('Hình ảnh slide là bắt buộc')
    .isURL()
    .withMessage('URL hình ảnh không hợp lệ'),
  body('linkUrl')
    .optional()
    .isURL()
    .withMessage('URL liên kết không hợp lệ'),
  body('order')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Thứ tự phải là số nguyên dương')
];

// Public routes - Lấy cài đặt công khai
router.get('/public', SettingsController.getAllSettings);

// Admin only routes
router.get('/', 
  authenticateToken, 
  requireAdmin, 
  SettingsController.getAllSettings
);

router.put('/', 
  authenticateToken, 
  requireAdmin, 
  updateSettingsValidation,
  SettingsController.updateSettings
);

router.put('/key/:key', 
  authenticateToken, 
  requireAdmin, 
  SettingsController.updateSpecificSetting
);

router.post('/reset', 
  authenticateToken, 
  requireAdmin, 
  SettingsController.resetSettings
);

// Banner slides management
router.post('/banner-slides', 
  authenticateToken, 
  requireAdmin, 
  bannerSlideValidation,
  SettingsController.addBannerSlide
);

router.put('/banner-slides/:slideId', 
  authenticateToken, 
  requireAdmin, 
  SettingsController.updateBannerSlide
);

router.delete('/banner-slides/:slideId', 
  authenticateToken, 
  requireAdmin, 
  SettingsController.deleteBannerSlide
);

module.exports = router;
