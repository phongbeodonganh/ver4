const { body, validationResult } = require('express-validator');
const { executeQuery, executeTransaction } = require('../config/database');

class GiaoDichController {
  // Tạo giao dịch mua khóa học
  static async createTransaction(req, res) {
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

      const { IDKH, GiaThucTe, GhiChu } = req.body;
      const IDHV = req.user.id;

      // Kiểm tra khóa học có tồn tại không
      const course = await executeQuery(
        'SELECT IDKH, TenKH, GiaKH, TrangThai FROM KhoaHoc WHERE IDKH = ?',
        [IDKH]
      );

      if (course.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy khóa học'
        });
      }

      if (course[0].TrangThai !== 'active') {
        return res.status(400).json({
          success: false,
          message: 'Khóa học không còn hoạt động'
        });
      }

      // Kiểm tra đã mua khóa học chưa
      const existingTransaction = await executeQuery(
        'SELECT IDGD FROM GiaoDichKhoaHoc WHERE IDHV = ? AND IDKH = ? AND TrangThaiTT = "completed"',
        [IDHV, IDKH]
      );

      if (existingTransaction.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Bạn đã mua khóa học này rồi'
        });
      }

      // Lấy thông tin nhân viên sale (nếu có)
      const student = await executeQuery(
        'SELECT IDNV FROM HocVien WHERE IDHV = ?',
        [IDHV]
      );

      const IDNV = student.length > 0 ? student[0].IDNV : null;

      // Tạo giao dịch
      const transactionQuery = `
        INSERT INTO GiaoDichKhoaHoc (IDHV, IDKH, IDNV, GiaThucTe, TrangThaiTT, GhiChu)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      const result = await executeQuery(transactionQuery, [
        IDHV,
        IDKH,
        IDNV,
        GiaThucTe,
        'completed', // Giả sử thanh toán thành công ngay
        GhiChu || null
      ]);

      // Cập nhật số học viên cho nhân viên sale
      if (IDNV) {
        await executeQuery(
          'UPDATE NhanVienSale SET SoHV = SoHV + 1 WHERE IDNV = ?',
          [IDNV]
        );
      }

      // Lấy thông tin giao dịch vừa tạo
      const newTransaction = await executeQuery(`
        SELECT gd.*, kh.TenKH, hv.TenHV, nv.TenNV
        FROM GiaoDichKhoaHoc gd
        INNER JOIN KhoaHoc kh ON gd.IDKH = kh.IDKH
        INNER JOIN HocVien hv ON gd.IDHV = hv.IDHV
        LEFT JOIN NhanVienSale nv ON gd.IDNV = nv.IDNV
        WHERE gd.IDGD = ?
      `, [result.insertId]);

      const transaction = newTransaction[0];

      res.status(201).json({
        success: true,
        message: 'Mua khóa học thành công',
        data: {
          id: transaction.IDGD.toString(),
          courseId: transaction.IDKH.toString(),
          courseName: transaction.TenKH,
          studentId: transaction.IDHV.toString(),
          studentName: transaction.TenHV,
          salesPerson: transaction.TenNV || null,
          purchaseDate: transaction.NgayBan,
          originalPrice: course[0].GiaKH,
          paidAmount: transaction.GiaThucTe,
          status: transaction.TrangThaiTT,
          note: transaction.GhiChu
        }
      });

    } catch (error) {
      console.error('Create transaction error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi tạo giao dịch',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Lấy danh sách giao dịch (admin)
  static async getAllTransactions(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const status = req.query.status;
      const search = req.query.search || '';
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE 1=1';
      let params = [];

      if (status) {
        whereClause += ' AND gd.TrangThaiTT = ?';
        params.push(status);
      }

      if (search) {
        whereClause += ' AND (hv.TenHV LIKE ? OR kh.TenKH LIKE ? OR hv.Email LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      const query = `
        SELECT gd.*, kh.TenKH, kh.GiaKH, hv.TenHV, hv.Email, nv.TenNV
        FROM GiaoDichKhoaHoc gd
        INNER JOIN KhoaHoc kh ON gd.IDKH = kh.IDKH
        INNER JOIN HocVien hv ON gd.IDHV = hv.IDHV
        LEFT JOIN NhanVienSale nv ON gd.IDNV = nv.IDNV
        ${whereClause}
        ORDER BY gd.NgayBan DESC
        LIMIT ? OFFSET ?
      `;

      params.push(limit, offset);
      const transactions = await executeQuery(query, params);

      // Đếm tổng số giao dịch
      const countQuery = `
        SELECT COUNT(*) as total
        FROM GiaoDichKhoaHoc gd
        INNER JOIN KhoaHoc kh ON gd.IDKH = kh.IDKH
        INNER JOIN HocVien hv ON gd.IDHV = hv.IDHV
        ${whereClause}
      `;

      const countParams = params.slice(0, -2); // Bỏ limit và offset
      const countResult = await executeQuery(countQuery, countParams);
      const total = countResult[0].total;

      // Format dữ liệu
      const formattedTransactions = transactions.map(transaction => ({
        id: transaction.IDGD.toString(),
        courseId: transaction.IDKH.toString(),
        courseName: transaction.TenKH,
        originalPrice: transaction.GiaKH,
        studentId: transaction.IDHV.toString(),
        studentName: transaction.TenHV,
        studentEmail: transaction.Email,
        salesPerson: transaction.TenNV || null,
        purchaseDate: transaction.NgayBan,
        paidAmount: transaction.GiaThucTe,
        status: transaction.TrangThaiTT,
        note: transaction.GhiChu
      }));

      res.json({
        success: true,
        message: 'Lấy danh sách giao dịch thành công',
        data: formattedTransactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total,
          totalPages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Get all transactions error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy danh sách giao dịch',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Lấy giao dịch của học viên
  static async getStudentTransactions(req, res) {
    try {
      const studentId = req.params.studentId || req.user.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      // Kiểm tra quyền truy cập
      if (req.user.role !== 'admin' && req.user.id.toString() !== studentId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Không có quyền truy cập'
        });
      }

      const query = `
        SELECT gd.*, kh.TenKH, kh.GiaKH, kh.AnhDaiDien, nv.TenNV
        FROM GiaoDichKhoaHoc gd
        INNER JOIN KhoaHoc kh ON gd.IDKH = kh.IDKH
        LEFT JOIN NhanVienSale nv ON gd.IDNV = nv.IDNV
        WHERE gd.IDHV = ?
        ORDER BY gd.NgayBan DESC
        LIMIT ? OFFSET ?
      `;

      const transactions = await executeQuery(query, [studentId, limit, offset]);

      // Đếm tổng số giao dịch
      const countResult = await executeQuery(
        'SELECT COUNT(*) as total FROM GiaoDichKhoaHoc WHERE IDHV = ?',
        [studentId]
      );
      const total = countResult[0].total;

      // Format dữ liệu
      const formattedTransactions = transactions.map(transaction => ({
        id: transaction.IDGD.toString(),
        courseId: transaction.IDKH.toString(),
        courseName: transaction.TenKH,
        courseThumbnail: transaction.AnhDaiDien,
        originalPrice: transaction.GiaKH,
        salesPerson: transaction.TenNV || null,
        purchaseDate: transaction.NgayBan,
        paidAmount: transaction.GiaThucTe,
        status: transaction.TrangThaiTT,
        note: transaction.GhiChu
      }));

      res.json({
        success: true,
        message: 'Lấy lịch sử giao dịch thành công',
        data: formattedTransactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total,
          totalPages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Get student transactions error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy lịch sử giao dịch',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Cập nhật trạng thái giao dịch (admin)
  static async updateTransactionStatus(req, res) {
    try {
      const transactionId = req.params.id;
      const { TrangThaiTT, GhiChu } = req.body;

      const validStatuses = ['pending', 'completed', 'failed', 'refunded'];
      if (!validStatuses.includes(TrangThaiTT)) {
        return res.status(400).json({
          success: false,
          message: 'Trạng thái không hợp lệ'
        });
      }

      // Kiểm tra giao dịch có tồn tại không
      const transaction = await executeQuery(
        'SELECT * FROM GiaoDichKhoaHoc WHERE IDGD = ?',
        [transactionId]
      );

      if (transaction.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy giao dịch'
        });
      }

      // Cập nhật trạng thái
      await executeQuery(
        'UPDATE GiaoDichKhoaHoc SET TrangThaiTT = ?, GhiChu = ? WHERE IDGD = ?',
        [TrangThaiTT, GhiChu || transaction[0].GhiChu, transactionId]
      );

      res.json({
        success: true,
        message: 'Cập nhật trạng thái giao dịch thành công'
      });

    } catch (error) {
      console.error('Update transaction status error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi cập nhật trạng thái giao dịch',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Thống kê doanh thu (admin)
  static async getRevenueStatistics(req, res) {
    try {
      const { startDate, endDate, courseId } = req.query;

      let whereClause = 'WHERE gd.TrangThaiTT = "completed"';
      let params = [];

      if (startDate) {
        whereClause += ' AND DATE(gd.NgayBan) >= ?';
        params.push(startDate);
      }

      if (endDate) {
        whereClause += ' AND DATE(gd.NgayBan) <= ?';
        params.push(endDate);
      }

      if (courseId) {
        whereClause += ' AND gd.IDKH = ?';
        params.push(courseId);
      }

      // Thống kê tổng quan
      const overviewQuery = `
        SELECT 
          COUNT(*) as TotalTransactions,
          SUM(gd.GiaThucTe) as TotalRevenue,
          AVG(gd.GiaThucTe) as AverageOrderValue,
          COUNT(DISTINCT gd.IDHV) as UniqueCustomers,
          COUNT(DISTINCT gd.IDKH) as CoursesSold
        FROM GiaoDichKhoaHoc gd
        ${whereClause}
      `;

      const overview = await executeQuery(overviewQuery, params);

      // Thống kê theo khóa học
      const courseStatsQuery = `
        SELECT 
          kh.IDKH,
          kh.TenKH,
          COUNT(gd.IDGD) as SoLuongBan,
          SUM(gd.GiaThucTe) as DoanhThu,
          AVG(gd.GiaThucTe) as GiaTrungBinh
        FROM GiaoDichKhoaHoc gd
        INNER JOIN KhoaHoc kh ON gd.IDKH = kh.IDKH
        ${whereClause}
        GROUP BY kh.IDKH, kh.TenKH
        ORDER BY DoanhThu DESC
        LIMIT 10
      `;

      const courseStats = await executeQuery(courseStatsQuery, params);

      // Thống kê theo tháng
      const monthlyStatsQuery = `
        SELECT 
          DATE_FORMAT(gd.NgayBan, '%Y-%m') as Month,
          COUNT(gd.IDGD) as Transactions,
          SUM(gd.GiaThucTe) as Revenue
        FROM GiaoDichKhoaHoc gd
        ${whereClause}
        GROUP BY DATE_FORMAT(gd.NgayBan, '%Y-%m')
        ORDER BY Month DESC
        LIMIT 12
      `;

      const monthlyStats = await executeQuery(monthlyStatsQuery, params);

      res.json({
        success: true,
        message: 'Lấy thống kê doanh thu thành công',
        data: {
          overview: overview[0],
          topCourses: courseStats,
          monthlyTrend: monthlyStats
        }
      });

    } catch (error) {
      console.error('Get revenue statistics error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy thống kê doanh thu',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

// Validation rules
const createTransactionValidation = [
  body('IDKH')
    .isInt({ min: 1 })
    .withMessage('ID khóa học không hợp lệ'),
  body('GiaThucTe')
    .isFloat({ min: 0 })
    .withMessage('Giá thực tế phải là số không âm'),
  body('GhiChu')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Ghi chú không được quá 500 ký tự')
];

const updateTransactionValidation = [
  body('TrangThaiTT')
    .isIn(['pending', 'completed', 'failed', 'refunded'])
    .withMessage('Trạng thái không hợp lệ'),
  body('GhiChu')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Ghi chú không được quá 500 ký tự')
];

module.exports = {
  GiaoDichController,
  createTransactionValidation,
  updateTransactionValidation
};
