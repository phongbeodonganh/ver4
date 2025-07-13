const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// Import configurations
const { testConnection, closePool } = require('./config/database');
const { createUploadDirs } = require('./middlewares/upload');

// Import routes
const authRoutes = require('./routes/auth');
const hocvienRoutes = require('./routes/hocvien');
const khoahocRoutes = require('./routes/khoahoc');
const videoRoutes = require('./routes/video');
const giaodichRoutes = require('./routes/giaodich');
const blogRoutes = require('./routes/blog');
const uploadRoutes = require('./routes/upload');
const settingsRoutes = require('./routes/settings');
const newsRoutes = require('./routes/news');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Quá nhiều request từ IP này, vui lòng thử lại sau.'
  }
});

app.use('/api/', limiter);

// CORS configuration
const corsOptions = {
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:3001',
    'https://linhmai.edu.vn',
    'https://www.linhmai.edu.vn',
    'http://linhmai.edu.vn',
    'http://www.linhmai.edu.vn'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files serving
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'LinhMai Academy API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/hocvien', hocvienRoutes);
app.use('/api/khoahoc', khoahocRoutes);
app.use('/api/video', videoRoutes);
app.use('/api/giaodich', giaodichRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/news', newsRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Chào mừng đến với LinhMai Academy API',
    version: '1.0.0',
    documentation: '/api/docs',
    endpoints: {
      auth: '/api/auth',
      students: '/api/hocvien',
      courses: '/api/khoahoc',
      videos: '/api/video',
      transactions: '/api/giaodich',
      blog: '/api/blog',
      uploads: '/api/uploads'
    }
  });
});

// API Documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    success: true,
    message: 'LinhMai Academy API Documentation',
    version: '1.0.0',
    baseUrl: `${req.protocol}://${req.get('host')}/api`,
    endpoints: {
      authentication: {
        register: 'POST /auth/register',
        login: 'POST /auth/login',
        getCurrentUser: 'GET /auth/me',
        changePassword: 'PUT /auth/change-password',
        updateProfile: 'PUT /auth/profile',
        logout: 'POST /auth/logout'
      },
      courses: {
        getAllCourses: 'GET /khoahoc',
        getFeaturedCourses: 'GET /khoahoc/featured',
        getCourseById: 'GET /khoahoc/:id',
        getCourseChapters: 'GET /khoahoc/:id/chuong',
        createCourse: 'POST /khoahoc (Admin only)',
        updateCourse: 'PUT /khoahoc/:id (Admin only)',
        deleteCourse: 'DELETE /khoahoc/:id (Admin only)',
        getCourseStatistics: 'GET /khoahoc/:id/statistics (Admin only)'
      },
      students: {
        getAllStudents: 'GET /hocvien (Admin only)',
        getStudentById: 'GET /hocvien/:id',
        createStudent: 'POST /hocvien (Admin only)',
        updateStudent: 'PUT /hocvien/:id',
        deleteStudent: 'DELETE /hocvien/:id (Admin only)',
        getStudentProgress: 'GET /hocvien/:id/tien-do',
        getPurchasedCourses: 'GET /hocvien/:id/courses',
        updateProgress: 'POST /hocvien/progress'
      },
      videos: {
        uploadVideo: 'POST /video/upload (Admin only)',
        getVideoByLesson: 'GET /video/lesson/:lessonId',
        streamVideo: 'GET /video/stream/:filename',
        deleteVideo: 'DELETE /video/:id (Admin only)'
      },
      transactions: {
        createTransaction: 'POST /giaodich',
        getAllTransactions: 'GET /giaodich (Admin only)',
        getMyTransactions: 'GET /giaodich/my-transactions',
        getStudentTransactions: 'GET /giaodich/student/:studentId',
        updateTransactionStatus: 'PUT /giaodich/:id/status (Admin only)',
        getRevenueStatistics: 'GET /giaodich/statistics/revenue (Admin only)'
      },
      blog: {
        getAllBlogs: 'GET /blog',
        getBlogById: 'GET /blog/:id',
        getPopularBlogs: 'GET /blog/popular',
        getLatestBlogs: 'GET /blog/latest',
        createBlog: 'POST /blog (Admin only)',
        updateBlog: 'PUT /blog/:id (Admin only)',
        deleteBlog: 'DELETE /blog/:id (Admin only)'
      },
      uploads: {
        uploadSingleImage: 'POST /uploads/image (Admin only)',
        uploadSingleVideo: 'POST /uploads/video (Admin only)',
        uploadSingleDocument: 'POST /uploads/document (Admin only)',
        uploadMultipleImages: 'POST /uploads/images (Admin only)'
      }
    },
    authentication: {
      type: 'Bearer Token',
      header: 'Authorization: Bearer <token>',
      note: 'Include JWT token in Authorization header for protected routes'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint không tồn tại',
    requestedUrl: req.originalUrl,
    method: req.method
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  // Multer errors
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File quá lớn'
    });
  }
  
  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Token không hợp lệ'
    });
  }
  
  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token đã hết hạn'
    });
  }
  
  // Database errors
  if (error.code === 'ER_DUP_ENTRY') {
    return res.status(400).json({
      success: false,
      message: 'Dữ liệu đã tồn tại'
    });
  }
  
  // Default error
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Lỗi server không xác định',
    error: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🔄 SIGTERM received, shutting down gracefully...');
  await closePool();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🔄 SIGINT received, shutting down gracefully...');
  await closePool();
  process.exit(0);
});

// Start server
const startServer = async () => {
  try {
    // Test database connection (không bắt buộc)
    const dbConnected = await testConnection();
    
    // Create upload directories
    createUploadDirs();
    
    // Start server
    app.listen(PORT, () => {
      console.log('🚀 ================================');
      console.log('🎓 LinhMai Academy Backend API');
      console.log('🚀 ================================');
      console.log(`🌐 Server: http://localhost:${PORT}`);
      console.log(`📚 API Docs: http://localhost:${PORT}/api/docs`);
      console.log(`💚 Health: http://localhost:${PORT}/health`);
      console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`💾 Database: ${dbConnected ? 'Connected' : 'Demo Mode'}`);
      console.log('🚀 ================================');
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 Development mode - Detailed error messages enabled');
        console.log('📁 Upload directory: ./uploads');
        console.log('🎯 CORS enabled for:', corsOptions.origin);
      }
    });
    
  } catch (error) {
    console.error('❌ Lỗi khởi động server:', error.message);
    process.exit(1);
  }
};

// Initialize server
startServer();

module.exports = app;
