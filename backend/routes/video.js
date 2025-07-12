const express = require('express');
const router = express.Router();
const { VideoController, uploadVideoValidation } = require('../controllers/videoController');
const { authenticateToken, requireAdmin, requireCourseAccess } = require('../middlewares/authJwt');
const { uploadVideo, handleUploadError } = require('../middlewares/upload');

// Upload video (chỉ admin)
router.post('/upload', 
  authenticateToken, 
  requireAdmin,
  uploadVideo.fields([
    { name: 'video_480p', maxCount: 1 },
    { name: 'video_720p', maxCount: 1 },
    { name: 'video_1080p', maxCount: 1 }
  ]),
  handleUploadError,
  uploadVideoValidation,
  VideoController.uploadVideo
);

// Lấy thông tin video của bài học (cần quyền truy cập khóa học)
router.get('/lesson/:lessonId', 
  authenticateToken,
  VideoController.getVideoByLesson
);

// Stream video theo filename với bảo mật
router.get('/stream/:filename', 
  authenticateToken,
  VideoController.streamVideo
);

// Xóa video (chỉ admin)
router.delete('/:id', 
  authenticateToken, 
  requireAdmin, 
  VideoController.deleteVideo
);

module.exports = router;
