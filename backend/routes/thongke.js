const express = require('express');
const router = express.Router();
const { ThongKeController } = require('../controllers/thongkeController');
const { verifyToken, isAdmin } = require('../middlewares/authJwt');

// All routes require admin authentication
router.use(verifyToken, isAdmin);

// System overview statistics
router.get('/', ThongKeController.getSystemStats);

// Course statistics
router.get('/courses', ThongKeController.getCourseStats);

// Student statistics
router.get('/students', ThongKeController.getStudentStats);

// Media and storage statistics
router.get('/media', ThongKeController.getMediaStats);

// Financial statistics
router.get('/financial', ThongKeController.getFinancialStats);

module.exports = router;
