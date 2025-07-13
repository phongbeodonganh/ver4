const express = require('express');
const { EnhancedVideoController, uploadVideoValidation, upload } = require('../controllers/enhancedVideoController');
const { verifyToken, isAdmin } = require('../middlewares/authJwt');

const router = express.Router();

/**
 * @route POST /api/video/upload
 * @desc Upload and process video for lesson
 * @access Admin only
 */
router.post('/upload', 
  verifyToken,
  isAdmin,
  upload.single('video'),
  uploadVideoValidation,
  EnhancedVideoController.uploadVideo
);

/**
 * @route GET /api/video/status/:lessonId
 * @desc Get video processing status
 * @access Admin only
 */
router.get('/status/:lessonId',
  verifyToken,
  isAdmin,
  EnhancedVideoController.getVideoStatus
);

/**
 * @route GET /api/video/play/:lessonId
 * @desc Get video for playback with quality options
 * @access Authenticated users
 */
router.get('/play/:lessonId',
  verifyToken,
  EnhancedVideoController.getVideoForPlayback
);

/**
 * @route DELETE /api/video/:lessonId
 * @desc Delete video
 * @access Admin only
 */
router.delete('/:lessonId',
  verifyToken,
  isAdmin,
  EnhancedVideoController.deleteVideo
);

module.exports = router;
