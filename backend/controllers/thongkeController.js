const { executeQuery } = require('../config/database');

class ThongKeController {
  // Get system overview statistics
  static async getSystemStats(req, res) {
    try {
      // Get basic counts
      const statsQueries = [
        // Total students
        'SELECT COUNT(*) as total_students FROM HocVien WHERE Role = "user"',
        
        // Total courses
        'SELECT COUNT(*) as total_courses FROM KhoaHoc',
        
        // Active courses
        'SELECT COUNT(*) as active_courses FROM KhoaHoc WHERE TrangThai = "active"',
        
        // Total documents
        'SELECT COUNT(*) as total_documents FROM Documents',
        
        // Total news
        'SELECT COUNT(*) as total_news FROM TinTuc',
        
        // Total media files
        'SELECT COUNT(*) as total_media FROM MediaLibrary',
        
        // Total transactions
        'SELECT COUNT(*) as total_transactions, SUM(GiaThucTe) as total_revenue FROM GiaoDichKhoaHoc WHERE TrangThaiTT = "completed"',
        
        // Total videos
        'SELECT COUNT(*) as total_videos FROM Video',
        
        // Storage usage
        'SELECT SUM(file_size) as total_storage FROM MediaLibrary',
        
        // Recent registrations (last 30 days)
        'SELECT COUNT(*) as recent_registrations FROM HocVien WHERE NgayDangKy >= DATE_SUB(NOW(), INTERVAL 30 DAY)',
        
        // Recent purchases (last 30 days)
        'SELECT COUNT(*) as recent_purchases, SUM(GiaThucTe) as recent_revenue FROM GiaoDichKhoaHoc WHERE NgayBan >= DATE_SUB(NOW(), INTERVAL 30 DAY) AND TrangThaiTT = "completed"'
      ];

      const results = await Promise.all(
        statsQueries.map(query => executeQuery(query))
      );

      const stats = {
        students: {
          total: results[0][0].total_students,
          recent: results[9][0].recent_registrations
        },
        courses: {
          total: results[1][0].total_courses,
          active: results[2][0].active_courses
        },
        content: {
          documents: results[3][0].total_documents,
          news: results[4][0].total_news,
          media: results[5][0].total_media,
          videos: results[7][0].total_videos
        },
        revenue: {
          total: results[6][0].total_revenue || 0,
          recent: results[10][0].recent_revenue || 0,
          transactions: results[6][0].total_transactions,
          recentTransactions: results[10][0].recent_purchases
        },
        storage: {
          totalBytes: results[8][0].total_storage || 0,
          totalMB: Math.round((results[8][0].total_storage || 0) / (1024 * 1024)),
          totalGB: Math.round((results[8][0].total_storage || 0) / (1024 * 1024 * 1024) * 100) / 100
        }
      };

      res.json({
        success: true,
        message: 'Lấy thống kê hệ thống thành công',
        data: stats
      });

    } catch (error) {
      console.error('Get system stats error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy thống kê hệ thống',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get course statistics
  static async getCourseStats(req, res) {
    try {
      // Top courses by enrollment
      const topCoursesQuery = `
        SELECT 
          kh.IDKH,
          kh.TenKH,
          kh.GiaKH,
          COUNT(DISTINCT gd.IDHV) as student_count,
          SUM(gd.GiaThucTe) as revenue,
          AVG(dg.DiemDanhGia) as avg_rating,
          COUNT(DISTINCT dg.ID) as rating_count
        FROM KhoaHoc kh
        LEFT JOIN GiaoDichKhoaHoc gd ON kh.IDKH = gd.IDKH AND gd.TrangThaiTT = 'completed'
        LEFT JOIN DanhGiaKhoaHoc dg ON kh.IDKH = dg.IDKH
        WHERE kh.TrangThai = 'active'
        GROUP BY kh.IDKH, kh.TenKH, kh.GiaKH
        ORDER BY student_count DESC
        LIMIT 10
      `;

      const topCourses = await executeQuery(topCoursesQuery);

      // Course completion rates
      const completionQuery = `
        SELECT 
          kh.IDKH,
          kh.TenKH,
          COUNT(DISTINCT gd.IDHV) as enrolled_students,
          COUNT(DISTINCT CASE WHEN td.DaHoanThanh = TRUE THEN td.IDHV END) as completed_students,
          ROUND(
            (COUNT(DISTINCT CASE WHEN td.DaHoanThanh = TRUE THEN td.IDHV END) * 100.0) / 
            NULLIF(COUNT(DISTINCT gd.IDHV), 0), 2
          ) as completion_rate
        FROM KhoaHoc kh
        LEFT JOIN GiaoDichKhoaHoc gd ON kh.IDKH = gd.IDKH AND gd.TrangThaiTT = 'completed'
        LEFT JOIN TienDoHoc td ON kh.IDKH = td.IDKH
        WHERE kh.TrangThai = 'active'
        GROUP BY kh.IDKH, kh.TenKH
        HAVING enrolled_students > 0
        ORDER BY completion_rate DESC
        LIMIT 10
      `;

      const completionRates = await executeQuery(completionQuery);

      // Monthly enrollment trends
      const enrollmentTrendQuery = `
        SELECT 
          DATE_FORMAT(gd.NgayBan, '%Y-%m') as month,
          COUNT(DISTINCT gd.IDHV) as new_enrollments,
          SUM(gd.GiaThucTe) as monthly_revenue
        FROM GiaoDichKhoaHoc gd
        WHERE gd.TrangThaiTT = 'completed' 
        AND gd.NgayBan >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
        GROUP BY DATE_FORMAT(gd.NgayBan, '%Y-%m')
        ORDER BY month DESC
      `;

      const enrollmentTrend = await executeQuery(enrollmentTrendQuery);

      res.json({
        success: true,
        message: 'Lấy thống kê khóa học thành công',
        data: {
          topCourses,
          completionRates,
          enrollmentTrend
        }
      });

    } catch (error) {
      console.error('Get course stats error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy thống kê khóa học',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get student statistics
  static async getStudentStats(req, res) {
    try {
      // Student registration trends
      const registrationTrendQuery = `
        SELECT 
          DATE_FORMAT(NgayDangKy, '%Y-%m') as month,
          COUNT(*) as new_registrations
        FROM HocVien 
        WHERE Role = 'user' 
        AND NgayDangKy >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
        GROUP BY DATE_FORMAT(NgayDangKy, '%Y-%m')
        ORDER BY month DESC
      `;

      const registrationTrend = await executeQuery(registrationTrendQuery);

      // Most active students
      const activeStudentsQuery = `
        SELECT 
          hv.IDHV,
          hv.TenHV,
          hv.Email,
          COUNT(DISTINCT gd.IDKH) as courses_purchased,
          SUM(gd.GiaThucTe) as total_spent,
          COUNT(DISTINCT td.IDBH) as lessons_completed
        FROM HocVien hv
        LEFT JOIN GiaoDichKhoaHoc gd ON hv.IDHV = gd.IDHV AND gd.TrangThaiTT = 'completed'
        LEFT JOIN TienDoHoc td ON hv.IDHV = td.IDHV AND td.DaHoanThanh = TRUE
        WHERE hv.Role = 'user'
        GROUP BY hv.IDHV, hv.TenHV, hv.Email
        HAVING courses_purchased > 0
        ORDER BY total_spent DESC, lessons_completed DESC
        LIMIT 10
      `;

      const activeStudents = await executeQuery(activeStudentsQuery);

      // Student engagement metrics
      const engagementQuery = `
        SELECT 
          AVG(courses_per_student) as avg_courses_per_student,
          AVG(lessons_completed) as avg_lessons_completed,
          AVG(total_spent) as avg_spending_per_student
        FROM (
          SELECT 
            hv.IDHV,
            COUNT(DISTINCT gd.IDKH) as courses_per_student,
            COUNT(DISTINCT td.IDBH) as lessons_completed,
            SUM(gd.GiaThucTe) as total_spent
          FROM HocVien hv
          LEFT JOIN GiaoDichKhoaHoc gd ON hv.IDHV = gd.IDHV AND gd.TrangThaiTT = 'completed'
          LEFT JOIN TienDoHoc td ON hv.IDHV = td.IDHV AND td.DaHoanThanh = TRUE
          WHERE hv.Role = 'user'
          GROUP BY hv.IDHV
        ) as student_metrics
      `;

      const engagement = await executeQuery(engagementQuery);

      res.json({
        success: true,
        message: 'Lấy thống kê học viên thành công',
        data: {
          registrationTrend,
          activeStudents,
          engagement: engagement[0]
        }
      });

    } catch (error) {
      console.error('Get student stats error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy thống kê học viên',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get media and storage statistics
  static async getMediaStats(req, res) {
    try {
      // Storage by file type
      const storageByTypeQuery = `
        SELECT 
          file_type,
          COUNT(*) as file_count,
          SUM(file_size) as total_size,
          AVG(file_size) as avg_size
        FROM MediaLibrary
        GROUP BY file_type
        ORDER BY total_size DESC
      `;

      const storageByType = await executeQuery(storageByTypeQuery);

      // Upload trends
      const uploadTrendQuery = `
        SELECT 
          DATE_FORMAT(created_at, '%Y-%m') as month,
          COUNT(*) as uploads_count,
          SUM(file_size) as total_size
        FROM MediaLibrary
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
        GROUP BY DATE_FORMAT(created_at, '%Y-%m')
        ORDER BY month DESC
      `;

      const uploadTrend = await executeQuery(uploadTrendQuery);

      // Most downloaded documents
      const popularDocumentsQuery = `
        SELECT 
          title,
          file_name,
          download_count,
          file_size,
          created_at
        FROM Documents
        ORDER BY download_count DESC
        LIMIT 10
      `;

      const popularDocuments = await executeQuery(popularDocumentsQuery);

      // Video processing statistics
      const videoStatsQuery = `
        SELECT 
          COUNT(*) as total_videos,
          AVG(duration) as avg_duration,
          SUM(file_size) as total_video_size,
          COUNT(CASE WHEN video_480p_path IS NOT NULL THEN 1 END) as videos_480p,
          COUNT(CASE WHEN video_720p_path IS NOT NULL THEN 1 END) as videos_720p,
          COUNT(CASE WHEN video_1080p_path IS NOT NULL THEN 1 END) as videos_1080p
        FROM Video
      `;

      const videoStats = await executeQuery(videoStatsQuery);

      res.json({
        success: true,
        message: 'Lấy thống kê media thành công',
        data: {
          storageByType: storageByType.map(item => ({
            ...item,
            total_size_mb: Math.round(item.total_size / (1024 * 1024)),
            avg_size_mb: Math.round(item.avg_size / (1024 * 1024))
          })),
          uploadTrend: uploadTrend.map(item => ({
            ...item,
            total_size_mb: Math.round(item.total_size / (1024 * 1024))
          })),
          popularDocuments,
          videoStats: videoStats[0] ? {
            ...videoStats[0],
            total_video_size_gb: Math.round(videoStats[0].total_video_size / (1024 * 1024 * 1024) * 100) / 100,
            avg_duration_minutes: Math.round(videoStats[0].avg_duration / 60)
          } : null
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

  // Get financial statistics
  static async getFinancialStats(req, res) {
    try {
      // Revenue trends
      const revenueTrendQuery = `
        SELECT 
          DATE_FORMAT(NgayBan, '%Y-%m') as month,
          COUNT(*) as transaction_count,
          SUM(GiaThucTe) as monthly_revenue,
          AVG(GiaThucTe) as avg_transaction_value
        FROM GiaoDichKhoaHoc
        WHERE TrangThaiTT = 'completed'
        AND NgayBan >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
        GROUP BY DATE_FORMAT(NgayBan, '%Y-%m')
        ORDER BY month DESC
      `;

      const revenueTrend = await executeQuery(revenueTrendQuery);

      // Top revenue courses
      const topRevenueCoursesQuery = `
        SELECT 
          kh.TenKH,
          kh.GiaKH,
          COUNT(gd.IDGD) as sales_count,
          SUM(gd.GiaThucTe) as total_revenue
        FROM KhoaHoc kh
        INNER JOIN GiaoDichKhoaHoc gd ON kh.IDKH = gd.IDKH
        WHERE gd.TrangThaiTT = 'completed'
        GROUP BY kh.IDKH, kh.TenKH, kh.GiaKH
        ORDER BY total_revenue DESC
        LIMIT 10
      `;

      const topRevenueCourses = await executeQuery(topRevenueCoursesQuery);

      // Payment method statistics (if available)
      const paymentStatsQuery = `
        SELECT 
          TrangThaiTT as status,
          COUNT(*) as count,
          SUM(GiaThucTe) as total_amount
        FROM GiaoDichKhoaHoc
        GROUP BY TrangThaiTT
      `;

      const paymentStats = await executeQuery(paymentStatsQuery);

      res.json({
        success: true,
        message: 'Lấy thống kê tài chính thành công',
        data: {
          revenueTrend,
          topRevenueCourses,
          paymentStats
        }
      });

    } catch (error) {
      console.error('Get financial stats error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy thống kê tài chính',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = {
  ThongKeController
};
