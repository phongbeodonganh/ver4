const { body, validationResult } = require('express-validator');
const { executeQuery, executeTransaction } = require('../config/database');
const videoProcessor = require('../utils/ffmpeg');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Configure multer for video uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/temp');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `temp-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept video files only
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file video!'), false);
    }
  }
});

class EnhancedVideoController {
  /**
   * Upload and process video for lesson
   * POST /api/video/upload
   */
  static async uploadVideo(req, res) {
    let tempFilePath = null;
    let processedFiles = [];

    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Dữ liệu không hợp lệ',
          errors: errors.array()
        });
      }

      const { lessonId } = req.body;

      // Check if lesson exists
      const lesson = await executeQuery(
        'SELECT IDBH FROM BaiHoc WHERE IDBH = ?',
        [lessonId]
      );

      if (lesson.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy bài học'
        });
      }

      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Không có file video nào được upload'
        });
      }

      tempFilePath = req.file.path;
      const timestamp = Date.now();
      const videoId = `${lessonId}_${timestamp}`;

      // Set up output directory (for media domain)
      const outputDir = path.join(__dirname, '../uploads/videos');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Send immediate response with processing status
      res.status(202).json({
        success: true,
        message: 'Video đang được xử lý, vui lòng đợi...',
        data: {
          videoId: videoId,
          lessonId: lessonId,
          status: 'processing'
        }
      });

      // Process video asynchronously
      try {
        console.log(`Starting video processing for lesson ${lessonId}`);
        
        const processingResult = await videoProcessor.processVideo(
          tempFilePath,
          outputDir,
          videoId
        );

        // Generate video URLs for media domain
        const baseUrl = process.env.MEDIA_DOMAIN || 'https://videos.linhmai.edu.vn';
        const videoUrls = {};
        
        Object.entries(processingResult.videos).forEach(([quality, filename]) => {
          videoUrls[quality] = `${baseUrl}/${filename}`;
        });

        // Save to database
        const videoData = {
          IDBH: lessonId,
          video_480p_path: processingResult.videos['480p'] || null,
          video_720p_path: processingResult.videos['720p'] || null,
          video_1080p_path: processingResult.videos['1080p'] || null,
          video_original_path: processingResult.videos['original'] || null,
          duration: processingResult.duration,
          file_size: processingResult.originalSize
        };

        // Check if video record exists for this lesson
        const existingVideo = await executeQuery(
          'SELECT IDVideo FROM Video WHERE IDBH = ?',
          [lessonId]
        );

        if (existingVideo.length > 0) {
          // Update existing record
          const updateFields = [];
          const updateParams = [];

          Object.entries(videoData).forEach(([key, value]) => {
            if (key !== 'IDBH') {
              if (value !== null) {
                updateFields.push(`${key} = ?`);
                updateParams.push(value);
              }
            }
          });

          updateParams.push(existingVideo[0].IDVideo);

          await executeQuery(
            `UPDATE Video SET ${updateFields.join(', ')}, upload_date = CURRENT_TIMESTAMP WHERE IDVideo = ?`,
            updateParams
          );
        } else {
          // Create new record
          await executeQuery(
            `INSERT INTO Video (IDBH, video_480p_path, video_720p_path, video_1080p_path, video_original_path, duration, file_size)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              videoData.IDBH,
              videoData.video_480p_path,
              videoData.video_720p_path,
              videoData.video_1080p_path,
              videoData.video_original_path,
              videoData.duration,
              videoData.file_size
            ]
          );
        }

        // Update lesson with primary video URL
        const primaryUrl = videoUrls['720p'] || videoUrls['480p'] || videoUrls['1080p'] || videoUrls['original'];
        await executeQuery(
          'UPDATE BaiHoc SET LinkND = ? WHERE IDBH = ?',
          [primaryUrl, lessonId]
        );

        console.log(`Video processing completed for lesson ${lessonId}`);
        console.log('Generated URLs:', videoUrls);

        // Clean up temp file
        if (tempFilePath) {
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
          }
        }

      } catch (processingError) {
        console.error('Video processing failed:', processingError);
        
        // Clean up any partially processed files
        if (processedFiles.length > 0) {
          videoProcessor.cleanupFiles(processedFiles);
        }
        
        // Clean up temp file
        if (tempFilePath) {
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
          }
        }
      }

    } catch (error) {
      console.error('Upload video error:', error);
      
      // Clean up temp file on error
      if (tempFilePath) {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      }

      res.status(500).json({
        success: false,
        message: 'Lỗi server khi upload video',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get video processing status
   * GET /api/video/status/:lessonId
   */
  static async getVideoStatus(req, res) {
    try {
      const { lessonId } = req.params;

      const videoQuery = `
        SELECT v.*, bh.TenBH, bh.LinkND
        FROM Video v
        INNER JOIN BaiHoc bh ON v.IDBH = bh.IDBH
        WHERE v.IDBH = ?
      `;

      const result = await executeQuery(videoQuery, [lessonId]);

      if (result.length === 0) {
        return res.json({
          success: true,
          data: {
            status: 'not_found',
            message: 'Chưa có video cho bài học này'
          }
        });
      }

      const video = result[0];
      const baseUrl = process.env.MEDIA_DOMAIN || 'https://videos.linhmai.edu.vn';

      const responseData = {
        status: 'completed',
        videoId: video.IDVideo,
        lessonId: video.IDBH,
        lessonTitle: video.TenBH,
        videos: {
          '480p': video.video_480p_path ? `${baseUrl}/${video.video_480p_path}` : null,
          '720p': video.video_720p_path ? `${baseUrl}/${video.video_720p_path}` : null,
          '1080p': video.video_1080p_path ? `${baseUrl}/${video.video_1080p_path}` : null,
          'original': video.video_original_path ? `${baseUrl}/${video.video_original_path}` : null
        },
        duration: video.duration,
        fileSize: video.file_size,
        uploadDate: video.upload_date,
        primaryUrl: video.LinkND
      };

      // Filter out null URLs
      responseData.videos = Object.fromEntries(
        Object.entries(responseData.videos).filter(([_, url]) => url !== null)
      );

      res.json({
        success: true,
        data: responseData
      });

    } catch (error) {
      console.error('Get video status error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy trạng thái video',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get video for playback (with access control)
   * GET /api/video/play/:lessonId
   */
  static async getVideoForPlayback(req, res) {
    try {
      const { lessonId } = req.params;
      const { quality = 'auto' } = req.query;

      // Get lesson and course info
      const lessonQuery = `
        SELECT bh.IDBH, bh.TenBH, ch.IDKH, kh.TenKH
        FROM BaiHoc bh
        INNER JOIN ChuongHoc ch ON bh.IDCH = ch.IDCH
        INNER JOIN KhoaHoc kh ON ch.IDKH = kh.IDKH
        WHERE bh.IDBH = ?
      `;

      const lessonResult = await executeQuery(lessonQuery, [lessonId]);

      if (lessonResult.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy bài học'
        });
      }

      const lesson = lessonResult[0];

      // Check access permissions (removed payment check for .edu.vn domain)
      if (req.user.role !== 'admin') {
        // For .edu.vn domain, we'll allow access to all lessons
        // but you can add other access control logic here if needed
        console.log(`User ${req.user.id} accessing lesson ${lessonId}`);
      }

      // Get video information
      const videoQuery = 'SELECT * FROM Video WHERE IDBH = ?';
      const videoResult = await executeQuery(videoQuery, [lessonId]);

      if (videoResult.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy video cho bài học này'
        });
      }

      const video = videoResult[0];
      const baseUrl = process.env.MEDIA_DOMAIN || 'https://videos.linhmai.edu.vn';

      const availableQualities = {};
      if (video.video_480p_path) availableQualities['480p'] = `${baseUrl}/${video.video_480p_path}`;
      if (video.video_720p_path) availableQualities['720p'] = `${baseUrl}/${video.video_720p_path}`;
      if (video.video_1080p_path) availableQualities['1080p'] = `${baseUrl}/${video.video_1080p_path}`;
      if (video.video_original_path) availableQualities['original'] = `${baseUrl}/${video.video_original_path}`;

      // Determine best quality for auto mode
      let selectedUrl = null;
      if (quality === 'auto') {
        selectedUrl = availableQualities['720p'] || availableQualities['480p'] || availableQualities['1080p'] || availableQualities['original'];
      } else {
        selectedUrl = availableQualities[quality] || availableQualities['720p'] || availableQualities['480p'];
      }

      const responseData = {
        videoId: video.IDVideo,
        lessonId: video.IDBH,
        lessonTitle: lesson.TenBH,
        courseTitle: lesson.TenKH,
        selectedUrl: selectedUrl,
        availableQualities: availableQualities,
        duration: video.duration,
        uploadDate: video.upload_date
      };

      res.json({
        success: true,
        data: responseData
      });

    } catch (error) {
      console.error('Get video for playback error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy video',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Delete video (admin only)
   * DELETE /api/video/:lessonId
   */
  static async deleteVideo(req, res) {
    try {
      const { lessonId } = req.params;

      // Get video info
      const video = await executeQuery(
        'SELECT * FROM Video WHERE IDBH = ?',
        [lessonId]
      );

      if (video.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy video'
        });
      }

      const videoData = video[0];
      const filesToDelete = [];

      // Collect all video files to delete
      if (videoData.video_480p_path) {
        filesToDelete.push(path.join(__dirname, '../uploads/videos', videoData.video_480p_path));
      }
      if (videoData.video_720p_path) {
        filesToDelete.push(path.join(__dirname, '../uploads/videos', videoData.video_720p_path));
      }
      if (videoData.video_1080p_path) {
        filesToDelete.push(path.join(__dirname, '../uploads/videos', videoData.video_1080p_path));
      }
      if (videoData.video_original_path) {
        filesToDelete.push(path.join(__dirname, '../uploads/videos', videoData.video_original_path));
      }

      // Delete files
      videoProcessor.cleanupFiles(filesToDelete);

      // Delete database record
      await executeQuery('DELETE FROM Video WHERE IDBH = ?', [lessonId]);

      // Update lesson
      await executeQuery(
        'UPDATE BaiHoc SET LinkND = NULL WHERE IDBH = ?',
        [lessonId]
      );

      res.json({
        success: true,
        message: 'Xóa video thành công'
      });

    } catch (error) {
      console.error('Delete video error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi xóa video',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

// Validation rules
const uploadVideoValidation = [
  body('lessonId')
    .isInt({ min: 1 })
    .withMessage('ID bài học không hợp lệ')
];

module.exports = {
  EnhancedVideoController,
  uploadVideoValidation,
  upload
};
