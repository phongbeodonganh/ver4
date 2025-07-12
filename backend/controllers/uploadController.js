const { body, validationResult } = require('express-validator');
const { getFileUrl } = require('../middlewares/upload');
const path = require('path');

class UploadController {
  // Upload single image
  static async uploadImage(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Không có file ảnh nào được upload'
        });
      }

      const file = req.file;
      const imageUrl = getFileUrl(req, file.path);

      res.status(200).json({
        success: true,
        message: 'Upload ảnh thành công',
        data: {
          filename: file.filename,
          originalName: file.originalname,
          size: file.size,
          url: imageUrl,
          path: file.path.replace(/\\/g, '/')
        }
      });

    } catch (error) {
      console.error('Upload image error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi upload ảnh',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Upload single video
  static async uploadVideo(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Không có file video nào được upload'
        });
      }

      const file = req.file;
      const videoUrl = getFileUrl(req, file.path);

      res.status(200).json({
        success: true,
        message: 'Upload video thành công',
        data: {
          filename: file.filename,
          originalName: file.originalname,
          size: file.size,
          url: videoUrl,
          path: file.path.replace(/\\/g, '/'),
          duration: req.body.duration || 0
        }
      });

    } catch (error) {
      console.error('Upload video error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi upload video',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Upload single document
  static async uploadDocument(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Không có file tài liệu nào được upload'
        });
      }

      const file = req.file;
      const documentUrl = getFileUrl(req, file.path);

      res.status(200).json({
        success: true,
        message: 'Upload tài liệu thành công',
        data: {
          filename: file.filename,
          originalName: file.originalname,
          size: file.size,
          url: documentUrl,
          path: file.path.replace(/\\/g, '/')
        }
      });

    } catch (error) {
      console.error('Upload document error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi upload tài liệu',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Upload multiple images (for blog content)
  static async uploadMultipleImages(req, res) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Không có file ảnh nào được upload'
        });
      }

      const uploadedFiles = req.files.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        url: getFileUrl(req, file.path),
        path: file.path.replace(/\\/g, '/')
      }));

      res.status(200).json({
        success: true,
        message: `Upload ${uploadedFiles.length} ảnh thành công`,
        data: uploadedFiles
      });

    } catch (error) {
      console.error('Upload multiple images error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi upload ảnh',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

// Validation rules
const uploadValidation = [
  body('title')
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage('Tiêu đề phải từ 1-200 ký tự'),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Mô tả không được quá 1000 ký tự')
];

module.exports = {
  UploadController,
  uploadValidation
};
