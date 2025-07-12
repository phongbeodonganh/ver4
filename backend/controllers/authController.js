const { body, validationResult } = require('express-validator');
const { generateToken } = require('../config/jwt');
const HocVien = require('../models/HocVien');

class AuthController {
  // Đăng ký học viên mới
  static async register(req, res) {
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

      const { TenHV, Email, MatKhau } = req.body;

      // Kiểm tra email đã tồn tại chưa
      const existingUser = await HocVien.findByEmail(Email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email đã được sử dụng'
        });
      }

      // Tạo học viên mới
      const newUser = await HocVien.create({
        TenHV,
        Email,
        MatKhau,
        Role: 'user'
      });

      // Handle demo mode case where newUser might be null
      if (!newUser || !newUser.IDHV) {
        // Create mock user for demo mode
        const mockUser = {
          IDHV: Date.now(),
          TenHV,
          Email,
          Role: 'user',
          AnhHV: null
        };

        const token = generateToken({
          id: mockUser.IDHV,
          email: mockUser.Email,
          role: mockUser.Role
        });

        return res.status(201).json({
          success: true,
          message: 'Đăng ký thành công (Demo Mode)',
          data: {
            token,
            user: {
              id: mockUser.IDHV.toString(),
              email: mockUser.Email,
              name: mockUser.TenHV,
              role: mockUser.Role,
              avatar: mockUser.AnhHV
            }
          }
        });
      }

      // Tạo JWT token
      const token = generateToken({
        id: newUser.IDHV,
        email: newUser.Email,
        role: newUser.Role
      });

      // Trả về thông tin user (không bao gồm password)
      const userResponse = {
        id: newUser.IDHV.toString(),
        email: newUser.Email,
        name: newUser.TenHV,
        role: newUser.Role,
        avatar: newUser.AnhHV
      };

      res.status(201).json({
        success: true,
        message: 'Đăng ký thành công',
        data: {
          token,
          user: userResponse
        }
      });

    } catch (error) {
      console.error('Register error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi đăng ký',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Đăng nhập
  static async login(req, res) {
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

      const { Email, MatKhau } = req.body;

      // Tìm user theo email
      const user = await HocVien.findByEmail(Email);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Email hoặc mật khẩu không đúng'
        });
      }

      // Kiểm tra mật khẩu
      const isValidPassword = await HocVien.verifyPassword(MatKhau, user.MatKhau);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Email hoặc mật khẩu không đúng'
        });
      }

      // Tạo JWT token
      const token = generateToken({
        id: user.IDHV,
        email: user.Email,
        role: user.Role
      });

      // Trả về thông tin user (không bao gồm password)
      const userResponse = {
        id: user.IDHV.toString(),
        email: user.Email,
        name: user.TenHV,
        role: user.Role,
        avatar: user.AnhHV
      };

      res.json({
        success: true,
        message: 'Đăng nhập thành công',
        data: {
          token,
          user: userResponse
        }
      });

    } catch (error) {
      console.error('Login error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi đăng nhập',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Lấy thông tin user hiện tại
  static async getCurrentUser(req, res) {
    try {
      const user = await HocVien.findById(req.user.id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy thông tin người dùng'
        });
      }

      // Trả về thông tin user (không bao gồm password)
      const userResponse = {
        id: user.IDHV.toString(),
        email: user.Email,
        name: user.TenHV,
        role: user.Role,
        avatar: user.AnhHV,
        registeredDate: user.NgayDangKy,
        salesPerson: user.TenNV ? {
          id: user.IDNV,
          name: user.TenNV,
          email: user.EmailNV
        } : null
      };

      res.json({
        success: true,
        data: userResponse
      });

    } catch (error) {
      console.error('Get current user error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy thông tin người dùng',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Đổi mật khẩu
  static async changePassword(req, res) {
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

      const { MatKhauCu, MatKhauMoi } = req.body;
      const userId = req.user.id;

      // Lấy thông tin user
      const user = await HocVien.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy người dùng'
        });
      }

      // Kiểm tra mật khẩu cũ
      const isValidOldPassword = await HocVien.verifyPassword(MatKhauCu, user.MatKhau);
      if (!isValidOldPassword) {
        return res.status(400).json({
          success: false,
          message: 'Mật khẩu cũ không đúng'
        });
      }

      // Cập nhật mật khẩu mới
      await HocVien.update(userId, { MatKhau: MatKhauMoi });

      res.json({
        success: true,
        message: 'Đổi mật khẩu thành công'
      });

    } catch (error) {
      console.error('Change password error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi đổi mật khẩu',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Cập nhật profile
  static async updateProfile(req, res) {
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

      const userId = req.user.id;
      const updateData = {};

      // Chỉ cập nhật các field được phép
      if (req.body.TenHV) updateData.TenHV = req.body.TenHV;
      if (req.body.AnhHV) updateData.AnhHV = req.body.AnhHV;

      // Kiểm tra email mới nếu có
      if (req.body.Email && req.body.Email !== req.user.email) {
        const existingUser = await HocVien.findByEmail(req.body.Email);
        if (existingUser && existingUser.IDHV !== userId) {
          return res.status(400).json({
            success: false,
            message: 'Email đã được sử dụng'
          });
        }
        updateData.Email = req.body.Email;
      }

      const updatedUser = await HocVien.update(userId, updateData);

      // Trả về thông tin user đã cập nhật
      const userResponse = {
        id: updatedUser.IDHV.toString(),
        email: updatedUser.Email,
        name: updatedUser.TenHV,
        role: updatedUser.Role,
        avatar: updatedUser.AnhHV
      };

      res.json({
        success: true,
        message: 'Cập nhật profile thành công',
        data: userResponse
      });

    } catch (error) {
      console.error('Update profile error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi cập nhật profile',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Logout (client-side chỉ cần xóa token)
  static async logout(req, res) {
    res.json({
      success: true,
      message: 'Đăng xuất thành công'
    });
  }
}

// Validation rules
const registerValidation = [
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
    .withMessage('Mật khẩu phải ít nhất 6 ký tự')
];

const loginValidation = [
  body('Email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email không hợp lệ'),
  body('MatKhau')
    .notEmpty()
    .withMessage('Mật khẩu không được để trống')
];

const changePasswordValidation = [
  body('MatKhauCu')
    .notEmpty()
    .withMessage('Mật khẩu cũ không được để trống'),
  body('MatKhauMoi')
    .isLength({ min: 6 })
    .withMessage('Mật khẩu mới phải ít nhất 6 ký tự')
];

const updateProfileValidation = [
  body('TenHV')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Tên phải từ 2-100 ký tự'),
  body('Email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Email không hợp lệ')
];

module.exports = {
  AuthController,
  registerValidation,
  loginValidation,
  changePasswordValidation,
  updateProfileValidation
};
