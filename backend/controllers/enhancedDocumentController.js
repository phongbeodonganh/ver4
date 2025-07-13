const { body, validationResult } = require('express-validator');
const { executeQuery } = require('../config/database');
const { AdminLogsController } = require('./adminLogsController');
const path = require('path');
const fs = require('fs');

class EnhancedDocumentController {
  // Get public documents with enhanced filtering
  static async getPublicDocuments(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 12;
      const category = req.query.category;
      const search = req.query.search;
      const fileType = req.query.file_type; // pdf, docx, txt, etc.
      const sortBy = req.query.sort_by || 'created_at';
      const sortOrder = req.query.sort_order || 'DESC';
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE 1=1';
      let queryParams = [];

      // Filter by category
      if (category && category !== 'all') {
        whereClause += ' AND category = ?';
        queryParams.push(category);
      }

      // Search in title and description
      if (search) {
        whereClause += ' AND (title LIKE ? OR description LIKE ?)';
        queryParams.push(`%${search}%`, `%${search}%`);
      }

      // Filter by file type
      if (fileType) {
        whereClause += ' AND file_name LIKE ?';
        queryParams.push(`%.${fileType}`);
      }

      // Validate sort parameters
      const allowedSortColumns = ['created_at', 'title', 'download_count', 'file_size'];
      const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';
      const safeSortOrder = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM Documents ${whereClause}`;
      const countResult = await executeQuery(countQuery, queryParams);
      const total = countResult[0].total;

      // Get documents with creator info
      const documentsQuery = `
        SELECT 
          d.id,
          d.title,
          d.description,
          d.file_url,
          d.file_name,
          d.file_size,
          d.tags,
          d.category,
          d.download_count,
          d.created_at,
          d.updated_at,
          hv.TenHV as creator_name,
          CASE 
            WHEN d.file_name LIKE '%.pdf' THEN 'PDF'
            WHEN d.file_name LIKE '%.docx' OR d.file_name LIKE '%.doc' THEN 'Word'
            WHEN d.file_name LIKE '%.xlsx' OR d.file_name LIKE '%.xls' THEN 'Excel'
            WHEN d.file_name LIKE '%.pptx' OR d.file_name LIKE '%.ppt' THEN 'PowerPoint'
            WHEN d.file_name LIKE '%.txt' THEN 'Text'
            WHEN d.file_name LIKE '%.zip' OR d.file_name LIKE '%.rar' THEN 'Archive'
            ELSE 'Other'
          END as file_type_display,
          CASE 
            WHEN d.file_size < 1024 THEN CONCAT(d.file_size, ' B')
            WHEN d.file_size < 1048576 THEN CONCAT(ROUND(d.file_size/1024, 1), ' KB')
            WHEN d.file_size < 1073741824 THEN CONCAT(ROUND(d.file_size/1048576, 1), ' MB')
            ELSE CONCAT(ROUND(d.file_size/1073741824, 1), ' GB')
          END as file_size_display
        FROM Documents d
        LEFT JOIN HocVien hv ON d.created_by = hv.IDHV
        ${whereClause}
        ORDER BY d.${safeSortBy} ${safeSortOrder}
        LIMIT ? OFFSET ?
      `;

      const documents = await executeQuery(documentsQuery, [...queryParams, limit, offset]);

      // Parse JSON tags and process data
      const processedDocuments = documents.map(doc => ({
        ...doc,
        tags: doc.tags ? JSON.parse(doc.tags) : [],
        download_url: doc.file_url ? `${req.protocol}://${req.get('host')}/api/documents/download/${doc.id}` : null,
        preview_url: doc.file_url && doc.file_name && doc.file_name.toLowerCase().endsWith('.pdf') 
          ? `${req.protocol}://${req.get('host')}/api/documents/preview/${doc.id}` 
          : null
      }));

      // Get categories for filter
      const categoriesQuery = `
        SELECT DISTINCT category, COUNT(*) as count 
        FROM Documents 
        WHERE category IS NOT NULL 
        GROUP BY category 
        ORDER BY count DESC, category ASC
      `;
      const categories = await executeQuery(categoriesQuery);

      // Get file types for filter
      const fileTypesQuery = `
        SELECT 
          CASE 
            WHEN file_name LIKE '%.pdf' THEN 'pdf'
            WHEN file_name LIKE '%.docx' OR file_name LIKE '%.doc' THEN 'docx'
            WHEN file_name LIKE '%.xlsx' OR file_name LIKE '%.xls' THEN 'xlsx'
            WHEN file_name LIKE '%.pptx' OR file_name LIKE '%.ppt' THEN 'pptx'
            WHEN file_name LIKE '%.txt' THEN 'txt'
            WHEN file_name LIKE '%.zip' OR file_name LIKE '%.rar' THEN 'zip'
            ELSE 'other'
          END as file_type,
          COUNT(*) as count
        FROM Documents 
        WHERE file_name IS NOT NULL
        GROUP BY file_type
        ORDER BY count DESC
      `;
      const fileTypes = await executeQuery(fileTypesQuery);

      res.json({
        success: true,
        message: 'Lấy danh sách tài liệu công khai thành công',
        data: {
          documents: processedDocuments,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          },
          filters: {
            categories: categories.map(cat => ({
              value: cat.category,
              label: cat.category,
              count: cat.count
            })),
            fileTypes: fileTypes.map(type => ({
              value: type.file_type,
              label: type.file_type.toUpperCase(),
              count: type.count
            }))
          },
          sorting: {
            sortBy: safeSortBy,
            sortOrder: safeSortOrder,
            options: [
              { value: 'created_at', label: 'Ngày tạo' },
              { value: 'title', label: 'Tên tài liệu' },
              { value: 'download_count', label: 'Lượt tải' },
              { value: 'file_size', label: 'Kích thước' }
            ]
          }
        }
      });

    } catch (error) {
      console.error('Get public documents error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy danh sách tài liệu',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get document by ID with metadata
  static async getDocumentById(req, res) {
    try {
      const documentId = req.params.id;

      const documentQuery = `
        SELECT 
          d.*,
          hv.TenHV as creator_name,
          hv.Email as creator_email,
          CASE 
            WHEN d.file_name LIKE '%.pdf' THEN 'PDF'
            WHEN d.file_name LIKE '%.docx' OR d.file_name LIKE '%.doc' THEN 'Word'
            WHEN d.file_name LIKE '%.xlsx' OR d.file_name LIKE '%.xls' THEN 'Excel'
            WHEN d.file_name LIKE '%.pptx' OR d.file_name LIKE '%.ppt' THEN 'PowerPoint'
            WHEN d.file_name LIKE '%.txt' THEN 'Text'
            WHEN d.file_name LIKE '%.zip' OR d.file_name LIKE '%.rar' THEN 'Archive'
            ELSE 'Other'
          END as file_type_display,
          CASE 
            WHEN d.file_size < 1024 THEN CONCAT(d.file_size, ' B')
            WHEN d.file_size < 1048576 THEN CONCAT(ROUND(d.file_size/1024, 1), ' KB')
            WHEN d.file_size < 1073741824 THEN CONCAT(ROUND(d.file_size/1048576, 1), ' MB')
            ELSE CONCAT(ROUND(d.file_size/1073741824, 1), ' GB')
          END as file_size_display
        FROM Documents d
        LEFT JOIN HocVien hv ON d.created_by = hv.IDHV
        WHERE d.id = ?
      `;

      const result = await executeQuery(documentQuery, [documentId]);

      if (result.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy tài liệu'
        });
      }

      const document = result[0];

      // Get related documents (same category)
      const relatedQuery = `
        SELECT id, title, file_name, download_count, created_at
        FROM Documents 
        WHERE category = ? AND id != ? 
        ORDER BY download_count DESC, created_at DESC 
        LIMIT 5
      `;
      const relatedDocs = await executeQuery(relatedQuery, [document.category, documentId]);

      const responseData = {
        ...document,
        tags: document.tags ? JSON.parse(document.tags) : [],
        download_url: document.file_url ? `${req.protocol}://${req.get('host')}/api/documents/download/${document.id}` : null,
        preview_url: document.file_url && document.file_name && document.file_name.toLowerCase().endsWith('.pdf') 
          ? `${req.protocol}://${req.get('host')}/api/documents/preview/${document.id}` 
          : null,
        related_documents: relatedDocs
      };

      res.json({
        success: true,
        message: 'Lấy thông tin tài liệu thành công',
        data: responseData
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

  // Download document
  static async downloadDocument(req, res) {
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

      // Check if file exists
      if (!doc.file_url || !doc.file_name) {
        return res.status(404).json({
          success: false,
          message: 'File không tồn tại'
        });
      }

      // Construct file path
      const filePath = path.join(__dirname, '../uploads/documents', doc.file_name);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          message: 'File không tồn tại trên server'
        });
      }

      // Increment download count
      await executeQuery(
        'UPDATE Documents SET download_count = download_count + 1 WHERE id = ?',
        [documentId]
      );

      // Log download if user is authenticated
      if (req.user) {
        await AdminLogsController.logAction(
          req.user.id,
          'DOWNLOAD',
          'Documents',
          documentId,
          { 
            document_title: doc.title,
            file_name: doc.file_name,
            action: 'document_download'
          }
        );
      }

      // Set appropriate headers
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.title)}.${doc.file_name.split('.').pop()}"`);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Length', doc.file_size);

      // Stream file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);

    } catch (error) {
      console.error('Download document error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi tải tài liệu',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Preview document (for PDFs)
  static async previewDocument(req, res) {
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

      // Only allow preview for PDFs
      if (!doc.file_name || !doc.file_name.toLowerCase().endsWith('.pdf')) {
        return res.status(400).json({
          success: false,
          message: 'Chỉ hỗ trợ xem trước file PDF'
        });
      }

      // Construct file path
      const filePath = path.join(__dirname, '../uploads/documents', doc.file_name);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          message: 'File không tồn tại trên server'
        });
      }

      // Set headers for PDF preview
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.title)}.pdf"`);

      // Stream file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);

    } catch (error) {
      console.error('Preview document error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi xem trước tài liệu',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get document statistics
  static async getDocumentStats(req, res) {
    try {
      // Total documents
      const totalQuery = 'SELECT COUNT(*) as total FROM Documents';
      const totalResult = await executeQuery(totalQuery);

      // Documents by category
      const categoryQuery = `
        SELECT category, COUNT(*) as count, SUM(download_count) as total_downloads
        FROM Documents 
        GROUP BY category 
        ORDER BY count DESC
      `;
      const categoryStats = await executeQuery(categoryQuery);

      // Most downloaded documents
      const popularQuery = `
        SELECT id, title, download_count, created_at
        FROM Documents 
        ORDER BY download_count DESC 
        LIMIT 10
      `;
      const popularDocs = await executeQuery(popularQuery);

      // Recent uploads
      const recentQuery = `
        SELECT id, title, file_size, created_at
        FROM Documents 
        ORDER BY created_at DESC 
        LIMIT 10
      `;
      const recentDocs = await executeQuery(recentQuery);

      // File type distribution
      const fileTypeQuery = `
        SELECT 
          CASE 
            WHEN file_name LIKE '%.pdf' THEN 'PDF'
            WHEN file_name LIKE '%.docx' OR file_name LIKE '%.doc' THEN 'Word'
            WHEN file_name LIKE '%.xlsx' OR file_name LIKE '%.xls' THEN 'Excel'
            WHEN file_name LIKE '%.pptx' OR file_name LIKE '%.ppt' THEN 'PowerPoint'
            WHEN file_name LIKE '%.txt' THEN 'Text'
            ELSE 'Other'
          END as file_type,
          COUNT(*) as count,
          SUM(file_size) as total_size
        FROM Documents 
        WHERE file_name IS NOT NULL
        GROUP BY file_type
        ORDER BY count DESC
      `;
      const fileTypeStats = await executeQuery(fileTypeQuery);

      res.json({
        success: true,
        message: 'Lấy thống kê tài liệu thành công',
        data: {
          overview: {
            total_documents: totalResult[0].total,
            total_downloads: categoryStats.reduce((sum, cat) => sum + (cat.total_downloads || 0), 0)
          },
          by_category: categoryStats,
          popular_documents: popularDocs,
          recent_uploads: recentDocs,
          file_types: fileTypeStats.map(type => ({
            ...type,
            total_size_mb: Math.round(type.total_size / (1024 * 1024))
          }))
        }
      });

    } catch (error) {
      console.error('Get document stats error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy thống kê tài liệu',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Search documents with advanced filters
  static async searchDocuments(req, res) {
    try {
      const { q, category, file_type, min_size, max_size, date_from, date_to } = req.query;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 12;
      const offset = (page - 1) * limit;

      if (!q || q.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Từ khóa tìm kiếm phải có ít nhất 2 ký tự'
        });
      }

      let whereClause = 'WHERE (title LIKE ? OR description LIKE ? OR JSON_SEARCH(tags, "one", ?) IS NOT NULL)';
      let queryParams = [`%${q}%`, `%${q}%`, `%${q}%`];

      // Additional filters
      if (category) {
        whereClause += ' AND category = ?';
        queryParams.push(category);
      }

      if (file_type) {
        whereClause += ' AND file_name LIKE ?';
        queryParams.push(`%.${file_type}`);
      }

      if (min_size) {
        whereClause += ' AND file_size >= ?';
        queryParams.push(parseInt(min_size));
      }

      if (max_size) {
        whereClause += ' AND file_size <= ?';
        queryParams.push(parseInt(max_size));
      }

      if (date_from) {
        whereClause += ' AND DATE(created_at) >= ?';
        queryParams.push(date_from);
      }

      if (date_to) {
        whereClause += ' AND DATE(created_at) <= ?';
        queryParams.push(date_to);
      }

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM Documents ${whereClause}`;
      const countResult = await executeQuery(countQuery, queryParams);
      const total = countResult[0].total;

      // Search documents
      const searchQuery = `
        SELECT 
          d.*,
          hv.TenHV as creator_name,
          CASE 
            WHEN d.file_size < 1024 THEN CONCAT(d.file_size, ' B')
            WHEN d.file_size < 1048576 THEN CONCAT(ROUND(d.file_size/1024, 1), ' KB')
            WHEN d.file_size < 1073741824 THEN CONCAT(ROUND(d.file_size/1048576, 1), ' MB')
            ELSE CONCAT(ROUND(d.file_size/1073741824, 1), ' GB')
          END as file_size_display,
          -- Calculate relevance score
          (
            CASE WHEN title LIKE ? THEN 3 ELSE 0 END +
            CASE WHEN description LIKE ? THEN 2 ELSE 0 END +
            CASE WHEN JSON_SEARCH(tags, "one", ?) IS NOT NULL THEN 1 ELSE 0 END
          ) as relevance_score
        FROM Documents d
        LEFT JOIN HocVien hv ON d.created_by = hv.IDHV
        ${whereClause}
        ORDER BY relevance_score DESC, download_count DESC, created_at DESC
        LIMIT ? OFFSET ?
      `;

      const searchParams = [`%${q}%`, `%${q}%`, `%${q}%`, ...queryParams, limit, offset];
      const documents = await executeQuery(searchQuery, searchParams);

      // Process results
      const processedDocuments = documents.map(doc => ({
        ...doc,
        tags: doc.tags ? JSON.parse(doc.tags) : [],
        download_url: doc.file_url ? `${req.protocol}://${req.get('host')}/api/documents/download/${doc.id}` : null,
        preview_url: doc.file_url && doc.file_name && doc.file_name.toLowerCase().endsWith('.pdf') 
          ? `${req.protocol}://${req.get('host')}/api/documents/preview/${doc.id}` 
          : null
      }));

      res.json({
        success: true,
        message: 'Tìm kiếm tài liệu thành công',
        data: {
          query: q,
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
      console.error('Search documents error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi tìm kiếm tài liệu',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = {
  EnhancedDocumentController
};
