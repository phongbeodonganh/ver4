const express = require('express');
const router = express.Router();
const { AdminLogsController, cleanupLogsValidation } = require('../controllers/adminLogsController');
const { verifyToken, isAdmin } = require('../middlewares/authJwt');

// All routes require admin authentication
router.use(verifyToken, isAdmin);

// Get admin logs with filtering and pagination
router.get('/', AdminLogsController.getAdminLogs);

// Get admin actions summary
router.get('/summary', AdminLogsController.getActionsSummary);

// Get logs by target (e.g., all actions on a specific course)
router.get('/target/:targetType/:targetId', AdminLogsController.getLogsByTarget);

// Cleanup old logs
router.delete('/cleanup', cleanupLogsValidation, AdminLogsController.cleanupOldLogs);

module.exports = router;
