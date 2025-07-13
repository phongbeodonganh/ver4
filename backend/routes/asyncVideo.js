const express = require('express');
const router = express.Router();
const { AsyncVideoController, uploadVideoValidation } = require('../controllers/asyncVideoController');
const { verifyToken, isAdmin } = require('../middlewares/authJwt');
const { uploadVideo } = require('../middlewares/upload');

// Upload video with async processing (admin only)
router.post('/upload', verifyToken, isAdmin, uploadVideo.single('video'), uploadVideoValidation, AsyncVideoController.uploadVideoAsync);

// Get job status (accessible by lesson owner or admin)
router.get('/job/:jobId', verifyToken, AsyncVideoController.getJobStatus);

// Admin only routes
router.get('/jobs', verifyToken, isAdmin, AsyncVideoController.getAllJobs);
router.delete('/job/:jobId/cancel', verifyToken, isAdmin, AsyncVideoController.cancelJob);

module.exports = router;
