const { body, validationResult } = require('express-validator');
const { executeQuery } = require('../config/database');
const { getFileUrl, deleteFile } = require('../middlewares/upload');
const path = require('path');

class DocumentController {
  // Tạo tài liệu miễn phí mới (Admin only)
  static async createDocument(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Dữ liệu không hợp lệ',
          errors: errors.array()
        });
      }

      const { title, description, tags, category } = req.body;
      let fileUrl = null;
      let fileName = null;
      let fileSize = 0;

      // Nếu có file upload
      if (req.file) {
        fileUrl = getFileUrl(req, req.file.path);
        fileName = req.file.filename;
        fileSize = req.file.size;
      }

      const result = await executeQuery(
        `INSERT INTO Documents (title, description, file_url, file_name, file_size, tags, category, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [title, description, fileUrl, fileName, fileSize, JSON.stringify(tags || []), category || 'general', req.user.id]
      );

      res.status(201).json({
        success: true,
        message: 'Tạo tài liệu thành công',
        data: {
          id: result.insertId,
          title,
          description,
          fileUrl,
          fileName,
          fileSize,
          tags: tags || [],
          category: category || 'general',
          createdAt: new Date()
        }
      });

    } catch (error) {
      console.error('Create document error:', error.message);
      
      // Xóa file nếu có lỗi
      if (req.file) {
        deleteFile(req.file.path);
      }

      res.status(500).json({
        success: false,
        message: 'Lỗi server khi tạo tài liệu',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Lấy danh sách tài liệu (Public)
  static async getAllDocuments(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const category = req.query.category;
      const search = req.query.search;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE 1=1';
      let queryParams = [];

      if (category) {
        whereClause += ' AND category = ?';
        queryParams.push(category);
      }

      if (search) {
        whereClause += ' AND (title LIKE ? OR description LIKE ?)';
        queryParams.push(`%${search}%`, `%${search}%`);
      }

      // Lấy tổng số tài liệu
      const countQuery = `SELECT COUNT(*) as total FROM Documents ${whereClause}`;
      const countResult = await executeQuery(countQuery, queryParams);
      const total = countResult[0].total;

      // Lấy danh sách tài liệu
      const documentsQuery = `
        SELECT 
          id, title, description, file_url, file_name, file_size, 
          tags, category, download_count, created_at
        FROM Documents 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `;

      const documents = await executeQuery(documentsQuery, [...queryParams, limit, offset]);

      // Parse JSON tags
      const processedDocuments = documents.map(doc => ({
        ...doc,
        tags: doc.tags ? JSON.parse(doc.tags) : []
      }));

      res.json({
        success: true,
        message: 'Lấy danh sách tài liệu thành công',
        data: {
          documents: processedDocuments,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        }
      });

    } catch (error) {
      console.error('Get documents error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy danh sách tài liệu',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Lấy tài liệu theo ID (Public)
  static async getDocumentById(req, res) {
    try {
      const documentId = req.params.id;

      const document = await executeQuery(
        'SELECT * FROM Documents WHERE id = ?',
        [documentId]
      );

      if (document.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy tài liệu'
        });
      }

      const doc = document[0];

      res.json({
        success: true,
        message: 'Lấy thông tin tài liệu thành công',
        data: {
          ...doc,
          tags: doc.tags ? JSON.parse(doc.tags) : []
        }
      });

    } catch (error) {
      console.error('Get document by ID error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy thông tin tài liệu',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Cập nhật tài liệu (Admin only)
  static async updateDocument(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Dữ liệu không hợp lệ',
          errors: errors.array()
        });
      }

      const documentId = req.params.id;
      const { title, description, tags, category } = req.body;

      // Kiểm tra tài liệu có tồn tại không
      const existingDoc = await executeQuery(
        'SELECT * FROM Documents WHERE id = ?',
        [documentId]
      );

      if (existingDoc.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy tài liệu'
        });
      }

      let updateData = {
        title: title || existingDoc[0].title,
        description: description || existingDoc[0].description,
        tags: JSON.stringify(tags || JSON.parse(existingDoc[0].tags || '[]')),
        category: category || existingDoc[0].category
      };

      // Nếu có file mới
      if (req.file) {
        // Xóa file cũ
        if (existingDoc[0].file_name) {
          deleteFile(path.join(__dirname, '../uploads/documents', existingDoc[0].file_name));
        }

        updateData.file_url = getFileUrl(req, req.file.path);
        updateData.file_name = req.file.filename;
        updateData.file_size = req.file.size;
      }

      await executeQuery(
        `UPDATE Documents SET 
         title = ?, description = ?, file_url = ?, file_name = ?, file_size = ?, 
         tags = ?, category = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          updateData.title, updateData.description, 
          updateData.file_url || existingDoc[0].file_url,
          updateData.file_name || existingDoc[0].file_name,
          updateData.file_size || existingDoc[0].file_size,
          updateData.tags, updateData.category, documentId
        ]
      );

      res.json({
        success: true,
        message: 'Cập nhật tài liệu thành công',
        data: {
          id: documentId,
          ...updateData,
          tags: JSON.parse(updateData.tags)
        }
      });

    } catch (error) {
      console.error('Update document error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi cập nhật tài liệu',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Xóa tài liệu (Admin only)
  static async deleteDocument(req, res) {
    try {
      const documentId = req.params.id;

      // Lấy thông tin tài liệu
      const document = await executeQuery(
        'SELECT * FROM Documents WHERE id = ?',
        [documentId]
      );

      if (document.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy tài liệu'
        });
      }

      const doc = document[0];

      // Xóa file
      if (doc.file_name) {
        deleteFile(path.join(__dirname, '../uploads/documents', doc.file_name));
      }

      // Xóa record trong database
      await executeQuery('DELETE FROM Documents WHERE id = ?', [documentId]);

      res.json({
        success: true,
        message: 'Xóa tài liệu thành công'
      });

    } catch (error) {
      console.error('Delete document error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi xóa tài liệu',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Tăng số lượt tải xuống
  static async incrementDownload(req, res) {
    try {
      const documentId = req.params.id;

      await executeQuery(
        'UPDATE Documents SET download_count = download_count + 1 WHERE id = ?',
        [documentId]
      );

      res.json({
        success: true,
        message: 'Cập nhật lượt tải xuống thành công'
      });

    } catch (error) {
      console.error('Increment download error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Lấy danh sách categories
  static async getCategories(req, res) {
    try {
      const categories = await executeQuery(
        'SELECT DISTINCT category FROM Documents WHERE category IS NOT NULL ORDER BY category'
      );

      res.json({
        success: true,
        message: 'Lấy danh sách danh mục thành công',
        data: categories.map(cat => cat.category)
      });

    } catch (error) {
      console.error('Get categories error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy danh mục',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

// Validation rules
const createDocumentValidation = [
  body('title')
    .notEmpty()
    .withMessage('Tiêu đề không được để trống')
    .isLength({ min: 1, max: 200 })
    .withMessage('Tiêu đề phải từ 1-200 ký tự'),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Mô tả không được quá 1000 ký tự'),
  body('category')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Danh mục không được quá 50 ký tự'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags phải là mảng')
];

const updateDocumentValidation = [
  body('title')
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage('Tiêu đề phải từ 1-200 ký tự'),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Mô tả không được quá 1000 ký tự'),
  body('category')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Danh mục không được quá 50 ký tự'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags phải là mảng')
];

module.exports = {
  DocumentController,
  createDocumentValidation,
  updateDocumentValidation
};
