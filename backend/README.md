# LinhMai Academy Backend API

Backend API hoàn chỉnh cho hệ thống đào tạo trực tuyến LinhMai Academy, được xây dựng bằng Node.js + Express + MySQL.

## 🚀 Tính năng chính

- ✅ **Xác thực JWT** với phân quyền user/admin
- ✅ **Quản lý khóa học** đầy đủ (CRUD)
- ✅ **Quản lý học viên** và tiến độ học tập
- ✅ **Upload và streaming video** bảo mật
- ✅ **Giao dịch và thanh toán** khóa học
- ✅ **Blog và nội dung** quản lý
- ✅ **API RESTful** chuẩn
- ✅ **Bảo mật** cao với rate limiting, CORS, helmet
- ✅ **Upload file** với multer
- ✅ **Validation** đầu vào chi tiết

## 📋 Yêu cầu hệ thống

- **Node.js** >= 16.0.0
- **MySQL** >= 8.0
- **npm** hoặc **yarn**

## 🛠️ Cài đặt và chạy

### 1. Clone và cài đặt dependencies

```bash
cd backend
npm install
```

### 2. Cấu hình môi trường

Tạo file `.env` từ `.env.example`:

```bash
cp .env.example .env
```

Cập nhật thông tin trong file `.env`:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=linhmai_academy
DB_PORT=3306

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_change_in_production
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=3000
NODE_ENV=development

# Upload Configuration
MAX_FILE_SIZE=100MB
UPLOAD_PATH=./uploads

# CORS Configuration
FRONTEND_URL=http://localhost:5173
```

### 3. Khởi tạo Database

Import file SQL để tạo database và dữ liệu mẫu:

```bash
mysql -u root -p < init_db.sql
```

Hoặc sử dụng MySQL Workbench/phpMyAdmin để import file `init_db.sql`.

### 4. Chạy server

**Development mode:**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

Server sẽ chạy tại: `http://localhost:3000`

## 📚 API Documentation

Truy cập `http://localhost:3000/api/docs` để xem tài liệu API đầy đủ.

### Endpoints chính:

#### Authentication
- `POST /api/auth/register` - Đăng ký
- `POST /api/auth/login` - Đăng nhập
- `GET /api/auth/me` - Lấy thông tin user hiện tại
- `PUT /api/auth/change-password` - Đổi mật khẩu
- `PUT /api/auth/profile` - Cập nhật profile

#### Khóa học
- `GET /api/khoahoc` - Danh sách khóa học
- `GET /api/khoahoc/featured` - Khóa học nổi bật
- `GET /api/khoahoc/:id` - Chi tiết khóa học
- `GET /api/khoahoc/:id/chuong` - Danh sách chương
- `POST /api/khoahoc` - Tạo khóa học (Admin)
- `PUT /api/khoahoc/:id` - Cập nhật khóa học (Admin)
- `DELETE /api/khoahoc/:id` - Xóa khóa học (Admin)

#### Học viên
- `GET /api/hocvien` - Danh sách học viên (Admin)
- `GET /api/hocvien/:id` - Thông tin học viên
- `GET /api/hocvien/:id/tien-do` - Tiến độ học
- `POST /api/hocvien/progress` - Cập nhật tiến độ
- `GET /api/hocvien/:id/courses` - Khóa học đã mua

#### Video
- `POST /api/video/upload` - Upload video (Admin)
- `GET /api/video/lesson/:lessonId` - Thông tin video bài học
- `GET /api/video/stream/:videoId/:quality` - Stream video
- `DELETE /api/video/:id` - Xóa video (Admin)

## 🔐 Xác thực

API sử dụng JWT Bearer Token. Thêm header sau vào request:

```
Authorization: Bearer <your_jwt_token>
```

## 📁 Cấu trúc thư mục

```
backend/
├── config/
│   ├── database.js          # Cấu hình MySQL
│   └── jwt.js              # Cấu hình JWT
├── controllers/
│   ├── authController.js    # Xử lý authentication
│   ├── hocvienController.js # Xử lý học viên
│   ├── khoahocController.js # Xử lý khóa học
│   └── videoController.js   # Xử lý video
├── middlewares/
│   ├── authJwt.js          # Middleware xác thực
│   └── upload.js           # Middleware upload file
├── models/
│   ├── HocVien.js          # Model học viên
│   └── KhoaHoc.js          # Model khóa học
├── routes/
│   ├── auth.js             # Routes authentication
│   ├── hocvien.js          # Routes học viên
│   ├── khoahoc.js          # Routes khóa học
│   └── video.js            # Routes video
├── uploads/                # Thư mục lưu file upload
│   ├── videos/
│   ├── images/
│   └── documents/
├── server.js               # Entry point
├── package.json
├── init_db.sql            # Script khởi tạo database
└── README.md
```

## 🗄️ Database Schema

### Bảng chính:

- **HocVien** - Thông tin học viên
- **KhoaHoc** - Thông tin khóa học
- **ChuongHoc** - Chương học
- **BaiHoc** - Bài học
- **Video** - Video bài học
- **TienDoHoc** - Tiến độ học tập
- **GiaoDichKhoaHoc** - Giao dịch mua khóa học
- **NhanVienSale** - Nhân viên sale
- **Blog** - Bài viết blog
- **DanhGiaKhoaHoc** - Đánh giá khóa học

## 🔒 Bảo mật

- **JWT Authentication** với refresh token
- **Rate limiting** chống spam
- **CORS** cấu hình an toàn
- **Helmet** bảo vệ HTTP headers
- **Input validation** với express-validator
- **File upload** validation và size limit
- **Video streaming** với access control

## 🚀 Deploy lên VPS

### 1. Chuẩn bị VPS

```bash
# Cập nhật hệ thống
sudo apt update && sudo apt upgrade -y

# Cài đặt Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Cài đặt MySQL
sudo apt install mysql-server -y
sudo mysql_secure_installation

# Cài đặt PM2 (Process Manager)
sudo npm install -g pm2
```

### 2. Upload code lên VPS

```bash
# Sử dụng git
git clone <your-repo-url>
cd backend

# Hoặc sử dụng scp
scp -r ./backend user@your-vps-ip:/path/to/app/
```

### 3. Cấu hình production

```bash
# Cài đặt dependencies
npm install --production

# Tạo file .env cho production
cp .env.example .env
nano .env  # Cập nhật thông tin production

# Import database
mysql -u root -p < init_db.sql
```

### 4. Chạy với PM2

```bash
# Khởi động ứng dụng
pm2 start server.js --name "linhmai-api"

# Lưu cấu hình PM2
pm2 save
pm2 startup

# Kiểm tra status
pm2 status
pm2 logs linhmai-api
```

### 5. Cấu hình Nginx (tùy chọn)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🧪 Testing

```bash
# Test kết nối database
curl http://localhost:3000/health

# Test API endpoints
curl http://localhost:3000/api/docs

# Test authentication
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"Email":"admin@linhmai.edu.vn","MatKhau":"password"}'
```

## 📝 Logs và Monitoring

```bash
# Xem logs PM2
pm2 logs linhmai-api

# Monitor real-time
pm2 monit

# Restart ứng dụng
pm2 restart linhmai-api

# Reload without downtime
pm2 reload linhmai-api
```

## 🤝 Kết nối với Frontend

Frontend React cần cấu hình:

```javascript
// .env trong project React
VITE_API_BASE_URL=http://localhost:3000/api

// Hoặc production
VITE_API_BASE_URL=https://your-domain.com/api
```

## 🆘 Troubleshooting

### Lỗi kết nối database:
```bash
# Kiểm tra MySQL service
sudo systemctl status mysql
sudo systemctl start mysql

# Kiểm tra user và quyền
mysql -u root -p
SHOW DATABASES;
USE linhmai_academy;
SHOW TABLES;
```

### Lỗi upload file:
```bash
# Kiểm tra quyền thư mục
chmod 755 uploads/
chmod 755 uploads/videos/
chmod 755 uploads/images/
```

### Lỗi JWT:
- Kiểm tra `JWT_SECRET` trong file `.env`
- Đảm bảo token được gửi đúng format: `Bearer <token>`

## 📞 Hỗ trợ

Nếu gặp vấn đề, vui lòng:

1. Kiểm tra logs: `pm2 logs linhmai-api`
2. Kiểm tra database connection
3. Xác nhận cấu hình `.env`
4. Kiểm tra firewall và ports

---

**LinhMai Academy Backend API v1.0.0**  
Được phát triển với ❤️ bằng Node.js + Express + MySQL
