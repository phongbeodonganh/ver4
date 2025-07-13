const { body, validationResult } = require('express-validator');
const { executeQuery, executeTransaction } = require('../config/database');
const { getFileUrl, deleteFile } = require('../middlewares/upload');
const path = require('path');
const fs = require('fs');

class MediaController {
  // Upload media file
  static async uploadMedia(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Dữ liệu không hợp lệ',
          errors: errors.array()
        });
      }

      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Không có file nào được upload'
        });
      }

      const file = req.files.media || req.files.file;
      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'File media không tồn tại'
        });
      }

      // Determine file type
      const mimeType = file.mimetype;
      let fileType = 'document';
      if (mimeType.startsWith('image/')) fileType = 'image';
      else if (mimeType.startsWith('video/')) fileType = 'video';
      else if (mimeType.startsWith('audio/')) fileType = 'audio';

      // Generate unique filename
      const timestamp = Date.now();
      const fileExtension = path.extname(file.name);
      const fileName = `${timestamp}_${Math.random().toString(36).substring(7)}${fileExtension}`;
      
      // Determine upload directory
      const uploadDir = path.join(__dirname, '../uploads/media');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filePath = path.join(uploadDir, fileName);
      const relativePath = `/uploads/media/${fileName}`;
      const fileUrl = `${req.protocol}://${req.get('host')}${relativePath}`;

      // Move file to destination
      await file.mv(filePath);

      // Generate thumbnail for images and videos
      let thumbnailPath = null;
      if (fileType === 'image') {
        thumbnailPath = fileUrl; // Use original image as thumbnail for now
      }

      // Save to database
      const mediaData = {
        TenFile: fileName,
        TenGoc: file.name,
        LoaiFile: fileType,
        DuongDan: relativePath,
        Url: fileUrl,
        KichThuoc: file.size,
        MimeType: mimeType,
        Thumbnail: thumbnailPath,
        MoTa: req.body.description || '',
        Tags: req.body.tags ? JSON.stringify(req.body.tags.split(',').map(tag => tag.trim())) : '[]',
        ThuMuc: req.body.folder || 'general',
        NguoiTao: req.user.id
      };

      const result = await executeQuery(
        `INSERT INTO MediaLibrary (TenFile, TenGoc, LoaiFile, DuongDan, Url, KichThuoc, MimeType, Thumbnail, MoTa, Tags, ThuMuc, NguoiTao)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mediaData.TenFile, mediaData.TenGoc, mediaData.LoaiFile, mediaData.DuongDan,
          mediaData.Url, mediaData.KichThuoc, mediaData.MimeType, mediaData.Thumbnail,
          mediaData.MoTa, mediaData.Tags, mediaData.ThuMuc, mediaData.NguoiTao
        ]
      );

      // Log admin action
      await MediaController.logAdminAction(req.user.id, 'UPLOAD', 'MediaLibrary', result.insertId, {
        action: 'upload_media',
        file_name: file.name,
        file_size: file.size,
        file_type: fileType
      }, req);

      const responseData = {
        id: result.insertId,
        fileName: mediaData.TenFile,
        originalName: mediaData.TenGoc,
        fileType: mediaData.LoaiFile,
        url: mediaData.Url,
        thumbnail: mediaData.Thumbnail,
        size: mediaData.KichThuoc,
        mimeType: mediaData.MimeType,
        description: mediaData.MoTa,
        folder: mediaData.ThuMuc,
        uploadDate: new Date()
      };

      res.status(201).json({
        success: true,
        message: 'Upload media thành công',
        data: responseData
      });

    } catch (error) {
      console.error('Upload media error:', error.message);
      
      // Clean up uploaded file if error occurs
      if (req.files && req.files.media) {
        try {
          fs.unlinkSync(req.files.media.path);
        } catch (cleanupError) {
          console.error('Cleanup error:', cleanupError.message);
        }
      }

      res.status(500).json({
        success: false,
        message: 'Lỗi server khi upload media',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get all media with filters and pagination
  static async getAllMedia(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE ml.TrangThai = "active"';
      let params = [];

      // Filter by file type
      if (req.query.type) {
        whereClause += ' AND ml.LoaiFile = ?';
        params.push(req.query.type);
      }

      // Filter by folder
      if (req.query.folder) {
        whereClause += ' AND ml.ThuMuc = ?';
        params.push(req.query.folder);
      }

      // Search by name or description
      if (req.query.search) {
        whereClause += ' AND (ml.TenGoc LIKE ? OR ml.MoTa LIKE ?)';
        params.push(`%${req.query.search}%`, `%${req.query.search}%`);
      }

      // Filter by creator (admin only)
      if (req.query.creator && req.user.role === 'admin') {
        whereClause += ' AND ml.NguoiTao = ?';
        params.push(req.query.creator);
      }

      const query = `
        SELECT 
          ml.*,
          hv.TenHV as TenNguoiTao
        FROM MediaLibrary ml
        LEFT JOIN HocVien hv ON ml.NguoiTao = hv.IDHV
        ${whereClause}
        ORDER BY ml.NgayTao DESC
        LIMIT ? OFFSET ?
      `;

      params.push(limit, offset);
      const media = await executeQuery(query, params);

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM MediaLibrary ml
        ${whereClause}
      `;
      const countParams = params.slice(0, -2);
      const countResult = await executeQuery(countQuery, countParams);
      const total = countResult[0].total;

      // Parse JSON fields
      const processedMedia = media.map(item => ({
        ...item,
        Tags: item.Tags ? JSON.parse(item.Tags) : []
      }));

      res.json({
        success: true,
        message: 'Lấy danh sách media thành công',
        data: processedMedia,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Get media error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy danh sách media',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get media by ID
  static async getMediaById(req, res) {
    try {
      const mediaId = req.params.id;

      const query = `
        SELECT 
          ml.*,
          hv.TenHV as TenNguoiTao
        FROM MediaLibrary ml
        LEFT JOIN HocVien hv ON ml.NguoiTao = hv.IDHV
        WHERE ml.IDMedia = ? AND ml.TrangThai = 'active'
      `;

      const result = await executeQuery(query, [mediaId]);

      if (result.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy media'
        });
      }

      const media = {
        ...result[0],
        Tags: result[0].Tags ? JSON.parse(result[0].Tags) : []
      };

      res.json({
        success: true,
        message: 'Lấy thông tin media thành công',
        data: media
      });

    } catch (error) {
      console.error('Get media by ID error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy thông tin media',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Update media information
  static async updateMedia(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Dữ liệu không hợp lệ',
          errors: errors.array()
        });
      }

      const mediaId = req.params.id;
      const { description, tags, folder } = req.body;

      // Check if media exists
      const existingMedia = await executeQuery(
        'SELECT * FROM MediaLibrary WHERE IDMedia = ? AND TrangThai = "active"',
        [mediaId]
      );

      if (existingMedia.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy media'
        });
      }

      // Check permission
      if (req.user.role !== 'admin' && existingMedia[0].NguoiTao !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Không có quyền chỉnh sửa media này'
        });
      }

      const updateFields = [];
      const updateParams = [];

      if (description !== undefined) {
        updateFields.push('MoTa = ?');
        updateParams.push(description);
      }

      if (tags !== undefined) {
        const tagsArray = Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim());
        updateFields.push('Tags = ?');
        updateParams.push(JSON.stringify(tagsArray));
      }

      if (folder !== undefined) {
        updateFields.push('ThuMuc = ?');
        updateParams.push(folder);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Không có dữ liệu để cập nhật'
        });
      }

      updateParams.push(mediaId);

      await executeQuery(
        `UPDATE MediaLibrary SET ${updateFields.join(', ')}, NgayCapNhat = CURRENT_TIMESTAMP WHERE IDMedia = ?`,
        updateParams
      );

      // Log admin action
      await MediaController.logAdminAction(req.user.id, 'UPDATE', 'MediaLibrary', mediaId, {
        action: 'update_media',
        updated_fields: updateFields,
        media_name: existingMedia[0].TenGoc
      }, req);

      // Get updated media
      const updatedMedia = await executeQuery(
        'SELECT * FROM MediaLibrary WHERE IDMedia = ?',
        [mediaId]
      );

      res.json({
        success: true,
        message: 'Cập nhật media thành công',
        data: {
          ...updatedMedia[0],
          Tags: updatedMedia[0].Tags ? JSON.parse(updatedMedia[0].Tags) : []
        }
      });

    } catch (error) {
      console.error('Update media error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi cập nhật media',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Delete media
  static async deleteMedia(req, res) {
    try {
      const mediaId = req.params.id;

      // Get media info
      const media = await executeQuery(
        'SELECT * FROM MediaLibrary WHERE IDMedia = ? AND TrangThai = "active"',
        [mediaId]
      );

      if (media.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy media'
        });
      }

      const mediaData = media[0];

      // Check permission
      if (req.user.role !== 'admin' && mediaData.NguoiTao !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Không có quyền xóa media này'
        });
      }

      // Delete physical file
      const filePath = path.join(__dirname, '..', mediaData.DuongDan);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Soft delete in database
      await executeQuery(
        'UPDATE MediaLibrary SET TrangThai = "inactive", NgayCapNhat = CURRENT_TIMESTAMP WHERE IDMedia = ?',
        [mediaId]
      );

      // Log admin action
      await MediaController.logAdminAction(req.user.id, 'DELETE', 'MediaLibrary', mediaId, {
        action: 'delete_media',
        media_name: mediaData.TenGoc,
        file_size: mediaData.KichThuoc
      }, req);

      res.json({
        success: true,
        message: 'Xóa media thành công'
      });

    } catch (error) {
      console.error('Delete media error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi xóa media',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get media statistics
  static async getMediaStats(req, res) {
    try {
      const stats = await executeQuery(`
        SELECT 
          LoaiFile,
          COUNT(*) as SoLuong,
          SUM(KichThuoc) as TongDungLuong,
          AVG(KichThuoc) as DungLuongTrungBinh,
          SUM(LuotSuDung) as TongLuotSuDung
        FROM MediaLibrary 
        WHERE TrangThai = 'active'
        GROUP BY LoaiFile
      `);

      const totalStats = await executeQuery(`
        SELECT 
          COUNT(*) as TongSoFile,
          SUM(KichThuoc) as TongDungLuong,
          COUNT(DISTINCT NguoiTao) as SoNguoiTao
        FROM MediaLibrary 
        WHERE TrangThai = 'active'
      `);

      res.json({
        success: true,
        message: 'Lấy thống kê media thành công',
        data: {
          byType: stats,
          total: totalStats[0]
        }
      });

    } catch (error) {
      console.error('Get media stats error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy thống kê media',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Helper method to log admin actions
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
const uploadMediaValidation = [
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Mô tả không được vượt quá 500 ký tự'),
  body('folder')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Tên thư mục không được vượt quá 100 ký tự')
];

const updateMediaValidation = [
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Mô tả không được vượt quá 500 ký tự'),
  body('folder')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Tên thư mục không được vượt quá 100 ký tự')
];

module.exports = {
  MediaController,
  uploadMediaValidation,
  updateMediaValidation
};
