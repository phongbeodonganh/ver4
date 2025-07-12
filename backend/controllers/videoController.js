const { body, validationResult } = require('express-validator');
const { executeQuery, executeTransaction } = require('../config/database');
const { getFileUrl, deleteFile } = require('../middlewares/upload');
const path = require('path');
const fs = require('fs');

class VideoController {
  // Upload video cho bài học
  static async uploadVideo(req, res) {
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
      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Không có file video nào được upload'
        });
      }

      const videoData = {
        IDBH: IDBH,
        video_480p_path: null,
        video_720p_path: null,
        video_1080p_path: null,
        duration: parseInt(req.body.duration) || 0,
        file_size: 0
      };

      let totalFileSize = 0;
      const timestamp = Date.now();

      // Xử lý các file video theo chất lượng với tên file chuẩn
      if (req.files.video_480p) {
        const file = req.files.video_480p[0];
        const newFilename = `${IDBH}_480p_${timestamp}.mp4`;
        const newPath = path.join(__dirname, '../uploads/videos', newFilename);
        
        // Di chuyển file và đổi tên
        fs.renameSync(file.path, newPath);
        videoData.video_480p_path = newFilename;
        totalFileSize += file.size;
      }

      if (req.files.video_720p) {
        const file = req.files.video_720p[0];
        const newFilename = `${IDBH}_720p_${timestamp}.mp4`;
        const newPath = path.join(__dirname, '../uploads/videos', newFilename);
        
        // Di chuyển file và đổi tên
        fs.renameSync(file.path, newPath);
        videoData.video_720p_path = newFilename;
        totalFileSize += file.size;
      }

      if (req.files.video_1080p) {
        const file = req.files.video_1080p[0];
        const newFilename = `${IDBH}_1080p_${timestamp}.mp4`;
        const newPath = path.join(__dirname, '../uploads/videos', newFilename);
        
        // Di chuyển file và đổi tên
        fs.renameSync(file.path, newPath);
        videoData.video_1080p_path = newFilename;
        totalFileSize += file.size;
      }

      videoData.file_size = totalFileSize;

      // Kiểm tra xem đã có video cho bài học này chưa
      const existingVideo = await executeQuery(
        'SELECT IDVideo FROM Video WHERE IDBH = ?',
        [IDBH]
      );

      let result;
      if (existingVideo.length > 0) {
        // Cập nhật video hiện có
        const updateFields = [];
        const updateParams = [];

        if (videoData.video_480p_path) {
          updateFields.push('video_480p_path = ?');
          updateParams.push(videoData.video_480p_path);
        }
        if (videoData.video_720p_path) {
          updateFields.push('video_720p_path = ?');
          updateParams.push(videoData.video_720p_path);
        }
        if (videoData.video_1080p_path) {
          updateFields.push('video_1080p_path = ?');
          updateParams.push(videoData.video_1080p_path);
        }

        updateFields.push('duration = ?', 'file_size = ?');
        updateParams.push(videoData.duration, videoData.file_size);
        updateParams.push(existingVideo[0].IDVideo);

        await executeQuery(
          `UPDATE Video SET ${updateFields.join(', ')} WHERE IDVideo = ?`,
          updateParams
        );

        result = { insertId: existingVideo[0].IDVideo };
      } else {
        // Tạo mới video
        result = await executeQuery(
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
      }

      // Cập nhật link video trong bài học (sử dụng stream URL)
      const primaryVideoFilename = videoData.video_720p_path || videoData.video_480p_path || videoData.video_1080p_path;
      if (primaryVideoFilename) {
        const streamUrl = `${req.protocol}://${req.get('host')}/api/video/stream/${primaryVideoFilename}`;
        await executeQuery(
          'UPDATE BaiHoc SET LinkND = ? WHERE IDBH = ?',
          [streamUrl, IDBH]
        );
      }

      // Trả về thông tin video đã upload
      const responseData = {
        id: result.insertId,
        lessonId: IDBH,
        videos: {
          '480p': videoData.video_480p_path ? `${req.protocol}://${req.get('host')}/api/video/stream/${videoData.video_480p_path}` : null,
          '720p': videoData.video_720p_path ? `${req.protocol}://${req.get('host')}/api/video/stream/${videoData.video_720p_path}` : null,
          '1080p': videoData.video_1080p_path ? `${req.protocol}://${req.get('host')}/api/video/stream/${videoData.video_1080p_path}` : null
        },
        duration: videoData.duration,
        fileSize: videoData.file_size,
        uploadDate: new Date()
      };

      res.status(201).json({
        success: true,
        message: 'Upload video thành công',
        data: responseData
      });

    } catch (error) {
      console.error('Upload video error:', error.message);
      
      // Xóa các file đã upload nếu có lỗi
      if (req.files) {
        Object.values(req.files).flat().forEach(file => {
          deleteFile(file.path);
        });
      }

      res.status(500).json({
        success: false,
        message: 'Lỗi server khi upload video',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Lấy thông tin video của bài học
  static async getVideoByLesson(req, res) {
    try {
      const lessonId = req.params.lessonId;

      // Kiểm tra quyền truy cập bài học
      const lessonQuery = `
        SELECT bh.IDBH, bh.TenBH, ch.IDKH
        FROM BaiHoc bh
        INNER JOIN ChuongHoc ch ON bh.IDCH = ch.IDCH
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

      // Kiểm tra quyền truy cập khóa học
      if (req.user.role !== 'admin') {
        const accessQuery = `
          SELECT gd.IDGD FROM GiaoDichKhoaHoc gd
          INNER JOIN KhoaHoc kh ON gd.IDKH = kh.IDKH
          WHERE gd.IDHV = ? AND gd.IDKH = ? AND (gd.TrangThaiTT = 'completed' OR kh.GiaKH = 0)
        `;

        const accessResult = await executeQuery(accessQuery, [req.user.id, lesson.IDKH]);

        if (accessResult.length === 0) {
          return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền truy cập video này'
          });
        }
      }

      // Lấy thông tin video
      const videoQuery = `
        SELECT * FROM Video WHERE IDBH = ?
      `;

      const videoResult = await executeQuery(videoQuery, [lessonId]);

      if (videoResult.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy video cho bài học này'
        });
      }

      const video = videoResult[0];

      const responseData = {
        id: video.IDVideo,
        lessonId: video.IDBH,
        videos: {
          '480p': video.video_480p_path ? `${req.protocol}://${req.get('host')}/api/video/stream/${video.video_480p_path}` : null,
          '720p': video.video_720p_path ? `${req.protocol}://${req.get('host')}/api/video/stream/${video.video_720p_path}` : null,
          '1080p': video.video_1080p_path ? `${req.protocol}://${req.get('host')}/api/video/stream/${video.video_1080p_path}` : null
        },
        duration: video.duration,
        fileSize: video.file_size,
        uploadDate: video.upload_date
      };

      res.json({
        success: true,
        message: 'Lấy thông tin video thành công',
        data: responseData
      });

    } catch (error) {
      console.error('Get video by lesson error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy thông tin video',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Xóa video (chỉ admin)
  static async deleteVideo(req, res) {
    try {
      const videoId = req.params.id;

      // Lấy thông tin video
      const video = await executeQuery(
        'SELECT * FROM Video WHERE IDVideo = ?',
        [videoId]
      );

      if (video.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy video'
        });
      }

      const videoData = video[0];

      // Xóa các file video
      if (videoData.video_480p_path) {
        deleteFile(path.join(__dirname, '../uploads/videos', videoData.video_480p_path));
      }
      if (videoData.video_720p_path) {
        deleteFile(path.join(__dirname, '../uploads/videos', videoData.video_720p_path));
      }
      if (videoData.video_1080p_path) {
        deleteFile(path.join(__dirname, '../uploads/videos', videoData.video_1080p_path));
      }

      // Xóa record trong database
      await executeQuery('DELETE FROM Video WHERE IDVideo = ?', [videoId]);

      // Cập nhật LinkND trong BaiHoc
      await executeQuery(
        'UPDATE BaiHoc SET LinkND = NULL WHERE IDBH = ?',
        [videoData.IDBH]
      );

      res.json({
        success: true,
        message: 'Xóa video thành công'
      });

    } catch (error) {
      console.error('Delete video error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi xóa video',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Stream video theo filename với bảo mật
  static async streamVideo(req, res) {
    try {
      const { filename } = req.params;

      // Parse filename để lấy thông tin (format: IDBH_quality_timestamp.mp4)
      const filenameParts = filename.replace('.mp4', '').split('_');
      if (filenameParts.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Tên file không hợp lệ'
        });
      }

      const lessonId = filenameParts[0];
      const quality = filenameParts[1];

      // Lấy thông tin bài học và khóa học
      const lessonQuery = `
        SELECT bh.IDBH, bh.TenBH, ch.IDKH, kh.TenKH, kh.GiaKH
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

      // Kiểm tra quyền truy cập
      if (req.user.role !== 'admin') {
        // Kiểm tra khóa học miễn phí hoặc đã mua
        if (lesson.GiaKH > 0) {
          const accessQuery = `
            SELECT gd.IDGD FROM GiaoDichKhoaHoc gd
            WHERE gd.IDHV = ? AND gd.IDKH = ? AND gd.TrangThaiTT = 'completed'
          `;

          const accessResult = await executeQuery(accessQuery, [req.user.id, lesson.IDKH]);

          if (accessResult.length === 0) {
            return res.status(403).json({
              success: false,
              message: 'Bạn không có quyền xem video này'
            });
          }
        }
      }

      // Xác định đường dẫn file
      const filePath = path.join(__dirname, '../uploads/videos', filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          message: 'File video không tồn tại'
        });
      }

      // Stream video với Range support
      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const range = req.headers.range;

      if (range) {
        // Partial content streaming (hỗ trợ seek video)
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(filePath, { start, end });
        
        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': 'video/mp4',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        };
        
        res.writeHead(206, head);
        file.pipe(res);
      } else {
        // Full content streaming
        const head = {
          'Content-Length': fileSize,
          'Content-Type': 'video/mp4',
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        };
        
        res.writeHead(200, head);
        fs.createReadStream(filePath).pipe(res);
      }

    } catch (error) {
      console.error('Stream video error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi stream video',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

// Validation rules
const uploadVideoValidation = [
  body('IDBH')
    .isInt({ min: 1 })
    .withMessage('ID bài học không hợp lệ'),
  body('duration')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Thời lượng video phải là số nguyên không âm')
];

module.exports = {
  VideoController,
  uploadVideoValidation
};
