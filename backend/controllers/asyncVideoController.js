const { body, validationResult } = require('express-validator');
const { executeQuery, executeTransaction } = require('../config/database');
const { AdminLogsController } = require('./adminLogsController');
const videoProcessor = require('../utils/ffmpeg');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// In-memory job queue (for production, use Redis or a proper queue system)
const videoJobs = new Map();

class AsyncVideoController {
  // Upload video with asynchronous processing
  static async uploadVideoAsync(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Dữ liệu không hợp lệ',
          errors: errors.array()
        });
      }

      const { IDBH } = req.body;

      // Kiểm tra bài học có tồn tại không
      const lesson = await executeQuery(
        'SELECT IDBH FROM BaiHoc WHERE IDBH = ?',
        [IDBH]
      );

      if (lesson.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy bài học'
        });
      }

      // Kiểm tra có file upload không
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Không có file video nào được upload'
        });
      }

      // Tạo job ID
      const jobId = uuidv4();
      const originalFilePath = req.file.path;
      const originalFileName = req.file.filename;
      const fileSize = req.file.size;

      // Tạo job record trong database
      const jobResult = await executeQuery(
        `INSERT INTO VideoProcessingJobs (job_id, lesson_id, original_filename, original_path, file_size, status, created_by)
         VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
        [jobId, IDBH, originalFileName, originalFilePath, fileSize, req.user.id]
      );

      // Tạo job trong memory
      const job = {
        id: jobId,
        lessonId: IDBH,
        originalPath: originalFilePath,
        originalFileName: originalFileName,
        fileSize: fileSize,
        status: 'pending',
        progress: 0,
        createdAt: new Date(),
        createdBy: req.user.id,
        error: null,
        processedVideos: {}
      };

      videoJobs.set(jobId, job);

      // Log upload action
      await AdminLogsController.logAction(
        req.user.id,
        'UPLOAD',
        'Video',
        IDBH,
        { 
          jobId,
          originalFileName,
          fileSize,
          action: 'video_upload_started'
        }
      );

      // Start processing asynchronously
      AsyncVideoController.processVideoAsync(jobId);

      // Return job info immediately
      res.status(202).json({
        success: true,
        message: 'Video đã được upload và đang xử lý',
        data: {
          jobId,
          lessonId: IDBH,
          status: 'pending',
          originalFileName,
          fileSize,
          estimatedProcessingTime: '5-15 phút',
          checkStatusUrl: `/api/video/job/${jobId}`
        }
      });

    } catch (error) {
      console.error('Upload video async error:', error.message);
      
      // Xóa file nếu có lỗi
      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
          console.error('Error deleting file:', unlinkError);
        }
      }

      res.status(500).json({
        success: false,
        message: 'Lỗi server khi upload video',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Process video in background
  static async processVideoAsync(jobId) {
    const job = videoJobs.get(jobId);
    if (!job) {
      console.error('Job not found:', jobId);
      return;
    }

    try {
      // Update job status to processing
      job.status = 'processing';
      job.progress = 10;
      videoJobs.set(jobId, job);

      await executeQuery(
        'UPDATE VideoProcessingJobs SET status = ?, progress = ?, started_at = NOW() WHERE job_id = ?',
        ['processing', 10, jobId]
      );

      console.log(`Starting video processing for job ${jobId}`);

      // Create output directory
      const outputDir = path.join(__dirname, '../uploads/videos');
      const baseFilename = `${job.lessonId}_${Date.now()}`;

      // Update progress
      job.progress = 20;
      videoJobs.set(jobId, job);
      await executeQuery(
        'UPDATE VideoProcessingJobs SET progress = ? WHERE job_id = ?',
        [20, jobId]
      );

      // Process video to multiple qualities
      const processResult = await videoProcessor.processVideo(
        job.originalPath,
        outputDir,
        baseFilename
      );

      // Update progress
      job.progress = 80;
      videoJobs.set(jobId, job);
      await executeQuery(
        'UPDATE VideoProcessingJobs SET progress = ? WHERE job_id = ?',
        [80, jobId]
      );

      // Save processed videos to database
      const videoData = {
        IDBH: job.lessonId,
        video_480p_path: processResult.videos['480p'] || null,
        video_720p_path: processResult.videos['720p'] || null,
        video_1080p_path: processResult.videos['1080p'] || null,
        duration: processResult.duration,
        file_size: processResult.originalSize
      };

      // Check if video record exists for this lesson
      const existingVideo = await executeQuery(
        'SELECT IDVideo FROM Video WHERE IDBH = ?',
        [job.lessonId]
      );

      let videoId;
      if (existingVideo.length > 0) {
        // Update existing video
        await executeQuery(
          `UPDATE Video SET 
           video_480p_path = ?, video_720p_path = ?, video_1080p_path = ?, 
           duration = ?, file_size = ?, upload_date = NOW()
           WHERE IDBH = ?`,
          [
            videoData.video_480p_path,
            videoData.video_720p_path,
            videoData.video_1080p_path,
            videoData.duration,
            videoData.file_size,
            job.lessonId
          ]
        );
        videoId = existingVideo[0].IDVideo;
      } else {
        // Create new video record
        const result = await executeQuery(
          `INSERT INTO Video (IDBH, video_480p_path, video_720p_path, video_1080p_path, duration, file_size)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            videoData.IDBH,
            videoData.video_480p_path,
            videoData.video_720p_path,
            videoData.video_1080p_path,
            videoData.duration,
            videoData.file_size
          ]
        );
        videoId = result.insertId;
      }

      // Generate URLs for processed videos
      const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
      const processedUrls = {};
      
      Object.keys(processResult.videos).forEach(quality => {
        if (processResult.videos[quality]) {
          processedUrls[quality] = `${baseUrl}/api/video/stream/${processResult.videos[quality]}`;
        }
      });

      // Update job as completed
      job.status = 'completed';
      job.progress = 100;
      job.processedVideos = processedUrls;
      job.videoId = videoId;
      job.completedAt = new Date();
      videoJobs.set(jobId, job);

      await executeQuery(
        `UPDATE VideoProcessingJobs SET 
         status = ?, progress = ?, completed_at = NOW(), 
         processed_urls = ?, video_id = ?
         WHERE job_id = ?`,
        ['completed', 100, JSON.stringify(processedUrls), videoId, jobId]
      );

      // Update lesson with primary video URL
      const primaryUrl = processedUrls['720p'] || processedUrls['480p'] || processedUrls['1080p'];
      if (primaryUrl) {
        await executeQuery(
          'UPDATE BaiHoc SET LinkND = ? WHERE IDBH = ?',
          [primaryUrl, job.lessonId]
        );
      }

      // Clean up original file
      try {
        fs.unlinkSync(job.originalPath);
        console.log('Cleaned up original file:', job.originalPath);
      } catch (error) {
        console.error('Error cleaning up original file:', error);
      }

      // Log completion
      await AdminLogsController.logAction(
        job.createdBy,
        'PROCESS_COMPLETE',
        'Video',
        job.lessonId,
        { 
          jobId,
          videoId,
          processedQualities: Object.keys(processedUrls),
          duration: processResult.duration,
          action: 'video_processing_completed'
        }
      );

      console.log(`Video processing completed for job ${jobId}`);

    } catch (error) {
      console.error(`Video processing failed for job ${jobId}:`, error);

      // Update job as failed
      job.status = 'failed';
      job.error = error.message;
      videoJobs.set(jobId, job);

      await executeQuery(
        `UPDATE VideoProcessingJobs SET 
         status = ?, error_message = ?, failed_at = NOW()
         WHERE job_id = ?`,
        ['failed', error.message, jobId]
      );

      // Log failure
      await AdminLogsController.logAction(
        job.createdBy,
        'PROCESS_FAILED',
        'Video',
        job.lessonId,
        { 
          jobId,
          error: error.message,
          action: 'video_processing_failed'
        }
      );

      // Clean up original file
      try {
        fs.unlinkSync(job.originalPath);
      } catch (unlinkError) {
        console.error('Error cleaning up failed job file:', unlinkError);
      }
    }
  }

  // Get job status
  static async getJobStatus(req, res) {
    try {
      const { jobId } = req.params;

      // Get from memory first (faster)
      let job = videoJobs.get(jobId);

      // If not in memory, get from database
      if (!job) {
        const dbJob = await executeQuery(
          'SELECT * FROM VideoProcessingJobs WHERE job_id = ?',
          [jobId]
        );

        if (dbJob.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'Không tìm thấy job'
          });
        }

        const dbJobData = dbJob[0];
        job = {
          id: dbJobData.job_id,
          lessonId: dbJobData.lesson_id,
          status: dbJobData.status,
          progress: dbJobData.progress,
          createdAt: dbJobData.created_at,
          completedAt: dbJobData.completed_at,
          error: dbJobData.error_message,
          processedVideos: dbJobData.processed_urls ? JSON.parse(dbJobData.processed_urls) : {},
          videoId: dbJobData.video_id
        };
      }

      // Check access permission
      if (req.user.role !== 'admin') {
        // Check if user has access to the lesson
        const accessQuery = `
          SELECT kh.GiaKH FROM BaiHoc bh
          INNER JOIN ChuongHoc ch ON bh.IDCH = ch.IDCH
          INNER JOIN KhoaHoc kh ON ch.IDKH = kh.IDKH
          LEFT JOIN GiaoDichKhoaHoc gd ON kh.IDKH = gd.IDKH AND gd.IDHV = ? AND gd.TrangThaiTT = 'completed'
          WHERE bh.IDBH = ? AND (kh.GiaKH = 0 OR gd.IDGD IS NOT NULL)
        `;

        const accessResult = await executeQuery(accessQuery, [req.user.id, job.lessonId]);

        if (accessResult.length === 0) {
          return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền xem thông tin này'
          });
        }
      }

      res.json({
        success: true,
        message: 'Lấy trạng thái job thành công',
        data: {
          jobId: job.id,
          lessonId: job.lessonId,
          status: job.status,
          progress: job.progress,
          createdAt: job.createdAt,
          completedAt: job.completedAt || null,
          error: job.error || null,
          processedVideos: job.processedVideos || {},
          videoId: job.videoId || null,
          isComplete: job.status === 'completed',
          isFailed: job.status === 'failed'
        }
      });

    } catch (error) {
      console.error('Get job status error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy trạng thái job',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get all jobs (admin only)
  static async getAllJobs(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const status = req.query.status;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE 1=1';
      let queryParams = [];

      if (status) {
        whereClause += ' AND status = ?';
        queryParams.push(status);
      }

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM VideoProcessingJobs ${whereClause}`;
      const countResult = await executeQuery(countQuery, queryParams);
      const total = countResult[0].total;

      // Get jobs
      const jobsQuery = `
        SELECT 
          vpj.*,
          bh.TenBH as lesson_name,
          kh.TenKH as course_name,
          hv.TenHV as created_by_name
        FROM VideoProcessingJobs vpj
        LEFT JOIN BaiHoc bh ON vpj.lesson_id = bh.IDBH
        LEFT JOIN ChuongHoc ch ON bh.IDCH = ch.IDCH
        LEFT JOIN KhoaHoc kh ON ch.IDKH = kh.IDKH
        LEFT JOIN HocVien hv ON vpj.created_by = hv.IDHV
        ${whereClause}
        ORDER BY vpj.created_at DESC
        LIMIT ? OFFSET ?
      `;

      const jobs = await executeQuery(jobsQuery, [...queryParams, limit, offset]);

      // Parse JSON fields
      const processedJobs = jobs.map(job => ({
        ...job,
        processed_urls: job.processed_urls ? JSON.parse(job.processed_urls) : null
      }));

      res.json({
        success: true,
        message: 'Lấy danh sách job thành công',
        data: {
          jobs: processedJobs,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        }
      });

    } catch (error) {
      console.error('Get all jobs error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy danh sách job',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Cancel job (admin only)
  static async cancelJob(req, res) {
    try {
      const { jobId } = req.params;

      const job = videoJobs.get(jobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy job'
        });
      }

      if (job.status === 'completed') {
        return res.status(400).json({
          success: false,
          message: 'Không thể hủy job đã hoàn thành'
        });
      }

      // Update job status
      job.status = 'cancelled';
      videoJobs.set(jobId, job);

      await executeQuery(
        'UPDATE VideoProcessingJobs SET status = ?, cancelled_at = NOW() WHERE job_id = ?',
        ['cancelled', jobId]
      );

      // Clean up original file
      try {
        if (fs.existsSync(job.originalPath)) {
          fs.unlinkSync(job.originalPath);
        }
      } catch (error) {
        console.error('Error cleaning up cancelled job file:', error);
      }

      // Log cancellation
      await AdminLogsController.logAction(
        req.user.id,
        'CANCEL',
        'Video',
        job.lessonId,
        { 
          jobId,
          action: 'video_processing_cancelled'
        }
      );

      res.json({
        success: true,
        message: 'Đã hủy job thành công'
      });

    } catch (error) {
      console.error('Cancel job error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi hủy job',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

// Validation rules
const uploadVideoValidation = [
  body('IDBH')
    .isInt({ min: 1 })
    .withMessage('ID bài học không hợp lệ')
];

module.exports = {
  AsyncVideoController,
  uploadVideoValidation
};
