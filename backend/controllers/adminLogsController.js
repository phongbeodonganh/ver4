const { body, validationResult } = require('express-validator');
const { executeQuery } = require('../config/database');

class AdminLogsController {
  // Log admin action (internal function)
  static async logAction(adminId, action, targetType, targetId, details = null) {
    try {
      await executeQuery(
        `INSERT INTO AdminLogs (admin_id, action, target_type, target_id, details, ip_address, user_agent)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [adminId, action, targetType, targetId, JSON.stringify(details), null, null]
      );
    } catch (error) {
      console.error('Error logging admin action:', error);
      // Don't throw error to avoid breaking main operations
    }
  }

  // Get admin logs with filtering and pagination
  static async getAdminLogs(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const adminId = req.query.admin_id;
      const action = req.query.action;
      const targetType = req.query.target_type;
      const startDate = req.query.start_date;
      const endDate = req.query.end_date;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE 1=1';
      let queryParams = [];

      if (adminId) {
        whereClause += ' AND al.admin_id = ?';
        queryParams.push(adminId);
      }

      if (action) {
        whereClause += ' AND al.action = ?';
        queryParams.push(action);
      }

      if (targetType) {
        whereClause += ' AND al.target_type = ?';
        queryParams.push(targetType);
      }

      if (startDate) {
        whereClause += ' AND DATE(al.created_at) >= ?';
        queryParams.push(startDate);
      }

      if (endDate) {
        whereClause += ' AND DATE(al.created_at) <= ?';
        queryParams.push(endDate);
      }

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM AdminLogs al 
        ${whereClause}
      `;
      const countResult = await executeQuery(countQuery, queryParams);
      const total = countResult[0].total;

      // Get logs with admin info
      const logsQuery = `
        SELECT 
          al.*,
          hv.TenHV as admin_name,
          hv.Email as admin_email
        FROM AdminLogs al
        LEFT JOIN HocVien hv ON al.admin_id = hv.IDHV
        ${whereClause}
        ORDER BY al.created_at DESC
        LIMIT ? OFFSET ?
      `;

      const logs = await executeQuery(logsQuery, [...queryParams, limit, offset]);

      // Parse JSON details
      const processedLogs = logs.map(log => ({
        ...log,
        details: log.details ? JSON.parse(log.details) : null
      }));

      res.json({
        success: true,
        message: 'Lấy danh sách log admin thành công',
        data: {
          logs: processedLogs,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        }
      });

    } catch (error) {
      console.error('Get admin logs error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy danh sách log admin',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get admin actions summary
  static async getActionsSummary(req, res) {
    try {
      const days = parseInt(req.query.days) || 30;

      const summaryQuery = `
        SELECT 
          al.action,
          al.target_type,
          COUNT(*) as count,
          DATE(al.created_at) as date
        FROM AdminLogs al
        WHERE al.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY al.action, al.target_type, DATE(al.created_at)
        ORDER BY date DESC, count DESC
      `;

      const summary = await executeQuery(summaryQuery, [days]);

      // Get top admins by activity
      const topAdminsQuery = `
        SELECT 
          hv.TenHV as admin_name,
          hv.Email as admin_email,
          COUNT(*) as total_actions
        FROM AdminLogs al
        LEFT JOIN HocVien hv ON al.admin_id = hv.IDHV
        WHERE al.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY al.admin_id, hv.TenHV, hv.Email
        ORDER BY total_actions DESC
        LIMIT 10
      `;

      const topAdmins = await executeQuery(topAdminsQuery, [days]);

      res.json({
        success: true,
        message: 'Lấy thống kê hoạt động admin thành công',
        data: {
          summary,
          topAdmins,
          period: `${days} ngày qua`
        }
      });

    } catch (error) {
      console.error('Get actions summary error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy thống kê hoạt động admin',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get logs by target (e.g., all actions on a specific course)
  static async getLogsByTarget(req, res) {
    try {
      const { targetType, targetId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      const logsQuery = `
        SELECT 
          al.*,
          hv.TenHV as admin_name,
          hv.Email as admin_email
        FROM AdminLogs al
        LEFT JOIN HocVien hv ON al.admin_id = hv.IDHV
        WHERE al.target_type = ? AND al.target_id = ?
        ORDER BY al.created_at DESC
        LIMIT ? OFFSET ?
      `;

      const logs = await executeQuery(logsQuery, [targetType, targetId, limit, offset]);

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM AdminLogs 
        WHERE target_type = ? AND target_id = ?
      `;
      const countResult = await executeQuery(countQuery, [targetType, targetId]);
      const total = countResult[0].total;

      // Parse JSON details
      const processedLogs = logs.map(log => ({
        ...log,
        details: log.details ? JSON.parse(log.details) : null
      }));

      res.json({
        success: true,
        message: 'Lấy lịch sử thao tác thành công',
        data: {
          logs: processedLogs,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        }
      });

    } catch (error) {
      console.error('Get logs by target error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy lịch sử thao tác',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Delete old logs (cleanup)
  static async cleanupOldLogs(req, res) {
    try {
      const days = parseInt(req.body.days) || 90; // Default: keep 90 days

      const result = await executeQuery(
        'DELETE FROM AdminLogs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
        [days]
      );

      // Log this cleanup action
      await AdminLogsController.logAction(
        req.user.id,
        'CLEANUP',
        'AdminLogs',
        null,
        { deletedCount: result.affectedRows, daysKept: days }
      );

      res.json({
        success: true,
        message: `Đã xóa ${result.affectedRows} log cũ (giữ lại ${days} ngày gần nhất)`,
        data: {
          deletedCount: result.affectedRows,
          daysKept: days
        }
      });

    } catch (error) {
      console.error('Cleanup old logs error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi dọn dẹp log cũ',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

// Validation rules
const cleanupLogsValidation = [
  body('days')
    .isInt({ min: 1, max: 365 })
    .withMessage('Số ngày phải từ 1-365')
];

module.exports = {
  AdminLogsController,
  cleanupLogsValidation
};
