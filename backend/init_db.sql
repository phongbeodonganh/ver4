-- LinhMai Academy Database Schema
-- Tạo database và các bảng theo metadata yêu cầu

CREATE DATABASE IF NOT EXISTS linhmai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE linhmai;

-- Bảng Nhân Viên Sale
CREATE TABLE NhanVienSale (
    IDNV INT PRIMARY KEY AUTO_INCREMENT,
    TenNV VARCHAR(100) NOT NULL,
    EmailNV VARCHAR(100) UNIQUE NOT NULL,
    SoHV INT DEFAULT 0,
    NgayTao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email_nv (EmailNV)
);

-- Bảng Khóa Học
CREATE TABLE KhoaHoc (
    IDKH INT PRIMARY KEY AUTO_INCREMENT,
    TenKH VARCHAR(200) NOT NULL,
    MoTaKH TEXT,
    GiaKH DECIMAL(10,2) NOT NULL DEFAULT 0,
    TrangThai ENUM('active', 'inactive', 'draft') DEFAULT 'draft',
    NgayTao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    AnhDaiDien VARCHAR(500),
    INDEX idx_trangthai (TrangThai),
    INDEX idx_gia (GiaKH)
);

-- Bảng Học Viên
CREATE TABLE HocVien (
    IDHV INT PRIMARY KEY AUTO_INCREMENT,
    TenHV VARCHAR(100) NOT NULL,
    Email VARCHAR(100) UNIQUE NOT NULL,
    MatKhau VARCHAR(255) NOT NULL,
    AnhHV VARCHAR(500),
    DanhSachKH JSON,
    IDNV INT,
    NgayDangKy TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    TienDoKH JSON,
    Role ENUM('user', 'admin') DEFAULT 'user',
    INDEX idx_email (Email),
    INDEX idx_role (Role),
    FOREIGN KEY (IDNV) REFERENCES NhanVienSale(IDNV) ON DELETE SET NULL
);

-- Bảng Chương Học
CREATE TABLE ChuongHoc (
    IDCH INT PRIMARY KEY AUTO_INCREMENT,
    IDKH INT NOT NULL,
    TenCH VARCHAR(200) NOT NULL,
    ThuTuCH INT NOT NULL,
    MoTaCH TEXT,
    INDEX idx_khoahoc (IDKH),
    INDEX idx_thutu (ThuTuCH),
    FOREIGN KEY (IDKH) REFERENCES KhoaHoc(IDKH) ON DELETE CASCADE
);

-- Bảng Bài Học
CREATE TABLE BaiHoc (
    IDBH INT PRIMARY KEY AUTO_INCREMENT,
    IDCH INT NOT NULL,
    TenBH VARCHAR(200) NOT NULL,
    LoaiND ENUM('video', 'text', 'quiz', 'assignment') DEFAULT 'video',
    LinkND VARCHAR(500),
    ThuTuBH INT NOT NULL,
    TaiLieu JSON,
    INDEX idx_chuong (IDCH),
    INDEX idx_thutu (ThuTuBH),
    FOREIGN KEY (IDCH) REFERENCES ChuongHoc(IDCH) ON DELETE CASCADE
);

-- Bảng Video
CREATE TABLE Video (
    IDVideo INT PRIMARY KEY AUTO_INCREMENT,
    IDBH INT NOT NULL,
    video_480p_path VARCHAR(500),
    video_720p_path VARCHAR(500),
    video_1080p_path VARCHAR(500),
    duration INT DEFAULT 0,
    file_size BIGINT DEFAULT 0,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_baihoc (IDBH),
    FOREIGN KEY (IDBH) REFERENCES BaiHoc(IDBH) ON DELETE CASCADE
);

-- Bảng Giao Dịch Khóa Học
CREATE TABLE GiaoDichKhoaHoc (
    IDGD INT PRIMARY KEY AUTO_INCREMENT,
    IDHV INT NOT NULL,
    IDKH INT NOT NULL,
    IDNV INT,
    NgayBan TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    GiaThucTe DECIMAL(10,2) NOT NULL,
    TrangThaiTT ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    GhiChu TEXT,
    INDEX idx_hocvien (IDHV),
    INDEX idx_khoahoc (IDKH),
    INDEX idx_trangthai (TrangThaiTT),
    INDEX idx_ngayban (NgayBan),
    FOREIGN KEY (IDHV) REFERENCES HocVien(IDHV) ON DELETE CASCADE,
    FOREIGN KEY (IDKH) REFERENCES KhoaHoc(IDKH) ON DELETE CASCADE,
    FOREIGN KEY (IDNV) REFERENCES NhanVienSale(IDNV) ON DELETE SET NULL
);

-- Bảng Tiến Độ Học
CREATE TABLE TienDoHoc (
    ID INT PRIMARY KEY AUTO_INCREMENT,
    IDHV INT NOT NULL,
    IDKH INT NOT NULL,
    IDCH INT,
    IDBH INT,
    DaHoanThanh BOOLEAN DEFAULT FALSE,
    NgayHoanThanh TIMESTAMP NULL,
    ThoiGianXem INT DEFAULT 0,
    INDEX idx_hocvien_khoahoc (IDHV, IDKH),
    INDEX idx_hoantathanh (DaHoanThanh),
    FOREIGN KEY (IDHV) REFERENCES HocVien(IDHV) ON DELETE CASCADE,
    FOREIGN KEY (IDKH) REFERENCES KhoaHoc(IDKH) ON DELETE CASCADE,
    FOREIGN KEY (IDCH) REFERENCES ChuongHoc(IDCH) ON DELETE CASCADE,
    FOREIGN KEY (IDBH) REFERENCES BaiHoc(IDBH) ON DELETE CASCADE
);

-- Bảng Blog (Enhanced)
CREATE TABLE Blog (
    IDBlog INT PRIMARY KEY AUTO_INCREMENT,
    TieuDe VARCHAR(300) NOT NULL,
    NoiDung LONGTEXT NOT NULL,
    NgayDang TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    NgayCapNhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    TacGia VARCHAR(100) NOT NULL,
    SEO JSON,
    TrangThai ENUM('draft', 'published', 'archived') DEFAULT 'draft',
    AnhDaiDien VARCHAR(500),
    LuotXem INT DEFAULT 0,
    LoaiBaiViet ENUM('text', 'image', 'video') DEFAULT 'text',
    Tags JSON,
    Slug VARCHAR(500) UNIQUE,
    INDEX idx_trangthai (TrangThai),
    INDEX idx_ngaydang (NgayDang),
    INDEX idx_tacgia (TacGia),
    INDEX idx_slug (Slug),
    INDEX idx_loai (LoaiBaiViet)
);

-- Bảng Documents (Tài liệu miễn phí)
CREATE TABLE Documents (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    file_url VARCHAR(500),
    file_name VARCHAR(255),
    file_size BIGINT DEFAULT 0,
    tags JSON,
    category VARCHAR(50) DEFAULT 'general',
    download_count INT DEFAULT 0,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (created_by) REFERENCES HocVien(IDHV) ON DELETE SET NULL
);

-- Bảng Website Settings
CREATE TABLE WebsiteSettings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSON,
    description TEXT,
    updated_by INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES HocVien(IDHV) ON DELETE SET NULL
);

-- Bảng Đánh Giá Khóa Học
CREATE TABLE DanhGiaKhoaHoc (
    ID INT PRIMARY KEY AUTO_INCREMENT,
    IDHV INT NOT NULL,
    IDKH INT NOT NULL,
    DiemDanhGia INT CHECK (DiemDanhGia >= 1 AND DiemDanhGia <= 5),
    BinhLuan TEXT,
    NgayDanhGia TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_hocvien (IDHV),
    INDEX idx_khoahoc (IDKH),
    INDEX idx_diem (DiemDanhGia),
    FOREIGN KEY (IDHV) REFERENCES HocVien(IDHV) ON DELETE CASCADE,
    FOREIGN KEY (IDKH) REFERENCES KhoaHoc(IDKH) ON DELETE CASCADE,
    UNIQUE KEY unique_rating (IDHV, IDKH)
);

-- Thêm dữ liệu mẫu

-- Nhân viên sale mẫu
INSERT INTO NhanVienSale (TenNV, EmailNV, SoHV) VALUES
('Nguyễn Văn A', 'sale1@linhmai.edu.vn', 0),
('Trần Thị B', 'sale2@linhmai.edu.vn', 0);

-- Admin mẫu
INSERT INTO HocVien (TenHV, Email, MatKhau, Role, IDNV) VALUES
('Admin LinhMai', 'admin@linhmai.edu.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 1),
('Học viên Demo', 'student@linhmai.edu.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 1);

-- Khóa học mẫu
INSERT INTO KhoaHoc (TenKH, MoTaKH, GiaKH, TrangThai, AnhDaiDien) VALUES
('React Development Fundamentals', 'Học React từ cơ bản đến nâng cao với các dự án thực tế', 299000, 'active', 'https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg'),
('JavaScript Mastery', 'Thành thạo JavaScript từ beginner đến advanced', 199000, 'active', 'https://images.pexels.com/photos/574077/pexels-photo-574077.jpeg'),
('Web Design Basics', 'Học thiết kế web cơ bản và tạo website đẹp', 0, 'active', 'https://images.pexels.com/photos/196644/pexels-photo-196644.jpeg');

-- Chương học mẫu cho khóa React
INSERT INTO ChuongHoc (IDKH, TenCH, ThuTuCH, MoTaCH) VALUES
(1, 'Giới thiệu về React', 1, 'Tìm hiểu React và hệ sinh thái của nó'),
(1, 'Components và Props', 2, 'Học cách tạo và sử dụng components'),
(1, 'State và Lifecycle', 3, 'Quản lý state và lifecycle methods');

-- Bài học mẫu
INSERT INTO BaiHoc (IDCH, TenBH, LoaiND, LinkND, ThuTuBH, TaiLieu) VALUES
(1, 'React là gì?', 'video', 'https://example.com/video1.mp4', 1, '{"documents": [], "exercises": []}'),
(1, 'Cài đặt môi trường phát triển', 'video', 'https://example.com/video2.mp4', 2, '{"documents": [], "exercises": []}'),
(2, 'Tạo Component đầu tiên', 'video', 'https://example.com/video3.mp4', 1, '{"documents": [], "exercises": []}');

-- Blog mẫu (Enhanced)
INSERT INTO Blog (TieuDe, NoiDung, TacGia, SEO, TrangThai, AnhDaiDien, LoaiBaiViet, Tags, Slug) VALUES
('5 Lý do nên học React trong năm 2024', 'React là một trong những framework phổ biến nhất hiện nay. Với khả năng tạo ra các ứng dụng web hiện đại và hiệu suất cao, React đã trở thành lựa chọn hàng đầu của nhiều developer...', 'LinhMai Academy', '{"keywords": ["react", "javascript", "frontend"], "description": "Tại sao React là lựa chọn tốt cho developer"}', 'published', 'https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg', 'text', '["react", "javascript", "frontend", "2024"]', '5-ly-do-nen-hoc-react-trong-nam-2024'),
('Roadmap học JavaScript từ Zero đến Hero', 'JavaScript là ngôn ngữ lập trình không thể thiếu trong việc phát triển web. Từ frontend đến backend, JavaScript đều có thể đảm nhận...', 'LinhMai Academy', '{"keywords": ["javascript", "roadmap", "learning"], "description": "Lộ trình học JavaScript hiệu quả"}', 'published', 'https://images.pexels.com/photos/574077/pexels-photo-574077.jpeg', 'text', '["javascript", "roadmap", "learning", "beginner"]', 'roadmap-hoc-javascript-tu-zero-den-hero'),
('Xu hướng thiết kế web 2024', 'Thiết kế web năm 2024 có những xu hướng mới đáng chú ý...', 'LinhMai Academy', '{"keywords": ["web design", "trends", "2024"], "description": "Xu hướng thiết kế web mới nhất"}', 'published', 'https://images.pexels.com/photos/196644/pexels-photo-196644.jpeg', 'image', '["design", "web", "trends", "2024"]', 'xu-huong-thiet-ke-web-2024');

-- Documents mẫu
INSERT INTO Documents (title, description, file_url, file_name, file_size, tags, category, created_by) VALUES
('Tài liệu học React cơ bản', 'Tài liệu PDF hướng dẫn học React từ cơ bản đến nâng cao', NULL, NULL, 0, '["react", "javascript", "tutorial"]', 'programming', 1),
('Cheat Sheet JavaScript ES6+', 'Tổng hợp các tính năng mới của JavaScript ES6 và các phiên bản sau', NULL, NULL, 0, '["javascript", "es6", "cheatsheet"]', 'programming', 1),
('Template thiết kế Landing Page', 'Bộ template thiết kế landing page chuyên nghiệp', NULL, NULL, 0, '["design", "template", "landing-page"]', 'design', 1);

-- Website Settings mẫu
INSERT INTO WebsiteSettings (setting_key, setting_value, description, updated_by) VALUES
('site_info', '{"siteName": "LinhMai Academy", "tagline": "Nền tảng học tập trực tuyến hàng đầu", "description": "Học lập trình và thiết kế web chuyên nghiệp"}', 'Thông tin cơ bản của website', 1),
('branding', '{"logo": "", "favicon": "", "primaryColor": "#3B82F6", "secondaryColor": "#10B981"}', 'Thương hiệu và màu sắc', 1),
('contact_info', '{"email": "contact@linhmai.edu.vn", "phone": "0123456789", "address": "123 Đường ABC, Quận XYZ, TP.HCM"}', 'Thông tin liên hệ', 1),
('social_links', '{"facebook": "", "youtube": "", "tiktok": "", "zalo": ""}', 'Liên kết mạng xã hội', 1),
('seo_settings', '{"googleAnalytics": "", "facebookPixel": "", "metaTitle": "LinhMai Academy", "metaDescription": "Học lập trình chuyên nghiệp"}', 'Cài đặt SEO và Analytics', 1);

-- Tạo indexes để tối ưu performance
CREATE INDEX idx_hocvien_email ON HocVien(Email);
CREATE INDEX idx_khoahoc_trangthai ON KhoaHoc(TrangThai);
CREATE INDEX idx_tiendo_hocvien_khoahoc ON TienDoHoc(IDHV, IDKH);
CREATE INDEX idx_giaodich_trangthai ON GiaoDichKhoaHoc(TrangThaiTT);

-- Tạo view để thống kê
CREATE VIEW ThongKeKhoaHoc AS
SELECT 
    kh.IDKH,
    kh.TenKH,
    kh.GiaKH,
    COUNT(DISTINCT gd.IDHV) as SoHocVien,
    SUM(gd.GiaThucTe) as DoanhThu,
    AVG(dg.DiemDanhGia) as DiemTrungBinh
FROM KhoaHoc kh
LEFT JOIN GiaoDichKhoaHoc gd ON kh.IDKH = gd.IDKH AND gd.TrangThaiTT = 'completed'
LEFT JOIN DanhGiaKhoaHoc dg ON kh.IDKH = dg.IDKH
GROUP BY kh.IDKH, kh.TenKH, kh.GiaKH;

-- Tạo stored procedure tính tiến độ học
DELIMITER //
CREATE PROCEDURE TinhTienDoHoc(IN p_IDHV INT, IN p_IDKH INT)
BEGIN
    DECLARE total_lessons INT DEFAULT 0;
    DECLARE completed_lessons INT DEFAULT 0;
    DECLARE progress_percent DECIMAL(5,2) DEFAULT 0;
    
    -- Đếm tổng số bài học trong khóa
    SELECT COUNT(bh.IDBH) INTO total_lessons
    FROM BaiHoc bh
    INNER JOIN ChuongHoc ch ON bh.IDCH = ch.IDCH
    WHERE ch.IDKH = p_IDKH;
    
    -- Đếm số bài đã hoàn thành
    SELECT COUNT(*) INTO completed_lessons
    FROM TienDoHoc td
    WHERE td.IDHV = p_IDHV 
    AND td.IDKH = p_IDKH 
    AND td.DaHoanThanh = TRUE;
    
    -- Tính phần trăm
    IF total_lessons > 0 THEN
        SET progress_percent = (completed_lessons * 100.0) / total_lessons;
    END IF;
    
    SELECT progress_percent as TienDoPhanTram, completed_lessons as BaiDaHoc, total_lessons as TongSoBai;
END //
DELIMITER ;

COMMIT;
