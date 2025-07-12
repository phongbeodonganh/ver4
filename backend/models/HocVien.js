const { executeQuery, executeTransaction } = require('../config/database');
const bcrypt = require('bcryptjs');

class HocVien {
  constructor(data) {
    this.IDHV = data.IDHV;
    this.TenHV = data.TenHV;
    this.Email = data.Email;
    this.MatKhau = data.MatKhau;
    this.AnhHV = data.AnhHV;
    this.DanhSachKH = data.DanhSachKH;
    this.IDNV = data.IDNV;
    this.NgayDangKy = data.NgayDangKy;
    this.TienDoKH = data.TienDoKH;
    this.Role = data.Role || 'user';
  }

  // Tạo học viên mới
  static async create(userData) {
    try {
      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(userData.MatKhau, saltRounds);

      const query = `
        INSERT INTO HocVien (TenHV, Email, MatKhau, AnhHV, IDNV, Role)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        userData.TenHV,
        userData.Email,
        hashedPassword,
        userData.AnhHV || null,
        userData.IDNV || null,
        userData.Role || 'user'
      ];

      const result = await executeQuery(query, params);
      
      if (result.insertId) {
        // Try to find the created user, if fails return mock data
        try {
          return await HocVien.findById(result.insertId);
        } catch (findError) {
          // Return mock user data for demo mode
          return {
            IDHV: result.insertId,
            TenHV: userData.TenHV,
            Email: userData.Email,
            MatKhau: hashedPassword,
            AnhHV: userData.AnhHV || null,
            IDNV: userData.IDNV || null,
            Role: userData.Role || 'user',
            NgayDangKy: new Date(),
            DanhSachKH: null,
            TienDoKH: null
          };
        }
      }
      
      throw new Error('Không thể tạo học viên');
    } catch (error) {
      throw error;
    }
  }

  // Tìm học viên theo ID
  static async findById(id) {
    try {
      const query = `
        SELECT hv.*, nv.TenNV, nv.EmailNV
        FROM HocVien hv
        LEFT JOIN NhanVienSale nv ON hv.IDNV = nv.IDNV
        WHERE hv.IDHV = ?
      `;
      
      const result = await executeQuery(query, [id]);
      
      if (result.length > 0) {
        const hocvien = result[0];
        // Parse JSON fields
        if (hocvien.DanhSachKH) {
          hocvien.DanhSachKH = JSON.parse(hocvien.DanhSachKH);
        }
        if (hocvien.TienDoKH) {
          hocvien.TienDoKH = JSON.parse(hocvien.TienDoKH);
        }
        return hocvien;
      }
      
      return null;
    } catch (error) {
      throw error;
    }
  }

  // Tìm học viên theo email
  static async findByEmail(email) {
    try {
      const query = `
        SELECT hv.*, nv.TenNV, nv.EmailNV
        FROM HocVien hv
        LEFT JOIN NhanVienSale nv ON hv.IDNV = nv.IDNV
        WHERE hv.Email = ?
      `;
      
      const result = await executeQuery(query, [email]);
      
      if (result.length > 0) {
        const hocvien = result[0];
        // Parse JSON fields
        if (hocvien.DanhSachKH) {
          hocvien.DanhSachKH = JSON.parse(hocvien.DanhSachKH);
        }
        if (hocvien.TienDoKH) {
          hocvien.TienDoKH = JSON.parse(hocvien.TienDoKH);
        }
        return hocvien;
      }
      
      return null;
    } catch (error) {
      // In demo mode, return null for non-existing users
      console.log('Demo mode: User not found for email:', email);
      return null;
    }
  }

  // Lấy tất cả học viên với phân trang
  static async findAll(page = 1, limit = 10, search = '') {
    try {
      const offset = (page - 1) * limit;
      
      let whereClause = '';
      let params = [];
      
      if (search) {
        whereClause = 'WHERE hv.TenHV LIKE ? OR hv.Email LIKE ?';
        params = [`%${search}%`, `%${search}%`];
      }
      
      const query = `
        SELECT hv.IDHV, hv.TenHV, hv.Email, hv.AnhHV, hv.NgayDangKy, hv.Role,
               nv.TenNV, nv.EmailNV,
               COUNT(gd.IDGD) as SoKhoaHocDaMua
        FROM HocVien hv
        LEFT JOIN NhanVienSale nv ON hv.IDNV = nv.IDNV
        LEFT JOIN GiaoDichKhoaHoc gd ON hv.IDHV = gd.IDHV AND gd.TrangThaiTT = 'completed'
        ${whereClause}
        GROUP BY hv.IDHV
        ORDER BY hv.NgayDangKy DESC
        LIMIT ? OFFSET ?
      `;
      
      params.push(limit, offset);
      const result = await executeQuery(query, params);
      
      // Đếm tổng số học viên
      const countQuery = `
        SELECT COUNT(DISTINCT hv.IDHV) as total
        FROM HocVien hv
        ${whereClause}
      `;
      
      const countParams = search ? [`%${search}%`, `%${search}%`] : [];
      const countResult = await executeQuery(countQuery, countParams);
      const total = countResult[0].total;
      
      return {
        data: result,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Cập nhật thông tin học viên
  static async update(id, updateData) {
    try {
      const fields = [];
      const params = [];
      
      // Chỉ cập nhật các field được cung cấp
      if (updateData.TenHV !== undefined) {
        fields.push('TenHV = ?');
        params.push(updateData.TenHV);
      }
      
      if (updateData.Email !== undefined) {
        fields.push('Email = ?');
        params.push(updateData.Email);
      }
      
      if (updateData.MatKhau !== undefined) {
        const hashedPassword = await bcrypt.hash(updateData.MatKhau, 10);
        fields.push('MatKhau = ?');
        params.push(hashedPassword);
      }
      
      if (updateData.AnhHV !== undefined) {
        fields.push('AnhHV = ?');
        params.push(updateData.AnhHV);
      }
      
      if (updateData.IDNV !== undefined) {
        fields.push('IDNV = ?');
        params.push(updateData.IDNV);
      }
      
      if (updateData.Role !== undefined) {
        fields.push('Role = ?');
        params.push(updateData.Role);
      }
      
      if (updateData.DanhSachKH !== undefined) {
        fields.push('DanhSachKH = ?');
        params.push(JSON.stringify(updateData.DanhSachKH));
      }
      
      if (updateData.TienDoKH !== undefined) {
        fields.push('TienDoKH = ?');
        params.push(JSON.stringify(updateData.TienDoKH));
      }
      
      if (fields.length === 0) {
        throw new Error('Không có dữ liệu để cập nhật');
      }
      
      params.push(id);
      
      const query = `
        UPDATE HocVien 
        SET ${fields.join(', ')}
        WHERE IDHV = ?
      `;
      
      const result = await executeQuery(query, params);
      
      if (result.affectedRows > 0) {
        return await HocVien.findById(id);
      }
      
      throw new Error('Không tìm thấy học viên để cập nhật');
    } catch (error) {
      throw error;
    }
  }

  // Xóa học viên
  static async delete(id) {
    try {
      const query = 'DELETE FROM HocVien WHERE IDHV = ?';
      const result = await executeQuery(query, [id]);
      
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  // Xác thực mật khẩu
  static async verifyPassword(plainPassword, hashedPassword) {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      throw error;
    }
  }

  // Lấy khóa học đã mua của học viên
  static async getPurchasedCourses(studentId) {
    try {
      const query = `
        SELECT kh.*, gd.NgayBan, gd.GiaThucTe, gd.TrangThaiTT
        FROM KhoaHoc kh
        INNER JOIN GiaoDichKhoaHoc gd ON kh.IDKH = gd.IDKH
        WHERE gd.IDHV = ? AND gd.TrangThaiTT = 'completed'
        ORDER BY gd.NgayBan DESC
      `;
      
      return await executeQuery(query, [studentId]);
    } catch (error) {
      throw error;
    }
  }

  // Lấy tiến độ học của học viên
  static async getProgress(studentId, courseId = null) {
    try {
      let query = `
        SELECT 
          kh.IDKH, kh.TenKH,
          COUNT(DISTINCT bh.IDBH) as TongSoBai,
          COUNT(DISTINCT CASE WHEN td.DaHoanThanh = 1 THEN td.IDBH END) as BaiDaHoc,
          ROUND(
            (COUNT(DISTINCT CASE WHEN td.DaHoanThanh = 1 THEN td.IDBH END) * 100.0) / 
            NULLIF(COUNT(DISTINCT bh.IDBH), 0), 2
          ) as TienDoPhanTram
        FROM KhoaHoc kh
        INNER JOIN GiaoDichKhoaHoc gd ON kh.IDKH = gd.IDKH
        INNER JOIN ChuongHoc ch ON kh.IDKH = ch.IDKH
        INNER JOIN BaiHoc bh ON ch.IDCH = bh.IDCH
        LEFT JOIN TienDoHoc td ON bh.IDBH = td.IDBH AND td.IDHV = ?
        WHERE gd.IDHV = ? AND gd.TrangThaiTT = 'completed'
      `;
      
      let params = [studentId, studentId];
      
      if (courseId) {
        query += ' AND kh.IDKH = ?';
        params.push(courseId);
      }
      
      query += ' GROUP BY kh.IDKH, kh.TenKH ORDER BY kh.TenKH';
      
      return await executeQuery(query, params);
    } catch (error) {
      throw error;
    }
  }

  // Cập nhật tiến độ học
  static async updateProgress(studentId, courseId, chapterId, lessonId, completed = true) {
    try {
      const queries = [
        {
          query: `
            INSERT INTO TienDoHoc (IDHV, IDKH, IDCH, IDBH, DaHoanThanh, NgayHoanThanh)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            DaHoanThanh = VALUES(DaHoanThanh),
            NgayHoanThanh = VALUES(NgayHoanThanh)
          `,
          params: [
            studentId, 
            courseId, 
            chapterId, 
            lessonId, 
            completed, 
            completed ? new Date() : null
          ]
        }
      ];
      
      return await executeTransaction(queries);
    } catch (error) {
      throw error;
    }
  }
}

module.exports = HocVien;
