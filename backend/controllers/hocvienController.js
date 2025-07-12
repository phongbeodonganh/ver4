const { body, validationResult } = require('express-validator');
const HocVien = require('../models/HocVien');

class HocVienController {
  // Lấy danh sách học viên (chỉ admin)
  static async getAllStudents(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search || '';

      const result = await HocVien.findAll(page, limit, search);

      // Format dữ liệu cho frontend
      const formattedData = result.data.map(student => ({
        id: student.IDHV.toString(),
        name: student.TenHV,
        email: student.Email,
        avatar: student.AnhHV,
        role: student.Role,
        registeredDate: student.NgayDangKy,
        coursesCount: student.SoKhoaHocDaMua || 0,
        salesPerson: student.TenNV ? {
          id: student.IDNV,
          name: student.TenNV,
          email: student.EmailNV
        } : null
      }));

      res.json({
        success: true,
        message: 'Lấy danh sách học viên thành công',
        data: formattedData,
        pagination: result.pagination
      });

    } catch (error) {
      console.error('Get all students error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy danh sách học viên',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Lấy thông tin học viên theo ID
  static async getStudentById(req, res) {
    try {
      const studentId = req.params.id;
      const student = await HocVien.findById(studentId);

      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy học viên'
        });
      }

      // Lấy khóa học đã mua
      const purchasedCourses = await HocVien.getPurchasedCourses(studentId);
      
      // Lấy tiến độ học
      const progress = await HocVien.getProgress(studentId);

      // Format dữ liệu
      const formattedStudent = {
        id: student.IDHV.toString(),
        name: student.TenHV,
        email: student.Email,
        avatar: student.AnhHV,
        role: student.Role,
        registeredDate: student.NgayDangKy,
        salesPerson: student.TenNV ? {
          id: student.IDNV,
          name: student.TenNV,
          email: student.EmailNV
        } : null,
        purchasedCourses: purchasedCourses.map(course => ({
          id: course.IDKH.toString(),
          title: course.TenKH,
          price: course.GiaKH,
          purchaseDate: course.NgayBan,
          paidAmount: course.GiaThucTe,
          status: course.TrangThaiTT
        })),
        progress: progress.map(p => ({
          courseId: p.IDKH.toString(),
          courseName: p.TenKH,
          totalLessons: p.TongSoBai,
          completedLessons: p.BaiDaHoc,
          progressPercent: p.TienDoPhanTram
        }))
      };

      res.json({
        success: true,
        message: 'Lấy thông tin học viên thành công',
        data: formattedStudent
      });

    } catch (error) {
      console.error('Get student by ID error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy thông tin học viên',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Tạo học viên mới (chỉ admin)
  static async createStudent(req, res) {
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

      const { TenHV, Email, MatKhau, Role, IDNV, AnhHV } = req.body;

      // Kiểm tra email đã tồn tại chưa
      const existingUser = await HocVien.findByEmail(Email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email đã được sử dụng'
        });
      }

      const newStudent = await HocVien.create({
        TenHV,
        Email,
        MatKhau,
        Role: Role || 'user',
        IDNV: IDNV || null,
        AnhHV: AnhHV || null
      });

      // Format response
      const formattedStudent = {
        id: newStudent.IDHV.toString(),
        name: newStudent.TenHV,
        email: newStudent.Email,
        avatar: newStudent.AnhHV,
        role: newStudent.Role,
        registeredDate: newStudent.NgayDangKy
      };

      res.status(201).json({
        success: true,
        message: 'Tạo học viên thành công',
        data: formattedStudent
      });

    } catch (error) {
      console.error('Create student error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi tạo học viên',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Cập nhật thông tin học viên
  static async updateStudent(req, res) {
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

      const studentId = req.params.id;
      const updateData = {};

      // Chỉ cập nhật các field được cung cấp
      if (req.body.TenHV !== undefined) updateData.TenHV = req.body.TenHV;
      if (req.body.AnhHV !== undefined) updateData.AnhHV = req.body.AnhHV;
      if (req.body.IDNV !== undefined) updateData.IDNV = req.body.IDNV;

      // Chỉ admin mới được cập nhật role và email
      if (req.user.role === 'admin') {
        if (req.body.Role !== undefined) updateData.Role = req.body.Role;
        
        if (req.body.Email !== undefined) {
          // Kiểm tra email mới
          const existingUser = await HocVien.findByEmail(req.body.Email);
          if (existingUser && existingUser.IDHV.toString() !== studentId) {
            return res.status(400).json({
              success: false,
              message: 'Email đã được sử dụng'
            });
          }
          updateData.Email = req.body.Email;
        }
      }

      // Cập nhật mật khẩu nếu có
      if (req.body.MatKhau) {
        updateData.MatKhau = req.body.MatKhau;
      }

      const updatedStudent = await HocVien.update(studentId, updateData);

      // Format response
      const formattedStudent = {
        id: updatedStudent.IDHV.toString(),
        name: updatedStudent.TenHV,
        email: updatedStudent.Email,
        avatar: updatedStudent.AnhHV,
        role: updatedStudent.Role,
        registeredDate: updatedStudent.NgayDangKy
      };

      res.json({
        success: true,
        message: 'Cập nhật học viên thành công',
        data: formattedStudent
      });

    } catch (error) {
      console.error('Update student error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi cập nhật học viên',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Xóa học viên (chỉ admin)
  static async deleteStudent(req, res) {
    try {
      const studentId = req.params.id;

      // Kiểm tra học viên có tồn tại không
      const student = await HocVien.findById(studentId);
      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy học viên'
        });
      }

      // Không cho phép xóa admin
      if (student.Role === 'admin') {
        return res.status(400).json({
          success: false,
          message: 'Không thể xóa tài khoản admin'
        });
      }

      const deleted = await HocVien.delete(studentId);

      if (deleted) {
        res.json({
          success: true,
          message: 'Xóa học viên thành công'
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Không thể xóa học viên'
        });
      }

    } catch (error) {
      console.error('Delete student error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi xóa học viên',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Lấy tiến độ học của học viên
  static async getStudentProgress(req, res) {
    try {
      const studentId = req.params.id;
      const courseId = req.query.courseId || null;

      // Kiểm tra học viên có tồn tại không
      const student = await HocVien.findById(studentId);
      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy học viên'
        });
      }

      const progress = await HocVien.getProgress(studentId, courseId);

      // Format dữ liệu
      const formattedProgress = progress.map(p => ({
        courseId: p.IDKH.toString(),
        courseName: p.TenKH,
        totalLessons: p.TongSoBai,
        completedLessons: p.BaiDaHoc,
        progressPercent: p.TienDoPhanTram
      }));

      res.json({
        success: true,
        message: 'Lấy tiến độ học thành công',
        data: formattedProgress
      });

    } catch (error) {
      console.error('Get student progress error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy tiến độ học',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Cập nhật tiến độ học
  static async updateProgress(req, res) {
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

      const { courseId, chapterId, lessonId, completed } = req.body;
      const studentId = req.user.id; // Lấy từ token

      await HocVien.updateProgress(studentId, courseId, chapterId, lessonId, completed);

      // Lấy tiến độ mới
      const progress = await HocVien.getProgress(studentId, courseId);
      const courseProgress = progress.length > 0 ? progress[0] : null;

      res.json({
        success: true,
        message: 'Cập nhật tiến độ học thành công',
        data: courseProgress ? {
          courseId: courseProgress.IDKH.toString(),
          courseName: courseProgress.TenKH,
          totalLessons: courseProgress.TongSoBai,
          completedLessons: courseProgress.BaiDaHoc,
          progressPercent: courseProgress.TienDoPhanTram
        } : null
      });

    } catch (error) {
      console.error('Update progress error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi cập nhật tiến độ học',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Lấy khóa học đã mua của học viên
  static async getPurchasedCourses(req, res) {
    try {
      const studentId = req.params.id;

      // Kiểm tra học viên có tồn tại không
      const student = await HocVien.findById(studentId);
      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy học viên'
        });
      }

      const courses = await HocVien.getPurchasedCourses(studentId);

      // Format dữ liệu
      const formattedCourses = courses.map(course => ({
        id: course.IDKH.toString(),
        title: course.TenKH,
        description: course.MoTaKH,
        thumbnail: course.AnhDaiDien,
        price: course.GiaKH,
        purchaseDate: course.NgayBan,
        paidAmount: course.GiaThucTe,
        status: course.TrangThaiTT
      }));

      res.json({
        success: true,
        message: 'Lấy danh sách khóa học đã mua thành công',
        data: formattedCourses
      });

    } catch (error) {
      console.error('Get purchased courses error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy danh sách khóa học đã mua',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

// Validation rules
const createStudentValidation = [
  body('TenHV')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Tên phải từ 2-100 ký tự'),
  body('Email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email không hợp lệ'),
  body('MatKhau')
    .isLength({ min: 6 })
    .withMessage('Mật khẩu phải ít nhất 6 ký tự'),
  body('Role')
    .optional()
    .isIn(['user', 'admin'])
    .withMessage('Role không hợp lệ'),
  body('IDNV')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID nhân viên sale không hợp lệ')
];

const updateStudentValidation = [
  body('TenHV')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Tên phải từ 2-100 ký tự'),
  body('Email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Email không hợp lệ'),
  body('MatKhau')
    .optional()
    .isLength({ min: 6 })
    .withMessage('Mật khẩu phải ít nhất 6 ký tự'),
  body('Role')
    .optional()
    .isIn(['user', 'admin'])
    .withMessage('Role không hợp lệ'),
  body('IDNV')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID nhân viên sale không hợp lệ')
];

const updateProgressValidation = [
  body('courseId')
    .isInt({ min: 1 })
    .withMessage('ID khóa học không hợp lệ'),
  body('chapterId')
    .isInt({ min: 1 })
    .withMessage('ID chương không hợp lệ'),
  body('lessonId')
    .isInt({ min: 1 })
    .withMessage('ID bài học không hợp lệ'),
  body('completed')
    .isBoolean()
    .withMessage('Trạng thái hoàn thành phải là boolean')
];

module.exports = {
  HocVienController,
  createStudentValidation,
  updateStudentValidation,
  updateProgressValidation
};
