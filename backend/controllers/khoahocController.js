const { body, validationResult } = require('express-validator');
const KhoaHoc = require('../models/KhoaHoc');
const HocVien = require('../models/HocVien');

class KhoaHocController {
  // Lấy danh sách khóa học với phân trang và filter
  static async getAllCourses(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const filters = {
        status: req.query.status,
        price: req.query.price,
        search: req.query.search,
        minPrice: req.query.minPrice ? parseFloat(req.query.minPrice) : undefined,
        maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice) : undefined
      };

      const result = await KhoaHoc.findAll(page, limit, filters);

      res.json({
        success: true,
        message: 'Lấy danh sách khóa học thành công',
        data: result.data,
        pagination: result.pagination
      });

    } catch (error) {
      console.error('Get all courses error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy danh sách khóa học',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Lấy khóa học nổi bật
  static async getFeaturedCourses(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 6;
      const courses = await KhoaHoc.getFeatured(limit);

      // Format dữ liệu cho frontend
      const formattedCourses = courses.map(course => ({
        id: course.IDKH.toString(),
        title: course.TenKH,
        description: course.MoTaKH,
        thumbnail: course.AnhDaiDien,
        price: course.GiaKH,
        isFree: course.GiaKH === 0,
        chapters: [],
        totalLessons: course.SoBaiHoc || 0,
        completedLessons: 0,
        studentCount: course.SoHocVien || 0,
        rating: course.DiemTrungBinh ? parseFloat(course.DiemTrungBinh).toFixed(1) : null,
        status: course.TrangThai
      }));

      res.json({
        success: true,
        message: 'Lấy khóa học nổi bật thành công',
        data: formattedCourses
      });

    } catch (error) {
      console.error('Get featured courses error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy khóa học nổi bật',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Lấy chi tiết khóa học theo ID
  static async getCourseById(req, res) {
    try {
      const courseId = req.params.id;
      const course = await KhoaHoc.findById(courseId);

      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy khóa học'
        });
      }

      // Kiểm tra quyền truy cập nếu user đã đăng nhập
      let hasAccess = false;
      let userProgress = null;

      if (req.user) {
        const accessCheck = await KhoaHoc.checkStudentAccess(courseId, req.user.id);
        hasAccess = accessCheck.hasAccess;

        if (hasAccess) {
          const progress = await HocVien.getProgress(req.user.id, courseId);
          userProgress = progress.length > 0 ? progress[0] : null;
        }
      }

      // Format dữ liệu cho frontend
      const formattedCourse = {
        id: course.IDKH.toString(),
        title: course.TenKH,
        description: course.MoTaKH,
        thumbnail: course.AnhDaiDien,
        price: course.GiaKH,
        isFree: course.GiaKH === 0,
        totalLessons: course.SoBaiHoc || 0,
        completedLessons: userProgress ? userProgress.BaiDaHoc : 0,
        progress: userProgress ? userProgress.TienDoPhanTram : 0,
        studentCount: course.SoHocVien || 0,
        rating: course.DiemTrungBinh ? parseFloat(course.DiemTrungBinh).toFixed(1) : null,
        reviewCount: course.SoDanhGia || 0,
        status: course.TrangThai,
        createdAt: course.NgayTao,
        hasAccess: hasAccess,
        chapters: course.chapters.map(chapter => ({
          id: chapter.id.toString(),
          title: chapter.title,
          description: chapter.description,
          order: chapter.order,
          lessons: chapter.lessons.map(lesson => ({
            id: lesson.id.toString(),
            title: lesson.title,
            description: lesson.description,
            videoUrl: hasAccess ? lesson.videoUrl : null,
            duration: lesson.duration,
            isFree: lesson.isFree,
            isCompleted: lesson.isCompleted,
            order: lesson.order,
            type: lesson.type,
            materials: hasAccess ? lesson.materials : null,
            videos: hasAccess ? lesson.videos : null
          }))
        }))
      };

      res.json({
        success: true,
        message: 'Lấy chi tiết khóa học thành công',
        data: formattedCourse
      });

    } catch (error) {
      console.error('Get course by ID error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy chi tiết khóa học',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Tạo khóa học mới (chỉ admin)
  static async createCourse(req, res) {
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

      const courseData = {
        TenKH: req.body.TenKH,
        MoTaKH: req.body.MoTaKH,
        GiaKH: req.body.GiaKH || 0,
        TrangThai: req.body.TrangThai || 'draft',
        AnhDaiDien: req.body.AnhDaiDien
      };

      const newCourse = await KhoaHoc.create(courseData);

      res.status(201).json({
        success: true,
        message: 'Tạo khóa học thành công',
        data: {
          id: newCourse.IDKH.toString(),
          title: newCourse.TenKH,
          description: newCourse.MoTaKH,
          price: newCourse.GiaKH,
          status: newCourse.TrangThai,
          thumbnail: newCourse.AnhDaiDien,
          createdAt: newCourse.NgayTao
        }
      });

    } catch (error) {
      console.error('Create course error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi tạo khóa học',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Cập nhật khóa học (chỉ admin)
  static async updateCourse(req, res) {
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

      const courseId = req.params.id;
      const updateData = {};

      // Chỉ cập nhật các field được cung cấp
      if (req.body.TenKH !== undefined) updateData.TenKH = req.body.TenKH;
      if (req.body.MoTaKH !== undefined) updateData.MoTaKH = req.body.MoTaKH;
      if (req.body.GiaKH !== undefined) updateData.GiaKH = req.body.GiaKH;
      if (req.body.TrangThai !== undefined) updateData.TrangThai = req.body.TrangThai;
      if (req.body.AnhDaiDien !== undefined) updateData.AnhDaiDien = req.body.AnhDaiDien;

      const updatedCourse = await KhoaHoc.update(courseId, updateData);

      res.json({
        success: true,
        message: 'Cập nhật khóa học thành công',
        data: {
          id: updatedCourse.IDKH.toString(),
          title: updatedCourse.TenKH,
          description: updatedCourse.MoTaKH,
          price: updatedCourse.GiaKH,
          status: updatedCourse.TrangThai,
          thumbnail: updatedCourse.AnhDaiDien
        }
      });

    } catch (error) {
      console.error('Update course error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi cập nhật khóa học',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Xóa khóa học (chỉ admin)
  static async deleteCourse(req, res) {
    try {
      const courseId = req.params.id;
      
      // Kiểm tra khóa học có tồn tại không
      const course = await KhoaHoc.findById(courseId);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy khóa học'
        });
      }

      const deleted = await KhoaHoc.delete(courseId);

      if (deleted) {
        res.json({
          success: true,
          message: 'Xóa khóa học thành công'
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Không thể xóa khóa học'
        });
      }

    } catch (error) {
      console.error('Delete course error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi xóa khóa học',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Lấy chương của khóa học
  static async getCourseChapters(req, res) {
    try {
      const courseId = req.params.id;
      
      // Kiểm tra khóa học có tồn tại không
      const course = await KhoaHoc.findById(courseId);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy khóa học'
        });
      }

      // Kiểm tra quyền truy cập
      let hasAccess = false;
      if (req.user) {
        const accessCheck = await KhoaHoc.checkStudentAccess(courseId, req.user.id);
        hasAccess = accessCheck.hasAccess;
      }

      const chapters = await KhoaHoc.getChaptersWithLessons(courseId);

      // Format dữ liệu và ẩn thông tin nhạy cảm nếu chưa có quyền truy cập
      const formattedChapters = chapters.map(chapter => ({
        id: chapter.id.toString(),
        title: chapter.title,
        description: chapter.description,
        order: chapter.order,
        lessons: chapter.lessons.map(lesson => ({
          id: lesson.id.toString(),
          title: lesson.title,
          description: lesson.description,
          videoUrl: hasAccess ? lesson.videoUrl : null,
          duration: lesson.duration,
          isFree: lesson.isFree,
          isCompleted: lesson.isCompleted,
          order: lesson.order,
          type: lesson.type,
          materials: hasAccess ? lesson.materials : null,
          videos: hasAccess ? lesson.videos : null
        }))
      }));

      res.json({
        success: true,
        message: 'Lấy danh sách chương thành công',
        data: formattedChapters,
        hasAccess: hasAccess
      });

    } catch (error) {
      console.error('Get course chapters error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy danh sách chương',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Lấy thống kê khóa học (chỉ admin)
  static async getCourseStatistics(req, res) {
    try {
      const courseId = req.params.id || null;
      const statistics = await KhoaHoc.getStatistics(courseId);

      res.json({
        success: true,
        message: 'Lấy thống kê thành công',
        data: statistics[0]
      });

    } catch (error) {
      console.error('Get course statistics error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy thống kê',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

// Validation rules
const createCourseValidation = [
  body('TenKH')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Tên khóa học phải từ 5-200 ký tự'),
  body('MoTaKH')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Mô tả không được quá 2000 ký tự'),
  body('GiaKH')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Giá phải là số không âm'),
  body('TrangThai')
    .optional()
    .isIn(['draft', 'active', 'inactive'])
    .withMessage('Trạng thái không hợp lệ'),
  body('AnhDaiDien')
    .optional()
    .isURL()
    .withMessage('Link ảnh đại diện không hợp lệ')
];

const updateCourseValidation = [
  body('TenKH')
    .optional()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Tên khóa học phải từ 5-200 ký tự'),
  body('MoTaKH')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Mô tả không được quá 2000 ký tự'),
  body('GiaKH')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Giá phải là số không âm'),
  body('TrangThai')
    .optional()
    .isIn(['draft', 'active', 'inactive'])
    .withMessage('Trạng thái không hợp lệ'),
  body('AnhDaiDien')
    .optional()
    .isURL()
    .withMessage('Link ảnh đại diện không hợp lệ')
];

module.exports = {
  KhoaHocController,
  createCourseValidation,
  updateCourseValidation
};
