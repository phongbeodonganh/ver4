const { body, validationResult } = require('express-validator');
const { executeQuery } = require('../config/database');
const { AdminLogsController } = require('./adminLogsController');

class EnhancedHocVienController {
  // Advanced student search with AND/OR logic
  static async searchStudents(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Dữ liệu không hợp lệ',
          errors: errors.array()
        });
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const sortBy = req.query.sort_by || 'NgayDangKy';
      const sortOrder = req.query.sort_order || 'DESC';
      const logic = req.query.logic || 'AND'; // AND or OR
      const offset = (page - 1) * limit;

      // Search parameters
      const { name, email, course, phone, status, registration_date_from, registration_date_to } = req.query;

      let whereClause = 'WHERE hv.Role = "user"';
      let queryParams = [];
      let searchConditions = [];

      // Build search conditions
      if (name) {
        searchConditions.push('hv.TenHV LIKE ?');
        queryParams.push(`%${name}%`);
      }

      if (email) {
        searchConditions.push('hv.Email LIKE ?');
        queryParams.push(`%${email}%`);
      }

      if (phone) {
        searchConditions.push('hv.SoDienThoai LIKE ?');
        queryParams.push(`%${phone}%`);
      }

      if (course) {
        searchConditions.push(`EXISTS (
          SELECT 1 FROM GiaoDichKhoaHoc gd 
          INNER JOIN KhoaHoc kh ON gd.IDKH = kh.IDKH 
          WHERE gd.IDHV = hv.IDHV 
          AND gd.TrangThaiTT = 'completed' 
          AND kh.TenKH LIKE ?
        )`);
        queryParams.push(`%${course}%`);
      }

      if (registration_date_from) {
        searchConditions.push('DATE(hv.NgayDangKy) >= ?');
        queryParams.push(registration_date_from);
      }

      if (registration_date_to) {
        searchConditions.push('DATE(hv.NgayDangKy) <= ?');
        queryParams.push(registration_date_to);
      }

      // Apply search conditions with AND/OR logic
      if (searchConditions.length > 0) {
        const connector = logic.toUpperCase() === 'OR' ? ' OR ' : ' AND ';
        whereClause += ` AND (${searchConditions.join(connector)})`;
      }

      // Validate sort column
      const allowedSortColumns = ['NgayDangKy', 'TenHV', 'Email', 'total_courses', 'total_spent'];
      const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'NgayDangKy';
      const safeSortOrder = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

      // Get total count
      const countQuery = `
        SELECT COUNT(DISTINCT hv.IDHV) as total
        FROM HocVien hv
        ${whereClause}
      `;

      const countResult = await executeQuery(countQuery, queryParams);
      const total = countResult[0].total;

      // Main search query with additional info
      const searchQuery = `
        SELECT 
          hv.IDHV,
          hv.TenHV,
          hv.Email,
          hv.SoDienThoai,
          hv.NgayDangKy,
          hv.AnhHV,
          COUNT(DISTINCT gd.IDKH) as total_courses,
          SUM(gd.GiaThucTe) as total_spent,
          COUNT(DISTINCT td.IDBH) as lessons_completed,
          GROUP_CONCAT(DISTINCT kh.TenKH SEPARATOR ', ') as enrolled_courses,
          MAX(gd.NgayBan) as last_purchase_date
        FROM HocVien hv
        LEFT JOIN GiaoDichKhoaHoc gd ON hv.IDHV = gd.IDHV AND gd.TrangThaiTT = 'completed'
        LEFT JOIN KhoaHoc kh ON gd.IDKH = kh.IDKH
        LEFT JOIN TienDoHoc td ON hv.IDHV = td.IDHV AND td.DaHoanThanh = TRUE
        ${whereClause}
        GROUP BY hv.IDHV, hv.TenHV, hv.Email, hv.SoDienThoai, hv.NgayDangKy, hv.AnhHV
        ORDER BY ${safeSortBy} ${safeSortOrder}
        LIMIT ? OFFSET ?
      `;

      const students = await executeQuery(searchQuery, [...queryParams, limit, offset]);

      // Process results
      const processedStudents = students.map(student => ({
        ...student,
        total_spent: student.total_spent || 0,
        total_courses: student.total_courses || 0,
        lessons_completed: student.lessons_completed || 0,
        enrolled_courses: student.enrolled_courses ? student.enrolled_courses.split(', ') : [],
        last_purchase_date: student.last_purchase_date || null
      }));

      // Log search action
      await AdminLogsController.logAction(
        req.user.id,
        'SEARCH',
        'HocVien',
        null,
        { 
          searchParams: { name, email, course, phone, logic },
          resultCount: total,
          page,
          limit
        }
      );

      res.json({
        success: true,
        message: 'Tìm kiếm học viên thành công',
        data: {
          students: processedStudents,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          },
          searchParams: {
            name: name || null,
            email: email || null,
            course: course || null,
            phone: phone || null,
            logic,
            sortBy: safeSortBy,
            sortOrder: safeSortOrder
          }
        }
      });

    } catch (error) {
      console.error('Search students error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi tìm kiếm học viên',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get student detailed profile
  static async getStudentProfile(req, res) {
    try {
      const studentId = req.params.id;

      // Get student basic info
      const studentQuery = `
        SELECT 
          hv.*,
          COUNT(DISTINCT gd.IDKH) as total_courses,
          SUM(gd.GiaThucTe) as total_spent,
          COUNT(DISTINCT td.IDBH) as lessons_completed,
          AVG(dg.DiemDanhGia) as avg_rating_given
        FROM HocVien hv
        LEFT JOIN GiaoDichKhoaHoc gd ON hv.IDHV = gd.IDHV AND gd.TrangThaiTT = 'completed'
        LEFT JOIN TienDoHoc td ON hv.IDHV = td.IDHV AND td.DaHoanThanh = TRUE
        LEFT JOIN DanhGiaKhoaHoc dg ON hv.IDHV = dg.IDHV
        WHERE hv.IDHV = ? AND hv.Role = 'user'
        GROUP BY hv.IDHV
      `;

      const studentResult = await executeQuery(studentQuery, [studentId]);

      if (studentResult.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy học viên'
        });
      }

      const student = studentResult[0];

      // Get enrolled courses with progress
      const coursesQuery = `
        SELECT 
          kh.IDKH,
          kh.TenKH,
          kh.AnhDaiDien,
          kh.GiaKH,
          gd.GiaThucTe as paid_amount,
          gd.NgayBan as enrollment_date,
          COUNT(DISTINCT bh.IDBH) as total_lessons,
          COUNT(DISTINCT td.IDBH) as completed_lessons,
          ROUND(
            (COUNT(DISTINCT td.IDBH) * 100.0) / 
            NULLIF(COUNT(DISTINCT bh.IDBH), 0), 2
          ) as progress_percentage,
          dg.DiemDanhGia as rating,
          dg.BinhLuan as review
        FROM GiaoDichKhoaHoc gd
        INNER JOIN KhoaHoc kh ON gd.IDKH = kh.IDKH
        LEFT JOIN ChuongHoc ch ON kh.IDKH = ch.IDKH
        LEFT JOIN BaiHoc bh ON ch.IDCH = bh.IDCH
        LEFT JOIN TienDoHoc td ON bh.IDBH = td.IDBH AND td.IDHV = gd.IDHV AND td.DaHoanThanh = TRUE
        LEFT JOIN DanhGiaKhoaHoc dg ON kh.IDKH = dg.IDKH AND dg.IDHV = gd.IDHV
        WHERE gd.IDHV = ? AND gd.TrangThaiTT = 'completed'
        GROUP BY kh.IDKH, kh.TenKH, kh.AnhDaiDien, kh.GiaKH, gd.GiaThucTe, gd.NgayBan, dg.DiemDanhGia, dg.BinhLuan
        ORDER BY gd.NgayBan DESC
      `;

      const courses = await executeQuery(coursesQuery, [studentId]);

      // Get recent activity
      const activityQuery = `
        SELECT 
          'lesson_completed' as activity_type,
          bh.TenBH as title,
          kh.TenKH as course_name,
          td.NgayHoanThanh as activity_date
        FROM TienDoHoc td
        INNER JOIN BaiHoc bh ON td.IDBH = bh.IDBH
        INNER JOIN ChuongHoc ch ON bh.IDCH = ch.IDCH
        INNER JOIN KhoaHoc kh ON ch.IDKH = kh.IDKH
        WHERE td.IDHV = ? AND td.DaHoanThanh = TRUE
        
        UNION ALL
        
        SELECT 
          'course_purchased' as activity_type,
          kh.TenKH as title,
          NULL as course_name,
          gd.NgayBan as activity_date
        FROM GiaoDichKhoaHoc gd
        INNER JOIN KhoaHoc kh ON gd.IDKH = kh.IDKH
        WHERE gd.IDHV = ? AND gd.TrangThaiTT = 'completed'
        
        ORDER BY activity_date DESC
        LIMIT 20
      `;

      const activities = await executeQuery(activityQuery, [studentId, studentId]);

      // Log profile view
      await AdminLogsController.logAction(
        req.user.id,
        'VIEW',
        'HocVien',
        studentId,
        { action: 'view_profile' }
      );

      res.json({
        success: true,
        message: 'Lấy thông tin chi tiết học viên thành công',
        data: {
          student: {
            ...student,
            total_spent: student.total_spent || 0,
            total_courses: student.total_courses || 0,
            lessons_completed: student.lessons_completed || 0,
            avg_rating_given: student.avg_rating_given || null
          },
          courses,
          activities
        }
      });

    } catch (error) {
      console.error('Get student profile error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy thông tin học viên',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get students by course
  static async getStudentsByCourse(req, res) {
    try {
      const courseId = req.params.courseId;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;

      // Get course info
      const courseQuery = 'SELECT TenKH FROM KhoaHoc WHERE IDKH = ?';
      const courseResult = await executeQuery(courseQuery, [courseId]);

      if (courseResult.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy khóa học'
        });
      }

      // Get students enrolled in this course
      const studentsQuery = `
        SELECT 
          hv.IDHV,
          hv.TenHV,
          hv.Email,
          hv.NgayDangKy,
          gd.NgayBan as enrollment_date,
          gd.GiaThucTe as paid_amount,
          COUNT(DISTINCT bh.IDBH) as total_lessons,
          COUNT(DISTINCT td.IDBH) as completed_lessons,
          ROUND(
            (COUNT(DISTINCT td.IDBH) * 100.0) / 
            NULLIF(COUNT(DISTINCT bh.IDBH), 0), 2
          ) as progress_percentage,
          dg.DiemDanhGia as rating,
          MAX(td.NgayHoanThanh) as last_activity
        FROM GiaoDichKhoaHoc gd
        INNER JOIN HocVien hv ON gd.IDHV = hv.IDHV
        LEFT JOIN ChuongHoc ch ON gd.IDKH = ch.IDKH
        LEFT JOIN BaiHoc bh ON ch.IDCH = bh.IDCH
        LEFT JOIN TienDoHoc td ON bh.IDBH = td.IDBH AND td.IDHV = gd.IDHV AND td.DaHoanThanh = TRUE
        LEFT JOIN DanhGiaKhoaHoc dg ON gd.IDKH = dg.IDKH AND dg.IDHV = gd.IDHV
        WHERE gd.IDKH = ? AND gd.TrangThaiTT = 'completed'
        GROUP BY hv.IDHV, hv.TenHV, hv.Email, hv.NgayDangKy, gd.NgayBan, gd.GiaThucTe, dg.DiemDanhGia
        ORDER BY gd.NgayBan DESC
        LIMIT ? OFFSET ?
      `;

      const students = await executeQuery(studentsQuery, [courseId, limit, offset]);

      // Get total count
      const countQuery = `
        SELECT COUNT(DISTINCT gd.IDHV) as total
        FROM GiaoDichKhoaHoc gd
        WHERE gd.IDKH = ? AND gd.TrangThaiTT = 'completed'
      `;

      const countResult = await executeQuery(countQuery, [courseId]);
      const total = countResult[0].total;

      res.json({
        success: true,
        message: 'Lấy danh sách học viên theo khóa học thành công',
        data: {
          course: courseResult[0],
          students,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        }
      });

    } catch (error) {
      console.error('Get students by course error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy danh sách học viên',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Export students data
  static async exportStudents(req, res) {
    try {
      const format = req.query.format || 'json'; // json, csv
      const { name, email, course } = req.query;

      let whereClause = 'WHERE hv.Role = "user"';
      let queryParams = [];

      // Apply filters
      if (name) {
        whereClause += ' AND hv.TenHV LIKE ?';
        queryParams.push(`%${name}%`);
      }

      if (email) {
        whereClause += ' AND hv.Email LIKE ?';
        queryParams.push(`%${email}%`);
      }

      if (course) {
        whereClause += ` AND EXISTS (
          SELECT 1 FROM GiaoDichKhoaHoc gd 
          INNER JOIN KhoaHoc kh ON gd.IDKH = kh.IDKH 
          WHERE gd.IDHV = hv.IDHV 
          AND gd.TrangThaiTT = 'completed' 
          AND kh.TenKH LIKE ?
        )`;
        queryParams.push(`%${course}%`);
      }

      const exportQuery = `
        SELECT 
          hv.IDHV,
          hv.TenHV,
          hv.Email,
          hv.SoDienThoai,
          hv.NgayDangKy,
          COUNT(DISTINCT gd.IDKH) as total_courses,
          SUM(gd.GiaThucTe) as total_spent,
          COUNT(DISTINCT td.IDBH) as lessons_completed,
          GROUP_CONCAT(DISTINCT kh.TenKH SEPARATOR '; ') as enrolled_courses
        FROM HocVien hv
        LEFT JOIN GiaoDichKhoaHoc gd ON hv.IDHV = gd.IDHV AND gd.TrangThaiTT = 'completed'
        LEFT JOIN KhoaHoc kh ON gd.IDKH = kh.IDKH
        LEFT JOIN TienDoHoc td ON hv.IDHV = td.IDHV AND td.DaHoanThanh = TRUE
        ${whereClause}
        GROUP BY hv.IDHV, hv.TenHV, hv.Email, hv.SoDienThoai, hv.NgayDangKy
        ORDER BY hv.NgayDangKy DESC
      `;

      const students = await executeQuery(exportQuery, queryParams);

      // Log export action
      await AdminLogsController.logAction(
        req.user.id,
        'EXPORT',
        'HocVien',
        null,
        { 
          format,
          filters: { name, email, course },
          recordCount: students.length
        }
      );

      if (format === 'csv') {
        // Convert to CSV
        const csvHeader = 'ID,Tên,Email,Số điện thoại,Ngày đăng ký,Số khóa học,Tổng chi tiêu,Bài học hoàn thành,Khóa học đã mua\n';
        const csvData = students.map(student => 
          `${student.IDHV},"${student.TenHV}","${student.Email}","${student.SoDienThoai || ''}","${student.NgayDangKy}",${student.total_courses},${student.total_spent || 0},${student.lessons_completed},"${student.enrolled_courses || ''}"`
        ).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="students_export.csv"');
        res.send(csvHeader + csvData);
      } else {
        // Return JSON
        res.json({
          success: true,
          message: 'Xuất dữ liệu học viên thành công',
          data: {
            students,
            exportDate: new Date(),
            totalRecords: students.length
          }
        });
      }

    } catch (error) {
      console.error('Export students error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi xuất dữ liệu học viên',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

// Validation rules
const searchStudentsValidation = [
  body('page').optional().isInt({ min: 1 }).withMessage('Trang phải là số nguyên dương'),
  body('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Giới hạn phải từ 1-100'),
  body('logic').optional().isIn(['AND', 'OR']).withMessage('Logic phải là AND hoặc OR')
];

module.exports = {
  EnhancedHocVienController,
  searchStudentsValidation
};
