const { executeQuery, executeTransaction } = require('../config/database');

class KhoaHoc {
  constructor(data) {
    this.IDKH = data.IDKH;
    this.TenKH = data.TenKH;
    this.MoTaKH = data.MoTaKH;
    this.GiaKH = data.GiaKH;
    this.TrangThai = data.TrangThai;
    this.NgayTao = data.NgayTao;
    this.AnhDaiDien = data.AnhDaiDien;
  }

  // Tạo khóa học mới
  static async create(courseData) {
    try {
      const query = `
        INSERT INTO KhoaHoc (TenKH, MoTaKH, GiaKH, TrangThai, AnhDaiDien)
        VALUES (?, ?, ?, ?, ?)
      `;
      
      const params = [
        courseData.TenKH,
        courseData.MoTaKH,
        courseData.GiaKH || 0,
        courseData.TrangThai || 'draft',
        courseData.AnhDaiDien || null
      ];

      const result = await executeQuery(query, params);
      
      if (result.insertId) {
        return await KhoaHoc.findById(result.insertId);
      }
      
      throw new Error('Không thể tạo khóa học');
    } catch (error) {
      throw error;
    }
  }

  // Tìm khóa học theo ID với thông tin chi tiết
  static async findById(id) {
    try {
      const query = `
        SELECT kh.*,
               COUNT(DISTINCT ch.IDCH) as SoChuong,
               COUNT(DISTINCT bh.IDBH) as SoBaiHoc,
               COUNT(DISTINCT gd.IDHV) as SoHocVien,
               AVG(dg.DiemDanhGia) as DiemTrungBinh,
               COUNT(DISTINCT dg.ID) as SoDanhGia
        FROM KhoaHoc kh
        LEFT JOIN ChuongHoc ch ON kh.IDKH = ch.IDKH
        LEFT JOIN BaiHoc bh ON ch.IDCH = bh.IDCH
        LEFT JOIN GiaoDichKhoaHoc gd ON kh.IDKH = gd.IDKH AND gd.TrangThaiTT = 'completed'
        LEFT JOIN DanhGiaKhoaHoc dg ON kh.IDKH = dg.IDKH
        WHERE kh.IDKH = ?
        GROUP BY kh.IDKH
      `;
      
      const result = await executeQuery(query, [id]);
      
      if (result.length > 0) {
        const course = result[0];
        
        // Lấy danh sách chương và bài học
        const chapters = await KhoaHoc.getChaptersWithLessons(id);
        course.chapters = chapters;
        
        return course;
      }
      
      return null;
    } catch (error) {
      throw error;
    }
  }

  // Lấy tất cả khóa học với phân trang và filter
  static async findAll(page = 1, limit = 10, filters = {}) {
    try {
      const offset = (page - 1) * limit;
      
      let whereClause = 'WHERE 1=1';
      let params = [];
      
      // Filter theo trạng thái
      if (filters.status) {
        whereClause += ' AND kh.TrangThai = ?';
        params.push(filters.status);
      }
      
      // Filter theo giá (miễn phí hoặc có phí)
      if (filters.price === 'free') {
        whereClause += ' AND kh.GiaKH = 0';
      } else if (filters.price === 'paid') {
        whereClause += ' AND kh.GiaKH > 0';
      }
      
      // Tìm kiếm theo tên
      if (filters.search) {
        whereClause += ' AND (kh.TenKH LIKE ? OR kh.MoTaKH LIKE ?)';
        params.push(`%${filters.search}%`, `%${filters.search}%`);
      }
      
      // Filter theo khoảng giá
      if (filters.minPrice !== undefined) {
        whereClause += ' AND kh.GiaKH >= ?';
        params.push(filters.minPrice);
      }
      
      if (filters.maxPrice !== undefined) {
        whereClause += ' AND kh.GiaKH <= ?';
        params.push(filters.maxPrice);
      }
      
      const query = `
        SELECT kh.*,
               COUNT(DISTINCT ch.IDCH) as SoChuong,
               COUNT(DISTINCT bh.IDBH) as SoBaiHoc,
               COUNT(DISTINCT gd.IDHV) as SoHocVien,
               AVG(dg.DiemDanhGia) as DiemTrungBinh,
               COUNT(DISTINCT dg.ID) as SoDanhGia
        FROM KhoaHoc kh
        LEFT JOIN ChuongHoc ch ON kh.IDKH = ch.IDKH
        LEFT JOIN BaiHoc bh ON ch.IDCH = bh.IDCH
        LEFT JOIN GiaoDichKhoaHoc gd ON kh.IDKH = gd.IDKH AND gd.TrangThaiTT = 'completed'
        LEFT JOIN DanhGiaKhoaHoc dg ON kh.IDKH = dg.IDKH
        ${whereClause}
        GROUP BY kh.IDKH
        ORDER BY kh.NgayTao DESC
        LIMIT ? OFFSET ?
      `;
      
      params.push(limit, offset);
      const result = await executeQuery(query, params);
      
      // Đếm tổng số khóa học
      const countQuery = `
        SELECT COUNT(DISTINCT kh.IDKH) as total
        FROM KhoaHoc kh
        ${whereClause}
      `;
      
      const countParams = params.slice(0, -2); // Bỏ limit và offset
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

  // Lấy khóa học nổi bật (featured)
  static async getFeatured(limit = 6) {
    try {
      const query = `
        SELECT kh.*,
               COUNT(DISTINCT ch.IDCH) as SoChuong,
               COUNT(DISTINCT bh.IDBH) as SoBaiHoc,
               COUNT(DISTINCT gd.IDHV) as SoHocVien,
               AVG(dg.DiemDanhGia) as DiemTrungBinh
        FROM KhoaHoc kh
        LEFT JOIN ChuongHoc ch ON kh.IDKH = ch.IDKH
        LEFT JOIN BaiHoc bh ON ch.IDCH = bh.IDCH
        LEFT JOIN GiaoDichKhoaHoc gd ON kh.IDKH = gd.IDKH AND gd.TrangThaiTT = 'completed'
        LEFT JOIN DanhGiaKhoaHoc dg ON kh.IDKH = dg.IDKH
        WHERE kh.TrangThai = 'active'
        GROUP BY kh.IDKH
        ORDER BY SoHocVien DESC, DiemTrungBinh DESC, kh.NgayTao DESC
        LIMIT ?
      `;
      
      return await executeQuery(query, [limit]);
    } catch (error) {
      throw error;
    }
  }

  // Lấy chương và bài học của khóa học
  static async getChaptersWithLessons(courseId) {
    try {
      const query = `
        SELECT 
          ch.IDCH, ch.TenCH, ch.ThuTuCH, ch.MoTaCH,
          bh.IDBH, bh.TenBH, bh.LoaiND, bh.LinkND, bh.ThuTuBH, bh.TaiLieu,
          v.video_480p_path, v.video_720p_path, v.video_1080p_path, v.duration
        FROM ChuongHoc ch
        LEFT JOIN BaiHoc bh ON ch.IDCH = bh.IDCH
        LEFT JOIN Video v ON bh.IDBH = v.IDBH
        WHERE ch.IDKH = ?
        ORDER BY ch.ThuTuCH ASC, bh.ThuTuBH ASC
      `;
      
      const result = await executeQuery(query, [courseId]);
      
      // Nhóm dữ liệu theo chương
      const chaptersMap = new Map();
      
      result.forEach(row => {
        if (!chaptersMap.has(row.IDCH)) {
          chaptersMap.set(row.IDCH, {
            id: row.IDCH,
            title: row.TenCH,
            description: row.MoTaCH,
            order: row.ThuTuCH,
            lessons: []
          });
        }
        
        if (row.IDBH) {
          const lesson = {
            id: row.IDBH,
            title: row.TenBH,
            description: '',
            videoUrl: row.LinkND,
            duration: row.duration || 0,
            isFree: false, // Sẽ được xác định dựa trên logic khác
            isCompleted: false, // Sẽ được cập nhật khi có thông tin user
            order: row.ThuTuBH,
            type: row.LoaiND,
            materials: row.TaiLieu ? JSON.parse(row.TaiLieu) : null,
            videos: {
              '480p': row.video_480p_path,
              '720p': row.video_720p_path,
              '1080p': row.video_1080p_path
            }
          };
          
          chaptersMap.get(row.IDCH).lessons.push(lesson);
        }
      });
      
      return Array.from(chaptersMap.values());
    } catch (error) {
      throw error;
    }
  }

  // Cập nhật khóa học
  static async update(id, updateData) {
    try {
      const fields = [];
      const params = [];
      
      if (updateData.TenKH !== undefined) {
        fields.push('TenKH = ?');
        params.push(updateData.TenKH);
      }
      
      if (updateData.MoTaKH !== undefined) {
        fields.push('MoTaKH = ?');
        params.push(updateData.MoTaKH);
      }
      
      if (updateData.GiaKH !== undefined) {
        fields.push('GiaKH = ?');
        params.push(updateData.GiaKH);
      }
      
      if (updateData.TrangThai !== undefined) {
        fields.push('TrangThai = ?');
        params.push(updateData.TrangThai);
      }
      
      if (updateData.AnhDaiDien !== undefined) {
        fields.push('AnhDaiDien = ?');
        params.push(updateData.AnhDaiDien);
      }
      
      if (fields.length === 0) {
        throw new Error('Không có dữ liệu để cập nhật');
      }
      
      params.push(id);
      
      const query = `
        UPDATE KhoaHoc 
        SET ${fields.join(', ')}
        WHERE IDKH = ?
      `;
      
      const result = await executeQuery(query, params);
      
      if (result.affectedRows > 0) {
        return await KhoaHoc.findById(id);
      }
      
      throw new Error('Không tìm thấy khóa học để cập nhật');
    } catch (error) {
      throw error;
    }
  }

  // Xóa khóa học
  static async delete(id) {
    try {
      const query = 'DELETE FROM KhoaHoc WHERE IDKH = ?';
      const result = await executeQuery(query, [id]);
      
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  // Lấy thống kê khóa học
  static async getStatistics(courseId = null) {
    try {
      let query = `
        SELECT 
          COUNT(DISTINCT kh.IDKH) as TongKhoaHoc,
          COUNT(DISTINCT gd.IDHV) as TongHocVien,
          SUM(gd.GiaThucTe) as TongDoanhThu,
          AVG(dg.DiemDanhGia) as DiemTrungBinh
        FROM KhoaHoc kh
        LEFT JOIN GiaoDichKhoaHoc gd ON kh.IDKH = gd.IDKH AND gd.TrangThaiTT = 'completed'
        LEFT JOIN DanhGiaKhoaHoc dg ON kh.IDKH = dg.IDKH
      `;
      
      let params = [];
      
      if (courseId) {
        query += ' WHERE kh.IDKH = ?';
        params.push(courseId);
      }
      
      return await executeQuery(query, params);
    } catch (error) {
      throw error;
    }
  }

  // Kiểm tra học viên đã mua khóa học chưa
  static async checkStudentAccess(courseId, studentId) {
    try {
      // Kiểm tra khóa học miễn phí
      const courseQuery = 'SELECT GiaKH FROM KhoaHoc WHERE IDKH = ?';
      const courseResult = await executeQuery(courseQuery, [courseId]);
      
      if (courseResult.length === 0) {
        return { hasAccess: false, reason: 'Khóa học không tồn tại' };
      }
      
      if (courseResult[0].GiaKH === 0) {
        return { hasAccess: true, reason: 'Khóa học miễn phí' };
      }
      
      // Kiểm tra đã mua chưa
      const purchaseQuery = `
        SELECT IDGD FROM GiaoDichKhoaHoc 
        WHERE IDHV = ? AND IDKH = ? AND TrangThaiTT = 'completed'
      `;
      
      const purchaseResult = await executeQuery(purchaseQuery, [studentId, courseId]);
      
      if (purchaseResult.length > 0) {
        return { hasAccess: true, reason: 'Đã mua khóa học' };
      }
      
      return { hasAccess: false, reason: 'Chưa mua khóa học' };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = KhoaHoc;
