const { body, validationResult } = require('express-validator');
const { executeQuery } = require('../config/database');

class EnhancedNewsController {
  // Get all news with filters and pagination
  static async getAllNews(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE TrangThai = "published" AND HienThi = "public"';
      let params = [];

      if (req.query.type) {
        whereClause += ' AND LoaiNoiDung = ?';
        params.push(req.query.type);
      }

      if (req.query.featured === 'true') {
        whereClause += ' AND NoiBat = TRUE';
      }

      if (req.query.search) {
        whereClause += ' AND (TieuDe LIKE ? OR TomTat LIKE ?)';
        params.push(`%${req.query.search}%`, `%${req.query.search}%`);
      }

      if (req.user && req.user.role === 'admin') {
        whereClause = 'WHERE 1=1';
        params = [];

        if (req.query.status) {
          whereClause += ' AND TrangThai = ?';
          params.push(req.query.status);
        }

        if (req.query.visibility) {
          whereClause += ' AND HienThi = ?';
          params.push(req.query.visibility);
        }
      }

      const query = `
        SELECT *, 
          CASE WHEN Tags IS NOT NULL THEN Tags ELSE '[]' END as Tags,
          CASE WHEN SEO IS NOT NULL THEN SEO ELSE '{}' END as SEO
        FROM TinTuc
        ${whereClause}
        ORDER BY NoiBat DESC, NgayTao DESC
        LIMIT ? OFFSET ?
      `;

      params.push(limit, offset);
      const news = await executeQuery(query, params);

      const countQuery = `SELECT COUNT(*) as total FROM TinTuc ${whereClause}`;
      const countParams = params.slice(0, -2);
      const countResult = await executeQuery(countQuery, countParams);
      const total = countResult[0].total;

      const processedNews = news.map(item => ({
        ...item,
        Tags: item.Tags ? JSON.parse(item.Tags) : [],
        SEO: item.SEO ? JSON.parse(item.SEO) : {}
      }));

      res.json({
        success: true,
        message: 'Lấy danh sách tin tức thành công',
        data: processedNews,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Get all news error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy danh sách tin tức',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get news by ID or slug
  static async getNewsById(req, res) {
    try {
      const identifier = req.params.id;
      const isNumeric = /^\d+$/.test(identifier);
      const query = isNumeric
        ? 'SELECT * FROM TinTuc WHERE IDTinTuc = ? AND TrangThai = "published" AND HienThi = "public"'
        : 'SELECT * FROM TinTuc WHERE Slug = ? AND TrangThai = "published" AND HienThi = "public"';

      const result = await executeQuery(query, [identifier]);

      if (result.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy tin tức'
        });
      }

      await executeQuery('UPDATE TinTuc SET LuotXem = LuotXem + 1 WHERE IDTinTuc = ?', [result[0].IDTinTuc]);

      const news = {
        ...result[0],
        LuotXem: result[0].LuotXem + 1,
        Tags: result[0].Tags ? JSON.parse(result[0].Tags) : [],
        SEO: result[0].SEO ? JSON.parse(result[0].SEO) : {}
      };

      res.json({
        success: true,
        message: 'Lấy tin tức thành công',
        data: news
      });
    } catch (error) {
      console.error('Get news by ID error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy tin tức',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Create news (Admin only)
  static async createNews(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Dữ liệu không hợp lệ',
          errors: errors.array()
        });
      }

      const {
        title,
        content,
        summary,
        contentType = 'text',
        thumbnail,
        mediaUrl,
        author,
        status = 'draft',
        visibility = 'public',
        featured = false,
        tags = [],
        seo = {}
      } = req.body;

      const slug = EnhancedNewsController.generateSlug(title);

      const existingSlug = await executeQuery('SELECT IDTinTuc FROM TinTuc WHERE Slug = ?', [slug]);
      if (existingSlug.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Tiêu đề đã tồn tại, vui lòng chọn tiêu đề khác'
        });
      }

      const query = `
        INSERT INTO TinTuc (
          TieuDe, NoiDung, TomTat, LoaiNoiDung, Thumbnail, MediaUrl,
          TacGia, TrangThai, HienThi, NoiBat, Slug, Tags, SEO
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const result = await executeQuery(query, [
        title, content, summary, contentType, thumbnail, mediaUrl,
        author, status, visibility, featured, slug,
        JSON.stringify(tags), JSON.stringify(seo)
      ]);

      await EnhancedNewsController.logAdminAction(req.user.id, 'CREATE', 'TinTuc', result.insertId, {
        action: 'create_news',
        title: title,
        content_type: contentType,
        status: status
      }, req);

      const newNews = await executeQuery('SELECT * FROM TinTuc WHERE IDTinTuc = ?', [result.insertId]);

      res.status(201).json({
        success: true,
        message: 'Tạo tin tức thành công',
        data: {
          ...newNews[0],
          Tags: JSON.parse(newNews[0].Tags || '[]'),
          SEO: JSON.parse(newNews[0].SEO || '{}')
        }
      });
    } catch (error) {
      console.error('Create news error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi tạo tin tức',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Update news (Admin only)
  static async updateNews(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Dữ liệu không hợp lệ',
          errors: errors.array()
        });
      }

      const newsId = req.params.id;
      const {
        title, content, summary, contentType, thumbnail, mediaUrl,
        author, status, visibility, featured, tags, seo
      } = req.body;

      const existingNews = await executeQuery('SELECT * FROM TinTuc WHERE IDTinTuc = ?', [newsId]);
      if (existingNews.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy tin tức'
        });
      }

      const updateFields = [];
      const updateParams = [];

      if (title !== undefined) {
        updateFields.push('TieuDe = ?');
        updateParams.push(title);

        const slug = EnhancedNewsController.generateSlug(title);
        const existingSlug = await executeQuery('SELECT IDTinTuc FROM TinTuc WHERE Slug = ? AND IDTinTuc != ?', [slug, newsId]);
        if (existingSlug.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'Tiêu đề đã tồn tại, vui lòng chọn tiêu đề khác'
          });
        }
        updateFields.push('Slug = ?');
        updateParams.push(slug);
      }

      if (content !== undefined) {
        updateFields.push('NoiDung = ?');
        updateParams.push(content);
      }

      if (summary !== undefined) {
        updateFields.push('TomTat = ?');
        updateParams.push(summary);
      }

      if (contentType !== undefined) {
        updateFields.push('LoaiNoiDung = ?');
        updateParams.push(contentType);
      }

      if (thumbnail !== undefined) {
        updateFields.push('Thumbnail = ?');
        updateParams.push(thumbnail);
      }

      if (mediaUrl !== undefined) {
        updateFields.push('MediaUrl = ?');
        updateParams.push(mediaUrl);
      }

      if (author !== undefined) {
        updateFields.push('TacGia = ?');
        updateParams.push(author);
      }

      if (status !== undefined) {
        updateFields.push('TrangThai = ?');
        updateParams.push(status);
      }

      if (visibility !== undefined) {
        updateFields.push('HienThi = ?');
        updateParams.push(visibility);
      }

      if (featured !== undefined) {
        updateFields.push('NoiBat = ?');
        updateParams.push(featured);
      }

      if (tags !== undefined) {
        updateFields.push('Tags = ?');
        updateParams.push(JSON.stringify(tags));
      }

      if (seo !== undefined) {
        updateFields.push('SEO = ?');
        updateParams.push(JSON.stringify(seo));
      }

      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Không có dữ liệu để cập nhật'
        });
      }

      updateParams.push(newsId);

      const query = `UPDATE TinTuc SET ${updateFields.join(', ')}, NgayCapNhat = CURRENT_TIMESTAMP WHERE IDTinTuc = ?`;
      await executeQuery(query, updateParams);

      await EnhancedNewsController.logAdminAction(req.user.id, 'UPDATE', 'TinTuc', newsId, {
        action: 'update_news',
        title: existingNews[0].TieuDe,
        updated_fields: updateFields
      }, req);

      const updatedNews = await executeQuery('SELECT * FROM TinTuc WHERE IDTinTuc = ?', [newsId]);

      res.json({
        success: true,
        message: 'Cập nhật tin tức thành công',
        data: {
          ...updatedNews[0],
          Tags: JSON.parse(updatedNews[0].Tags || '[]'),
          SEO: JSON.parse(updatedNews[0].SEO || '{}')
        }
      });
    } catch (error) {
      console.error('Update news error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi cập nhật tin tức',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Delete news (Admin only)
  static async deleteNews(req, res) {
    try {
      const newsId = req.params.id;

      const existingNews = await executeQuery('SELECT * FROM TinTuc WHERE IDTinTuc = ?', [newsId]);
      if (existingNews.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy tin tức'
        });
      }

      await executeQuery('DELETE FROM TinTuc WHERE IDTinTuc = ?', [newsId]);

      await EnhancedNewsController.logAdminAction(req.user.id, 'DELETE', 'TinTuc', newsId, {
        action: 'delete_news',
        title: existingNews[0].TieuDe
      }, req);

      res.json({
        success: true,
        message: 'Xóa tin tức thành công'
      });
    } catch (error) {
      console.error('Delete news error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi xóa tin tức',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Helper to generate slug
  static generateSlug(title) {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  }

  // Helper to log admin actions
  static async logAdminAction(adminId, action, object, objectId, details, req) {
    try {
      await executeQuery(
        `INSERT INTO AdminLogs (IDAdmin, HanhDong, DoiTuong, IDDoiTuong, ChiTiet, IPAddress, UserAgent, KetQua)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'success')`,
        [
          adminId,
          action,
          object,
          objectId,
          JSON.stringify(details),
          req.ip || req.connection.remoteAddress,
          req.get('User-Agent') || ''
        ]
      );
    } catch (error) {
      console.error('Log admin action error:', error.message);
    }
  }
}

// Validation rules
const createNewsValidation = [
  body('title')
    .notEmpty()
    .withMessage('Tiêu đề không được để trống')
    .isLength({ max: 300 })
    .withMessage('Tiêu đề không được vượt quá 300 ký tự'),
  body('content')
    .notEmpty()
    .withMessage('Nội dung không được để trống'),
  body('summary')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Tóm tắt không được vượt quá 500 ký tự'),
  body('contentType')
    .optional()
    .isIn(['text', 'image', 'video'])
    .withMessage('Loại nội dung không hợp lệ'),
  body('author')
    .notEmpty()
    .withMessage('Tác giả không được để trống')
    .isLength({ max: 100 })
    .withMessage('Tác giả không được vượt quá 100 ký tự'),
  body('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Trạng thái không hợp lệ'),
  body('visibility')
    .optional()
    .isIn(['public', 'private'])
    .withMessage('Chế độ hiển thị không hợp lệ'),
  body('featured')
    .optional()
    .isBoolean()
    .withMessage('Trạng thái nổi bật không hợp lệ'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags phải là mảng'),
  body('seo')
    .optional()
    .isObject()
    .withMessage('SEO phải là đối tượng')
];

const updateNewsValidation = [
  body('title')
    .optional()
    .isLength({ max: 300 })
    .withMessage('Tiêu đề không được vượt quá 300 ký tự'),
  body('content')
    .optional()
    .withMessage('Nội dung không được để trống'),
  body('summary')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Tóm tắt không được vượt quá 500 ký tự'),
  body('contentType')
    .optional()
    .isIn(['text', 'image', 'video'])
    .withMessage('Loại nội dung không hợp lệ'),
  body('author')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Tác giả không được vượt quá 100 ký tự'),
  body('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Trạng thái không hợp lệ'),
  body('visibility')
    .optional()
    .isIn(['public', 'private'])
    .withMessage('Chế độ hiển thị không hợp lệ'),
  body('featured')
    .optional()
    .isBoolean()
    .withMessage('Trạng thái nổi bật không hợp lệ'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags phải là mảng'),
  body('seo')
    .optional()
    .isObject()
    .withMessage('SEO phải là đối tượng')
];

module.exports = {
  NewsController: EnhancedNewsController,
  createNewsValidation,
  updateNewsValidation
};
