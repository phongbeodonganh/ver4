const { body, validationResult } = require('express-validator');
const { executeQuery } = require('../config/database');

// Helper function to generate slug from title
const generateSlug = (title) => {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim('-'); // Remove leading/trailing hyphens
};

// Helper function to ensure unique slug
const ensureUniqueSlug = async (baseSlug, excludeId = null) => {
  let slug = baseSlug;
  let counter = 1;
  
  while (true) {
    let query = 'SELECT IDBlog FROM Blog WHERE Slug = ?';
    let params = [slug];
    
    if (excludeId) {
      query += ' AND IDBlog != ?';
      params.push(excludeId);
    }
    
    const existing = await executeQuery(query, params);
    
    if (existing.length === 0) {
      return slug;
    }
    
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
};

class BlogController {
  // Lấy danh sách blog với phân trang và filter
  static async getAllBlogs(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const status = req.query.status || 'published';
      const search = req.query.search || '';
      const author = req.query.author || '';
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE 1=1';
      let params = [];

      // Filter theo trạng thái (public chỉ xem published, admin xem tất cả)
      if (req.user && req.user.role === 'admin') {
        if (status && status !== 'all') {
          whereClause += ' AND TrangThai = ?';
          params.push(status);
        }
      } else {
        whereClause += ' AND TrangThai = "published"';
      }

      // Tìm kiếm theo tiêu đề và nội dung
      if (search) {
        whereClause += ' AND (TieuDe LIKE ? OR NoiDung LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }

      // Filter theo tác giả
      if (author) {
        whereClause += ' AND TacGia LIKE ?';
        params.push(`%${author}%`);
      }

      const query = `
        SELECT IDBlog, TieuDe, LEFT(NoiDung, 200) as NoiDungTomTat, 
               NgayDang, TacGia, TrangThai, AnhDaiDien, LuotXem
        FROM Blog
        ${whereClause}
        ORDER BY NgayDang DESC
        LIMIT ? OFFSET ?
      `;

      params.push(limit, offset);
      const blogs = await executeQuery(query, params);

      // Đếm tổng số blog
      const countQuery = `
        SELECT COUNT(*) as total FROM Blog ${whereClause}
      `;
      const countParams = params.slice(0, -2); // Bỏ limit và offset
      const countResult = await executeQuery(countQuery, countParams);
      const total = countResult[0].total;

      // Format dữ liệu
      const formattedBlogs = blogs.map(blog => ({
        id: blog.IDBlog.toString(),
        title: blog.TieuDe,
        excerpt: blog.NoiDungTomTat,
        publishDate: blog.NgayDang,
        author: blog.TacGia,
        status: blog.TrangThai,
        thumbnail: blog.AnhDaiDien,
        views: blog.LuotXem
      }));

      res.json({
        success: true,
        message: 'Lấy danh sách blog thành công',
        data: formattedBlogs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total,
          totalPages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Get all blogs error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy danh sách blog',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Lấy chi tiết blog theo ID
  static async getBlogById(req, res) {
    try {
      const blogId = req.params.id;

      let query = 'SELECT * FROM Blog WHERE IDBlog = ?';
      let params = [blogId];

      // Nếu không phải admin, chỉ xem blog published
      if (!req.user || req.user.role !== 'admin') {
        query += ' AND TrangThai = "published"';
      }

      const result = await executeQuery(query, params);

      if (result.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy bài viết'
        });
      }

      const blog = result[0];

      // Tăng lượt xem (chỉ khi không phải admin)
      if (!req.user || req.user.role !== 'admin') {
        await executeQuery(
          'UPDATE Blog SET LuotXem = LuotXem + 1 WHERE IDBlog = ?',
          [blogId]
        );
        blog.LuotXem += 1;
      }

      // Parse SEO data
      let seoData = null;
      if (blog.SEO) {
        try {
          seoData = JSON.parse(blog.SEO);
        } catch (e) {
          console.warn('Invalid SEO JSON data for blog:', blogId);
        }
      }

      const formattedBlog = {
        id: blog.IDBlog.toString(),
        title: blog.TieuDe,
        content: blog.NoiDung,
        publishDate: blog.NgayDang,
        author: blog.TacGia,
        status: blog.TrangThai,
        thumbnail: blog.AnhDaiDien,
        views: blog.LuotXem,
        seo: seoData
      };

      res.json({
        success: true,
        message: 'Lấy chi tiết blog thành công',
        data: formattedBlog
      });

    } catch (error) {
      console.error('Get blog by ID error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy chi tiết blog',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Tạo blog mới (chỉ admin)
  static async createBlog(req, res) {
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

      const { TieuDe, NoiDung, TacGia, TrangThai, AnhDaiDien, SEO } = req.body;

      // Chuẩn bị SEO data
      let seoJson = null;
      if (SEO) {
        seoJson = JSON.stringify(SEO);
      }

      const query = `
        INSERT INTO Blog (TieuDe, NoiDung, TacGia, TrangThai, AnhDaiDien, SEO)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      const params = [
        TieuDe,
        NoiDung,
        TacGia || req.user.name,
        TrangThai || 'draft',
        AnhDaiDien || null,
        seoJson
      ];

      const result = await executeQuery(query, params);

      // Lấy blog vừa tạo
      const newBlog = await executeQuery(
        'SELECT * FROM Blog WHERE IDBlog = ?',
        [result.insertId]
      );

      const blog = newBlog[0];
      const formattedBlog = {
        id: blog.IDBlog.toString(),
        title: blog.TieuDe,
        content: blog.NoiDung,
        publishDate: blog.NgayDang,
        author: blog.TacGia,
        status: blog.TrangThai,
        thumbnail: blog.AnhDaiDien,
        views: blog.LuotXem,
        seo: SEO || null
      };

      res.status(201).json({
        success: true,
        message: 'Tạo blog thành công',
        data: formattedBlog
      });

    } catch (error) {
      console.error('Create blog error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi tạo blog',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Cập nhật blog (chỉ admin)
  static async updateBlog(req, res) {
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

      const blogId = req.params.id;
      const updateData = {};
      const fields = [];
      const params = [];

      // Chỉ cập nhật các field được cung cấp
      if (req.body.TieuDe !== undefined) {
        fields.push('TieuDe = ?');
        params.push(req.body.TieuDe);
      }

      if (req.body.NoiDung !== undefined) {
        fields.push('NoiDung = ?');
        params.push(req.body.NoiDung);
      }

      if (req.body.TacGia !== undefined) {
        fields.push('TacGia = ?');
        params.push(req.body.TacGia);
      }

      if (req.body.TrangThai !== undefined) {
        fields.push('TrangThai = ?');
        params.push(req.body.TrangThai);
      }

      if (req.body.AnhDaiDien !== undefined) {
        fields.push('AnhDaiDien = ?');
        params.push(req.body.AnhDaiDien);
      }

      if (req.body.SEO !== undefined) {
        fields.push('SEO = ?');
        params.push(JSON.stringify(req.body.SEO));
      }

      if (fields.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Không có dữ liệu để cập nhật'
        });
      }

      params.push(blogId);

      const query = `
        UPDATE Blog 
        SET ${fields.join(', ')}
        WHERE IDBlog = ?
      `;

      const result = await executeQuery(query, params);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy blog để cập nhật'
        });
      }

      // Lấy blog đã cập nhật
      const updatedBlog = await executeQuery(
        'SELECT * FROM Blog WHERE IDBlog = ?',
        [blogId]
      );

      const blog = updatedBlog[0];
      let seoData = null;
      if (blog.SEO) {
        try {
          seoData = JSON.parse(blog.SEO);
        } catch (e) {
          console.warn('Invalid SEO JSON data for blog:', blogId);
        }
      }

      const formattedBlog = {
        id: blog.IDBlog.toString(),
        title: blog.TieuDe,
        content: blog.NoiDung,
        publishDate: blog.NgayDang,
        author: blog.TacGia,
        status: blog.TrangThai,
        thumbnail: blog.AnhDaiDien,
        views: blog.LuotXem,
        seo: seoData
      };

      res.json({
        success: true,
        message: 'Cập nhật blog thành công',
        data: formattedBlog
      });

    } catch (error) {
      console.error('Update blog error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi cập nhật blog',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Xóa blog (chỉ admin)
  static async deleteBlog(req, res) {
    try {
      const blogId = req.params.id;

      // Kiểm tra blog có tồn tại không
      const blog = await executeQuery(
        'SELECT IDBlog FROM Blog WHERE IDBlog = ?',
        [blogId]
      );

      if (blog.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy blog'
        });
      }

      const result = await executeQuery(
        'DELETE FROM Blog WHERE IDBlog = ?',
        [blogId]
      );

      if (result.affectedRows > 0) {
        res.json({
          success: true,
          message: 'Xóa blog thành công'
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Không thể xóa blog'
        });
      }

    } catch (error) {
      console.error('Delete blog error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi xóa blog',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Lấy blog phổ biến (theo lượt xem)
  static async getPopularBlogs(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 5;

      const query = `
        SELECT IDBlog, TieuDe, LEFT(NoiDung, 150) as NoiDungTomTat, 
               NgayDang, TacGia, AnhDaiDien, LuotXem
        FROM Blog
        WHERE TrangThai = 'published'
        ORDER BY LuotXem DESC, NgayDang DESC
        LIMIT ?
      `;

      const blogs = await executeQuery(query, [limit]);

      const formattedBlogs = blogs.map(blog => ({
        id: blog.IDBlog.toString(),
        title: blog.TieuDe,
        excerpt: blog.NoiDungTomTat,
        publishDate: blog.NgayDang,
        author: blog.TacGia,
        thumbnail: blog.AnhDaiDien,
        views: blog.LuotXem
      }));

      res.json({
        success: true,
        message: 'Lấy blog phổ biến thành công',
        data: formattedBlogs
      });

    } catch (error) {
      console.error('Get popular blogs error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy blog phổ biến',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Lấy blog mới nhất
  static async getLatestBlogs(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 5;

      const query = `
        SELECT IDBlog, TieuDe, LEFT(NoiDung, 150) as NoiDungTomTat, 
               NgayDang, TacGia, AnhDaiDien, LuotXem
        FROM Blog
        WHERE TrangThai = 'published'
        ORDER BY NgayDang DESC
        LIMIT ?
      `;

      const blogs = await executeQuery(query, [limit]);

      const formattedBlogs = blogs.map(blog => ({
        id: blog.IDBlog.toString(),
        title: blog.TieuDe,
        excerpt: blog.NoiDungTomTat,
        publishDate: blog.NgayDang,
        author: blog.TacGia,
        thumbnail: blog.AnhDaiDien,
        views: blog.LuotXem
      }));

      res.json({
        success: true,
        message: 'Lấy blog mới nhất thành công',
        data: formattedBlogs
      });

    } catch (error) {
      console.error('Get latest blogs error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy blog mới nhất',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

// Validation rules
const createBlogValidation = [
  body('TieuDe')
    .trim()
    .isLength({ min: 10, max: 300 })
    .withMessage('Tiêu đề phải từ 10-300 ký tự'),
  body('NoiDung')
    .trim()
    .isLength({ min: 100 })
    .withMessage('Nội dung phải ít nhất 100 ký tự'),
  body('TacGia')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Tên tác giả phải từ 2-100 ký tự'),
  body('TrangThai')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Trạng thái không hợp lệ'),
  body('AnhDaiDien')
    .optional()
    .isURL()
    .withMessage('Link ảnh đại diện không hợp lệ')
];

const updateBlogValidation = [
  body('TieuDe')
    .optional()
    .trim()
    .isLength({ min: 10, max: 300 })
    .withMessage('Tiêu đề phải từ 10-300 ký tự'),
  body('NoiDung')
    .optional()
    .trim()
    .isLength({ min: 100 })
    .withMessage('Nội dung phải ít nhất 100 ký tự'),
  body('TacGia')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Tên tác giả phải từ 2-100 ký tự'),
  body('TrangThai')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Trạng thái không hợp lệ'),
  body('AnhDaiDien')
    .optional()
    .isURL()
    .withMessage('Link ảnh đại diện không hợp lệ')
];

module.exports = {
  BlogController,
  createBlogValidation,
  updateBlogValidation
};
