const { body, validationResult } = require('express-validator');
const { getFileUrl, deleteFile } = require('../middlewares/upload');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');

class UploadController {
  // Process image with Sharp - create multiple sizes
  static async processImage(filePath, filename) {
    const baseDir = path.dirname(filePath);
    const ext = path.extname(filename);
    const baseName = path.basename(filename, ext);
    
    const sizes = {
      thumbnail: { width: 200, height: 200, suffix: '_thumb' },
      medium: { width: 800, height: null, suffix: '_medium' },
      original: { width: null, height: null, suffix: '' }
    };

    const processedImages = {};

    for (const [key, config] of Object.entries(sizes)) {
      try {
        const outputFilename = key === 'original' ? filename : `${baseName}${config.suffix}${ext}`;
        const outputPath = path.join(baseDir, outputFilename);

        if (key === 'original') {
          // Keep original as is
          processedImages[key] = {
            filename: outputFilename,
            path: outputPath,
            url: outputPath.replace(/\\/g, '/')
          };
        } else {
          // Process with Sharp
          let sharpInstance = sharp(filePath);
          
          if (config.width && config.height) {
            // Square thumbnail
            sharpInstance = sharpInstance.resize(config.width, config.height, {
              fit: 'cover',
              position: 'center'
            });
          } else if (config.width) {
            // Resize by width, maintain aspect ratio
            sharpInstance = sharpInstance.resize(config.width, null, {
              withoutEnlargement: true
            });
          }

          await sharpInstance
            .jpeg({ quality: 85 })
            .png({ quality: 85 })
            .toFile(outputPath);

          processedImages[key] = {
            filename: outputFilename,
            path: outputPath,
            url: outputPath.replace(/\\/g, '/')
          };
        }
      } catch (error) {
        console.error(`Error processing ${key} image:`, error);
      }
    }

    return processedImages;
  }

  // Process video with FFmpeg - create multiple qualities
  static async processVideo(filePath, filename) {
    const baseDir = path.dirname(filePath);
    const ext = path.extname(filename);
    const baseName = path.basename(filename, ext);
    
    const qualities = {
      '480p': { height: 480, bitrate: '1000k', suffix: '_480p' },
      '720p': { height: 720, bitrate: '2500k', suffix: '_720p' },
      '1080p': { height: 1080, bitrate: '5000k', suffix: '_1080p' }
    };

    const processedVideos = {
      original: {
        filename: filename,
        path: filePath,
        url: filePath.replace(/\\/g, '/')
      }
    };

    // Process each quality (this is async and may take time)
    for (const [quality, config] of Object.entries(qualities)) {
      try {
        const outputFilename = `${baseName}${config.suffix}${ext}`;
        const outputPath = path.join(baseDir, outputFilename);

        await new Promise((resolve, reject) => {
          ffmpeg(filePath)
            .videoCodec('libx264')
            .audioCodec('aac')
            .size(`?x${config.height}`)
            .videoBitrate(config.bitrate)
            .audioBitrate('128k')
            .output(outputPath)
            .on('end', () => {
              processedVideos[quality] = {
                filename: outputFilename,
                path: outputPath,
                url: outputPath.replace(/\\/g, '/')
              };
              resolve();
            })
            .on('error', reject)
            .run();
        });
      } catch (error) {
        console.error(`Error processing ${quality} video:`, error);
      }
    }

    return processedVideos;
  }

  // Upload single image with processing
  static async uploadImage(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Không có file ảnh nào được upload'
        });
      }

      const file = req.file;
      
      // Process image with Sharp
      const processedImages = await UploadController.processImage(file.path, file.filename);
      
      // Generate URLs for each size
      const imageData = {};
      for (const [size, data] of Object.entries(processedImages)) {
        imageData[size] = {
          filename: data.filename,
          url: getFileUrl(req, data.path),
          path: data.path.replace(/\\/g, '/')
        };
      }

      res.status(200).json({
        success: true,
        message: 'Upload và xử lý ảnh thành công',
        data: {
          originalName: file.originalname,
          size: file.size,
          images: imageData,
          // Backward compatibility
          filename: file.filename,
          url: getFileUrl(req, file.path),
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

  // Upload single video with processing
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

      // Return immediate response
      res.status(200).json({
        success: true,
        message: 'Upload video thành công, đang xử lý các chất lượng khác nhau...',
        data: {
          filename: file.filename,
          originalName: file.originalname,
          size: file.size,
          url: videoUrl,
          path: file.path.replace(/\\/g, '/'),
          duration: req.body.duration || 0,
          processing: true
        }
      });

      // Process video in background (don't await)
      UploadController.processVideo(file.path, file.filename)
        .then(processedVideos => {
          console.log('Video processing completed:', processedVideos);
          // Here you could emit a socket event or update database
        })
        .catch(error => {
          console.error('Video processing failed:', error);
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
          path: file.path.replace(/\\/g, '/'),
          type: file.mimetype
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

      const uploadedFiles = [];

      for (const file of req.files) {
        try {
          // Process each image
          const processedImages = await UploadController.processImage(file.path, file.filename);
          
          const imageData = {};
          for (const [size, data] of Object.entries(processedImages)) {
            imageData[size] = {
              filename: data.filename,
              url: getFileUrl(req, data.path),
              path: data.path.replace(/\\/g, '/')
            };
          }

          uploadedFiles.push({
            originalName: file.originalname,
            size: file.size,
            images: imageData,
            // Backward compatibility
            filename: file.filename,
            url: getFileUrl(req, file.path),
            path: file.path.replace(/\\/g, '/')
          });
        } catch (error) {
          console.error('Error processing image:', file.originalname, error);
        }
      }

      res.status(200).json({
        success: true,
        message: `Upload và xử lý ${uploadedFiles.length} ảnh thành công`,
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

  // Get upload statistics
  static async getUploadStats(req, res) {
    try {
      const uploadsDir = path.join(__dirname, '../uploads');
      const stats = {
        images: { count: 0, totalSize: 0 },
        videos: { count: 0, totalSize: 0 },
        documents: { count: 0, totalSize: 0 },
        total: { count: 0, totalSize: 0 }
      };

      const directories = ['images', 'videos', 'documents'];

      for (const dir of directories) {
        const dirPath = path.join(uploadsDir, dir);
        if (fs.existsSync(dirPath)) {
          const files = fs.readdirSync(dirPath);
          
          for (const file of files) {
            if (file === '.gitkeep') continue;
            
            const filePath = path.join(dirPath, file);
            const fileStat = fs.statSync(filePath);
            
            if (fileStat.isFile()) {
              stats[dir].count++;
              stats[dir].totalSize += fileStat.size;
              stats.total.count++;
              stats.total.totalSize += fileStat.size;
            }
          }
        }
      }

      // Format sizes
      const formatSize = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
      };

      // Add formatted sizes
      Object.keys(stats).forEach(key => {
        if (stats[key].totalSize !== undefined) {
          stats[key].formattedSize = formatSize(stats[key].totalSize);
        }
      });

      res.status(200).json({
        success: true,
        message: 'Thống kê upload thành công',
        data: stats
      });

    } catch (error) {
      console.error('Get upload stats error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy thống kê',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get media library (list all uploaded files)
  static async getMediaLibrary(req, res) {
    try {
      const { type, page = 1, limit = 20, search = '' } = req.query;
      const uploadsDir = path.join(__dirname, '../uploads');
      
      let directories = ['images', 'videos', 'documents'];
      if (type && directories.includes(type)) {
        directories = [type];
      }

      const allFiles = [];

      for (const dir of directories) {
        const dirPath = path.join(uploadsDir, dir);
        if (fs.existsSync(dirPath)) {
          const files = fs.readdirSync(dirPath);
          
          for (const file of files) {
            if (file === '.gitkeep') continue;
            
            const filePath = path.join(dirPath, file);
            const fileStat = fs.statSync(filePath);
            
            if (fileStat.isFile()) {
              // Skip processed versions (thumbnails, etc.)
              if (file.includes('_thumb') || file.includes('_medium') || 
                  file.includes('_480p') || file.includes('_720p') || file.includes('_1080p')) {
                continue;
              }

              // Search filter
              if (search && !file.toLowerCase().includes(search.toLowerCase())) {
                continue;
              }

              allFiles.push({
                filename: file,
                type: dir,
                size: fileStat.size,
                formattedSize: UploadController.formatFileSize(fileStat.size),
                url: getFileUrl(req, path.join('uploads', dir, file)),
                path: path.join('uploads', dir, file).replace(/\\/g, '/'),
                uploadDate: fileStat.birthtime,
                modifiedDate: fileStat.mtime
              });
            }
          }
        }
      }

      // Sort by upload date (newest first)
      allFiles.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));

      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      const paginatedFiles = allFiles.slice(startIndex, endIndex);

      res.status(200).json({
        success: true,
        message: 'Lấy thư viện media thành công',
        data: {
          files: paginatedFiles,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(allFiles.length / limit),
            totalFiles: allFiles.length,
            hasNext: endIndex < allFiles.length,
            hasPrev: startIndex > 0
          }
        }
      });

    } catch (error) {
      console.error('Get media library error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy thư viện media',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Delete file from media library
  static async deleteFile(req, res) {
    try {
      const { filename, type } = req.params;
      
      if (!['images', 'videos', 'documents'].includes(type)) {
        return res.status(400).json({
          success: false,
          message: 'Loại file không hợp lệ'
        });
      }

      const filePath = path.join(__dirname, '../uploads', type, filename);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          message: 'File không tồn tại'
        });
      }

      // Delete main file
      fs.unlinkSync(filePath);

      // Delete processed versions if they exist
      const baseDir = path.dirname(filePath);
      const ext = path.extname(filename);
      const baseName = path.basename(filename, ext);
      
      const suffixes = ['_thumb', '_medium', '_480p', '_720p', '_1080p'];
      suffixes.forEach(suffix => {
        const processedFile = path.join(baseDir, `${baseName}${suffix}${ext}`);
        if (fs.existsSync(processedFile)) {
          fs.unlinkSync(processedFile);
        }
      });

      res.status(200).json({
        success: true,
        message: 'Xóa file thành công'
      });

    } catch (error) {
      console.error('Delete file error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi xóa file',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Helper method to format file size
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
