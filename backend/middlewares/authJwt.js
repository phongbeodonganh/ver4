const { verifyToken } = require('../config/jwt');
const { executeQuery } = require('../config/database');

// Middleware xác thực JWT
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token không được cung cấp'
      });
    }

    // Xác thực token
    const decoded = verifyToken(token);
    
    // Kiểm tra user còn tồn tại trong database
    const user = await executeQuery(
      'SELECT IDHV, TenHV, Email, Role FROM HocVien WHERE IDHV = ? AND Email = ?',
      [decoded.id, decoded.email]
    );

    if (!user || user.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User không tồn tại'
      });
    }

    // Gắn thông tin user vào request
    req.user = {
      id: user[0].IDHV,
      email: user[0].Email,
      name: user[0].TenHV,
      role: user[0].Role
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    return res.status(403).json({
      success: false,
      message: error.message || 'Token không hợp lệ'
    });
  }
};

// Middleware kiểm tra quyền admin
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Chưa xác thực'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Không có quyền truy cập. Chỉ admin mới được phép.'
    });
  }

  next();
};

// Middleware kiểm tra quyền user hoặc admin
const requireUser = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Chưa xác thực'
    });
  }

  if (!['user', 'admin'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Không có quyền truy cập'
    });
  }

  next();
};

// Middleware kiểm tra quyền truy cập tài nguyên của chính user đó
const requireOwnerOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Chưa xác thực'
    });
  }

  const resourceUserId = req.params.id || req.params.userId || req.body.IDHV;
  
  // Admin có thể truy cập tất cả
  if (req.user.role === 'admin') {
    return next();
  }

  // User chỉ có thể truy cập tài nguyên của chính mình
  if (req.user.id.toString() !== resourceUserId.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Không có quyền truy cập tài nguyên này'
    });
  }

  next();
};

// Middleware kiểm tra user đã mua khóa học
const requireCourseAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Chưa xác thực'
      });
    }

    const courseId = req.params.courseId || req.params.id;
    
    // Admin có thể truy cập tất cả khóa học
    if (req.user.role === 'admin') {
      return next();
    }

    // Kiểm tra user đã mua khóa học chưa
    const purchase = await executeQuery(
      `SELECT gd.IDGD FROM GiaoDichKhoaHoc gd 
       WHERE gd.IDHV = ? AND gd.IDKH = ? AND gd.TrangThaiTT = 'completed'`,
      [req.user.id, courseId]
    );

    // Kiểm tra khóa học có miễn phí không
    const course = await executeQuery(
      'SELECT GiaKH FROM KhoaHoc WHERE IDKH = ?',
      [courseId]
    );

    if (course.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Khóa học không tồn tại'
      });
    }

    // Nếu khóa học miễn phí hoặc đã mua thì cho phép truy cập
    if (course[0].GiaKH === 0 || purchase.length > 0) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Bạn chưa mua khóa học này'
    });

  } catch (error) {
    console.error('Course access middleware error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Lỗi kiểm tra quyền truy cập khóa học'
    });
  }
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireUser,
  requireOwnerOrAdmin,
  requireCourseAccess
};
