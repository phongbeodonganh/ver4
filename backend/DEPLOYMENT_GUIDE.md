# 🚀 Hướng dẫn Deploy LinhMai Academy Backend lên linhmai.edu.vn

## 📋 Chuẩn bị VPS

### 1. Cấu hình VPS Ubuntu/CentOS
```bash
# Cập nhật hệ thống
sudo apt update && sudo apt upgrade -y

# Cài đặt Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Cài đặt MySQL 8.0
sudo apt install mysql-server -y
sudo mysql_secure_installation

# Cài đặt PM2 để quản lý process
sudo npm install -g pm2

# Cài đặt Nginx làm reverse proxy
sudo apt install nginx -y

# Cài đặt Git
sudo apt install git -y
```

## 🗄️ Thiết lập Database

### 1. Tạo Database và User
```bash
# Đăng nhập MySQL
sudo mysql -u root -p

# Tạo database
CREATE DATABASE linhmai_academy CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Tạo user riêng cho ứng dụng
CREATE USER 'linhmai_user'@'localhost' IDENTIFIED BY 'MatKhauBaoMat123!@#';
GRANT ALL PRIVILEGES ON linhmai_academy.* TO 'linhmai_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 2. Import Database Schema
```bash
# Upload file init_db.sql lên server và import
mysql -u linhmai_user -p linhmai_academy < init_db.sql
```

## 📁 Deploy Ứng dụng

### 1. Tạo thư mục và upload code
```bash
# Tạo thư mục cho ứng dụng
sudo mkdir -p /var/www/linhmai-api
sudo chown -R $USER:$USER /var/www/linhmai-api
cd /var/www/linhmai-api

# Clone code từ Git (hoặc upload qua SCP/FTP)
git clone <your-repository-url> .

# Hoặc upload thủ công
# scp -r ./backend/* user@your-server-ip:/var/www/linhmai-api/
```

### 2. Cài đặt Dependencies
```bash
cd /var/www/linhmai-api
npm install --production
```

### 3. Cấu hình Environment
```bash
# Copy file cấu hình production
cp .env.production .env

# Chỉnh sửa cấu hình
nano .env
```

Cập nhật file `.env` với thông tin thực tế:
```env
# Server Configuration
PORT=3000
NODE_ENV=production

# Database Configuration
DB_HOST=localhost
DB_USER=linhmai_user
DB_PASSWORD=MatKhauBaoMat123!@#
DB_NAME=linhmai_academy
DB_PORT=3306

# JWT Configuration (Tạo secret key mạnh)
JWT_SECRET=LinhMaiAcademy2024SuperSecretKeyMinimum32Characters!@#$%
JWT_EXPIRES_IN=7d

# Domain Configuration
FRONTEND_URL=https://www.linhmai.edu.vn
DOMAIN=linhmai.edu.vn
WWW_DOMAIN=www.linhmai.edu.vn

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload
MAX_FILE_SIZE=1073741824
UPLOAD_PATH=./uploads
```

### 4. Tạo thư mục uploads và phân quyền
```bash
mkdir -p uploads/videos uploads/images uploads/documents
chmod -R 755 uploads/
```

## 🔧 Cấu hình PM2

### 1. Tạo file ecosystem PM2
```bash
nano ecosystem.config.js
```

Nội dung file:
```javascript
module.exports = {
  apps: [{
    name: 'linhmai-api',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

### 2. Khởi động ứng dụng
```bash
# Tạo thư mục logs
mkdir logs

# Khởi động với PM2
pm2 start ecosystem.config.js

# Lưu cấu hình PM2
pm2 save

# Thiết lập auto-start khi reboot
pm2 startup
# Chạy lệnh được hiển thị (thường bắt đầu với sudo)

# Kiểm tra status
pm2 status
pm2 logs linhmai-api
```

## 🌐 Cấu hình Nginx

### 1. Tạo cấu hình cho API subdomain
```bash
sudo nano /etc/nginx/sites-available/linhmai-api
```

Nội dung cấu hình:
```nginx
server {
    listen 80;
    server_name api.linhmai.edu.vn;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript;

    # API routes
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
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files (uploads)
    location /uploads/ {
        alias /var/www/linhmai-api/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security - hide sensitive files
    location ~ /\. {
        deny all;
    }
    
    location ~ \.(env|log)$ {
        deny all;
    }
}
```

### 2. Kích hoạt cấu hình
```bash
# Tạo symbolic link
sudo ln -s /etc/nginx/sites-available/linhmai-api /etc/nginx/sites-enabled/

# Test cấu hình
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

## 🔒 Cài đặt SSL Certificate

### 1. Cài đặt Certbot
```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 2. Lấy SSL certificate
```bash
# Lấy certificate cho API subdomain
sudo certbot --nginx -d api.linhmai.edu.vn

# Thiết lập auto-renewal
sudo crontab -e
# Thêm dòng sau:
0 12 * * * /usr/bin/certbot renew --quiet
```

## 🔥 Cấu hình Firewall

```bash
# Cài đặt UFW
sudo ufw enable

# Mở các port cần thiết
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw allow 3000

# Kiểm tra status
sudo ufw status
```

## 📊 Monitoring và Logs

### 1. Thiết lập log rotation
```bash
sudo nano /etc/logrotate.d/linhmai-api
```

Nội dung:
```
/var/www/linhmai-api/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reload linhmai-api
    endscript
}
```

### 2. Monitoring commands
```bash
# Xem logs real-time
pm2 logs linhmai-api

# Monitor system resources
pm2 monit

# Restart ứng dụng
pm2 restart linhmai-api

# Reload without downtime
pm2 reload linhmai-api

# Xem status
pm2 status
```

## 🧪 Testing Deployment

### 1. Test API endpoints
```bash
# Health check
curl https://api.linhmai.edu.vn/health

# API documentation
curl https://api.linhmai.edu.vn/api/docs

# Test CORS
curl -H "Origin: https://www.linhmai.edu.vn" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     https://api.linhmai.edu.vn/api/auth/login
```

### 2. Test từ Frontend
Cập nhật frontend để sử dụng API production:
```javascript
// .env trong React project
VITE_API_BASE_URL=https://api.linhmai.edu.vn/api
```

## 🔧 Maintenance

### 1. Backup Database
```bash
# Tạo script backup
nano /home/backup_db.sh
```

Script backup:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/backups"
mkdir -p $BACKUP_DIR

mysqldump -u linhmai_user -p'MatKhauBaoMat123!@#' linhmai_academy > $BACKUP_DIR/linhmai_academy_$DATE.sql

# Giữ lại 7 backup gần nhất
find $BACKUP_DIR -name "linhmai_academy_*.sql" -mtime +7 -delete
```

```bash
chmod +x /home/backup_db.sh

# Thiết lập cron job backup hàng ngày
crontab -e
# Thêm: 0 2 * * * /home/backup_db.sh
```

### 2. Update ứng dụng
```bash
cd /var/www/linhmai-api

# Pull code mới
git pull origin main

# Cài đặt dependencies mới (nếu có)
npm install --production

# Restart ứng dụng
pm2 reload linhmai-api
```

## 🆘 Troubleshooting

### 1. Lỗi thường gặp

**Database connection error:**
```bash
# Kiểm tra MySQL service
sudo systemctl status mysql
sudo systemctl restart mysql

# Test connection
mysql -u linhmai_user -p linhmai_academy
```

**PM2 process died:**
```bash
# Xem logs lỗi
pm2 logs linhmai-api --err

# Restart
pm2 restart linhmai-api
```

**Nginx 502 Bad Gateway:**
```bash
# Kiểm tra PM2 app có chạy không
pm2 status

# Kiểm tra port 3000
netstat -tlnp | grep 3000

# Restart Nginx
sudo systemctl restart nginx
```

### 2. Performance tuning

**Tăng file upload limit:**
```bash
# Trong Nginx config
client_max_body_size 1G;

# Restart Nginx
sudo systemctl restart nginx
```

**Database optimization:**
```sql
-- Tối ưu MySQL
SET GLOBAL innodb_buffer_pool_size = 1073741824; -- 1GB
SET GLOBAL max_connections = 200;
```

## 📞 Hỗ trợ

Sau khi deploy thành công, API sẽ có sẵn tại:
- **Base URL:** https://api.linhmai.edu.vn
- **Documentation:** https://api.linhmai.edu.vn/api/docs
- **Health Check:** https://api.linhmai.edu.vn/health

Frontend có thể kết nối với backend qua domain này và tất cả CORS đã được cấu hình sẵn cho linhmai.edu.vn và www.linhmai.edu.vn.
