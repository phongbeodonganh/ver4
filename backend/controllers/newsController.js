const { body, validationResult } = require('express-validator');
const { executeQuery } = require('../config/database');
const path = require('path');
const fs = require('fs');

class NewsController {
  // Get all news articles (public)
  static async getAllNews(req, res) {
    try {
      const { page = 1, limit = 10, category = '', search = '' } = req.query;
      const offset = (page - 1) * limit;

      let whereClause = "WHERE status = 'published'";
      const queryParams = [];

      if (category) {
        whereClause += " AND category = ?";
        queryParams.push(category);
      }

      if (search) {
        whereClause += " AND (title LIKE ? OR content LIKE ?)";
        queryParams.push(`%${search}%`, `%${search}%`);
      }

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM news ${whereClause}`;
      const countResult = await executeQuery(countQuery, queryParams);
      const total = countResult[0]?.total || 0;

      // Get news articles
      const query = `
        SELECT id, title, excerpt, content, featured_image, category, 
               author, status, created_at, updated_at, views
        FROM news 
        ${whereClause}
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `;
      
      queryParams.push(parseInt(limit), parseInt(offset));
      const news = await executeQuery(query, queryParams);

      res.status(200).json({
        success: true,
        message: 'Lấy danh sách tin tức thành công',
        data: {
          news,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            totalItems: total,
            hasNext: offset + parseInt(limit) < total,
            hasPrev: offset > 0
          }
        }
      });

    } catch (error) {
      console.error('Get all news error:', error.message);
      
      // Fallback to JSON file if database fails
      try {
        const newsFile = path.join(__dirname, '../data/news.json');
        let news = [];
        
        if (fs.existsSync(newsFile)) {
          const newsData = fs.readFileSync(newsFile, 'utf8');
          news = JSON.parse(newsData).filter(item => item.status === 'published');
        }

        res.status(200).json({
          success: true,
          message: 'Lấy danh sách tin tức thành công (từ file)',
          data: {
            news: news.slice(0, parseInt(req.query.limit) || 10),
            pagination: {
              currentPage: 1,
              totalPages: 1,
              totalItems: news.length,
              hasNext: false,
              hasPrev: false
            }
          }
        });
      } catch (fileError) {
        res.status(500).json({
          success: false,
          message: 'Lỗi server khi lấy tin tức',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    }
  }

  // Get single news article (public)
  static async getNewsById(req, res) {
    try {
      const { id } = req.params;

      // Increment view count
      await executeQuery('UPDATE news SET views = views + 1 WHERE id = ?', [id]);

      const query = `
        SELECT id, title, excerpt, content, featured_image, category, 
               author, status, created_at, updated_at, views
        FROM news 
        WHERE id = ? AND status = 'published'
      `;
      
      const result = await executeQuery(query, [id]);
      
      if (result.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy bài viết'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Lấy bài viết thành công',
        data: result[0]
      });

    } catch (error) {
      console.error('Get news by ID error:', error.message);
      
      // Fallback to JSON file
      try {
        const newsFile = path.join(__dirname, '../data/news.json');
        if (fs.existsSync(newsFile)) {
          const newsData = fs.readFileSync(newsFile, 'utf8');
          const news = JSON.parse(newsData);
          const article = news.find(item => item.id === parseInt(req.params.id) && item.status === 'published');
          
          if (article) {
            return res.status(200).json({
              success: true,
              message: 'Lấy bài viết thành công (từ file)',
              data: article
            });
          }
        }
        
        res.status(404).json({
          success: false,
          message: 'Không tìm thấy bài viết'
        });
      } catch (fileError) {
        res.status(500).json({
          success: false,
          message: 'Lỗi server khi lấy bài viết',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    }
  }

  // Get featured news (public)
  static async getFeaturedNews(req, res) {
    try {
      const { limit = 5 } = req.query;

      const query = `
        SELECT id, title, excerpt, featured_image, category, 
               author, created_at, views
        FROM news 
        WHERE status = 'published' AND featured = 1
        ORDER BY created_at DESC 
        LIMIT ?
      `;
      
      const news = await executeQuery(query, [parseInt(limit)]);

      res.status(200).json({
        success: true,
        message: 'Lấy tin tức nổi bật thành công',
        data: news
      });

    } catch (error) {
      console.error('Get featured news error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy tin tức nổi bật',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Create news article (Admin only)
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
        excerpt,
        content,
        featured_image,
        category,
        status = 'draft',
        featured = false
      } = req.body;

      const author = req.user.name || req.user.email;

      try {
        const query = `
          INSERT INTO news (title, excerpt, content, featured_image, category, author, status, featured, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `;
        
        const result = await executeQuery(query, [
          title, excerpt, content, featured_image, category, author, status, featured
        ]);

        const newArticle = {
          id: result.insertId,
          title,
          excerpt,
          content,
          featured_image,
          category,
          author,
          status,
          featured,
          created_at: new Date(),
          updated_at: new Date(),
          views: 0
        };

        res.status(201).json({
          success: true,
          message: 'Tạo bài viết thành công',
          data: newArticle
        });

      } catch (dbError) {
        // Fallback to JSON file
        const newsFile = path.join(__dirname, '../data/news.json');
        let news = [];
        
        if (fs.existsSync(newsFile)) {
          const newsData = fs.readFileSync(newsFile, 'utf8');
          news = JSON.parse(newsData);
        } else {
          // Create data directory if it doesn't exist
          const dataDir = path.dirname(newsFile);
          if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
          }
        }

        const newArticle = {
          id: news.length > 0 ? Math.max(...news.map(n => n.id)) + 1 : 1,
          title,
          excerpt,
          content,
          featured_image,
          category,
          author,
          status,
          featured: Boolean(featured),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          views: 0
        };

        news.push(newArticle);
        fs.writeFileSync(newsFile, JSON.stringify(news, null, 2));

        res.status(201).json({
          success: true,
          message: 'Tạo bài viết thành công (lưu vào file)',
          data: newArticle
        });
      }

    } catch (error) {
      console.error('Create news error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi tạo bài viết',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Update news article (Admin only)
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

      const { id } = req.params;
      const {
        title,
        excerpt,
        content,
        featured_image,
        category,
        status,
        featured
      } = req.body;

      try {
        const query = `
          UPDATE news 
          SET title = ?, excerpt = ?, content = ?, featured_image = ?, 
              category = ?, status = ?, featured = ?, updated_at = NOW()
          WHERE id = ?
        `;
        
        const result = await executeQuery(query, [
          title, excerpt, content, featured_image, category, status, featured, id
        ]);

        if (result.affectedRows === 0) {
          return res.status(404).json({
            success: false,
            message: 'Không tìm thấy bài viết'
          });
        }

        res.status(200).json({
          success: true,
          message: 'Cập nhật bài viết thành công'
        });

      } catch (dbError) {
        // Fallback to JSON file
        const newsFile = path.join(__dirname, '../data/news.json');
        if (fs.existsSync(newsFile)) {
          const newsData = fs.readFileSync(newsFile, 'utf8');
          const news = JSON.parse(newsData);
          const articleIndex = news.findIndex(item => item.id === parseInt(id));
          
          if (articleIndex === -1) {
            return res.status(404).json({
              success: false,
              message: 'Không tìm thấy bài viết'
            });
          }

          news[articleIndex] = {
            ...news[articleIndex],
            title,
            excerpt,
            content,
            featured_image,
            category,
            status,
            featured: Boolean(featured),
            updated_at: new Date().toISOString()
          };

          fs.writeFileSync(newsFile, JSON.stringify(news, null, 2));

          res.status(200).json({
            success: true,
            message: 'Cập nhật bài viết thành công (file)'
          });
        } else {
          throw new Error('Không tìm thấy dữ liệu');
        }
      }

    } catch (error) {
      console.error('Update news error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi cập nhật bài viết',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Delete news article (Admin only)
  static async deleteNews(req, res) {
    try {
      const { id } = req.params;

      try {
        const result = await executeQuery('DELETE FROM news WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
          return res.status(404).json({
            success: false,
            message: 'Không tìm thấy bài viết'
          });
        }

        res.status(200).json({
          success: true,
          message: 'Xóa bài viết thành công'
        });

      } catch (dbError) {
        // Fallback to JSON file
        const newsFile = path.join(__dirname, '../data/news.json');
        if (fs.existsSync(newsFile)) {
          const newsData = fs.readFileSync(newsFile, 'utf8');
          const news = JSON.parse(newsData);
          const filteredNews = news.filter(item => item.id !== parseInt(id));
          
          if (filteredNews.length === news.length) {
            return res.status(404).json({
              success: false,
              message: 'Không tìm thấy bài viết'
            });
          }

          fs.writeFileSync(newsFile, JSON.stringify(filteredNews, null, 2));

          res.status(200).json({
            success: true,
            message: 'Xóa bài viết thành công (file)'
          });
        } else {
          throw new Error('Không tìm thấy dữ liệu');
        }
      }

    } catch (error) {
      console.error('Delete news error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi xóa bài viết',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get all news for admin (includes drafts)
  static async getAdminNews(req, res) {
    try {
      const { page = 1, limit = 10, status = '', search = '' } = req.query;
      const offset = (page - 1) * limit;

      let whereClause = "WHERE 1=1";
      const queryParams = [];

      if (status) {
        whereClause += " AND status = ?";
        queryParams.push(status);
      }

      if (search) {
        whereClause += " AND (title LIKE ? OR content LIKE ?)";
        queryParams.push(`%${search}%`, `%${search}%`);
      }

      try {
        // Get total count
        const countQuery = `SELECT COUNT(*) as total FROM news ${whereClause}`;
        const countResult = await executeQuery(countQuery, queryParams);
        const total = countResult[0]?.total || 0;

        // Get news articles
        const query = `
          SELECT id, title, excerpt, content, featured_image, category, 
                 author, status, featured, created_at, updated_at, views
          FROM news 
          ${whereClause}
          ORDER BY created_at DESC 
          LIMIT ? OFFSET ?
        `;
        
        queryParams.push(parseInt(limit), parseInt(offset));
        const news = await executeQuery(query, queryParams);

        res.status(200).json({
          success: true,
          message: 'Lấy danh sách tin tức admin thành công',
          data: {
            news,
            pagination: {
              currentPage: parseInt(page),
              totalPages: Math.ceil(total / limit),
              totalItems: total,
              hasNext: offset + parseInt(limit) < total,
              hasPrev: offset > 0
            }
          }
        });

      } catch (dbError) {
        // Fallback to JSON file
        const newsFile = path.join(__dirname, '../data/news.json');
        let news = [];
        
        if (fs.existsSync(newsFile)) {
          const newsData = fs.readFileSync(newsFile, 'utf8');
          news = JSON.parse(newsData);
        }

        res.status(200).json({
          success: true,
          message: 'Lấy danh sách tin tức admin thành công (từ file)',
          data: {
            news: news.slice(0, parseInt(limit)),
            pagination: {
              currentPage: 1,
              totalPages: 1,
              totalItems: news.length,
              hasNext: false,
              hasPrev: false
            }
          }
        });
      }

    } catch (error) {
      console.error('Get admin news error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy tin tức admin',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

// Validation rules
const createNewsValidation = [
  body('title')
    .notEmpty()
    .withMessage('Tiêu đề không được để trống')
    .isLength({ min: 5, max: 200 })
    .withMessage('Tiêu đề phải từ 5-200 ký tự'),
  body('excerpt')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Tóm tắt không được quá 500 ký tự'),
  body('content')
    .notEmpty()
    .withMessage('Nội dung không được để trống')
    .isLength({ min: 50 })
    .withMessage('Nội dung phải có ít nhất 50 ký tự'),
  body('category')
    .notEmpty()
    .withMessage('Danh mục không được để trống')
    .isIn(['technology', 'education', 'business', 'lifestyle', 'other'])
    .withMessage('Danh mục không hợp lệ'),
  body('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Trạng thái không hợp lệ'),
  body('featured')
    .optional()
    .isBoolean()
    .withMessage('Featured phải là boolean')
];

const updateNewsValidation = [
  body('title')
    .optional()
    .isLength({ min: 5, max: 200 })
    .withMessage('Tiêu đề phải từ 5-200 ký tự'),
  body('excerpt')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Tóm tắt không được quá 500 ký tự'),
  body('content')
    .optional()
    .isLength({ min: 50 })
    .withMessage('Nội dung phải có ít nhất 50 ký tự'),
  body('category')
    .optional()
    .isIn(['technology', 'education', 'business', 'lifestyle', 'other'])
    .withMessage('Danh mục không hợp lệ'),
  body('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Trạng thái không hợp lệ'),
  body('featured')
    .optional()
    .isBoolean()
    .withMessage('Featured phải là boolean')
];

module.exports = {
  NewsController,
  createNewsValidation,
  updateNewsValidation
};
