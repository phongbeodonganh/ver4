# LinhMai Academy Backend Deployment Guide v2.0

## 🚀 Enhanced System Deployment

This guide covers the deployment of the enhanced LinhMai Academy backend system with new features including async video processing, enhanced news system, media library, admin logs, and advanced statistics.

## 📋 Prerequisites

### System Requirements
- **Node.js**: >= 16.0.0
- **MySQL**: >= 8.0
- **FFmpeg**: Latest stable version
- **PM2**: For process management
- **Nginx**: For reverse proxy (recommended)
- **SSL Certificate**: For HTTPS (Let's Encrypt recommended)

### Server Specifications (Recommended)
- **CPU**: 4+ cores
- **RAM**: 8GB+ (16GB recommended for video processing)
- **Storage**: 100GB+ SSD (more for video storage)
- **Network**: 100Mbps+ bandwidth

## 🛠️ Installation Steps

### 1. System Dependencies

```bash
# Update system
sudo apt update
sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install FFmpeg
sudo apt install ffmpeg -y

# Install MySQL 8.0
sudo apt install mysql-server -y

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx -y
```

### 2. Database Setup

```bash
# Secure MySQL installation
sudo mysql_secure_installation

# Create database and user
sudo mysql -u root -p
```

```sql
CREATE DATABASE linhmai_academy CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'linhmai_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON linhmai_academy.* TO 'linhmai_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 3. Application Deployment

```bash
# Clone or upload your application
cd /var/www
sudo git clone https://github.com/your-repo/linhmai-academy.git
cd linhmai-academy/backend

# Set proper permissions
sudo chown -R www-data:www-data /var/www/linhmai-academy
sudo chmod -R 755 /var/www/linhmai-academy

# Install dependencies
npm install --production

# Copy environment configuration
cp .env.example .env
```

### 4. Environment Configuration

Edit the `.env` file with your production values:

```bash
sudo nano .env
```

**Critical Configuration:**
```env
NODE_ENV=production
PORT=3000
DB_HOST=localhost
DB_USER=linhmai_user
DB_PASS=your_secure_password
DB_NAME=linhmai_academy
JWT_SECRET=your_super_secure_jwt_secret_here
FRONTEND_URL=https://linhmai.edu.vn
ALLOWED_ORIGINS=https://linhmai.edu.vn,https://www.linhmai.edu.vn
FFMPEG_PATH=/usr/bin/ffmpeg
```

### 5. Database Migration

```bash
# Import database schema
mysql -u linhmai_user -p linhmai_academy < init_db.sql

# Verify tables were created
mysql -u linhmai_user -p linhmai_academy -e "SHOW TABLES;"
```

### 6. Create Upload Directories

```bash
# Create upload directories
sudo mkdir -p /var/www/linhmai-academy/backend/uploads/{images,videos,documents,temp}
sudo chown -R www-data:www-data /var/www/linhmai-academy/backend/uploads
sudo chmod -R 755 /var/www/linhmai-academy/backend/uploads
```

### 7. PM2 Process Management

```bash
# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'linhmai-backend',
    script: 'server.js',
    cwd: '/var/www/linhmai-academy/backend',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/linhmai/error.log',
    out_file: '/var/log/linhmai/out.log',
    log_file: '/var/log/linhmai/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=4096'
  }]
};
EOF

# Create log directory
sudo mkdir -p /var/log/linhmai
sudo chown www-data:www-data /var/log/linhmai

# Start application with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 8. Nginx Configuration

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/linhmai-academy
```

```nginx
server {
    listen 80;
    server_name linhmai.edu.vn www.linhmai.edu.vn;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name linhmai.edu.vn www.linhmai.edu.vn;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/linhmai.edu.vn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/linhmai.edu.vn/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # API Backend
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Static file serving with caching
    location /uploads/ {
        alias /var/www/linhmai-academy/backend/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header X-Content-Type-Options nosniff;
    }

    # Video streaming optimization
    location ~* \.(mp4|webm|ogg)$ {
        alias /var/www/linhmai-academy/backend/uploads/videos/;
        add_header Cache-Control "public, max-age=31536000";
        add_header Accept-Ranges bytes;
        
        # Enable range requests for video seeking
        location ~* \.(mp4)$ {
            mp4;
            mp4_buffer_size 1m;
            mp4_max_buffer_size 5m;
        }
    }

    # Frontend (if serving from same domain)
    location / {
        root /var/www/linhmai-academy/frontend/dist;
        try_files $uri $uri/ /index.html;
        expires 1h;
        add_header Cache-Control "public";
    }

    # Health check
    location /health {
        proxy_pass http://localhost:3000/health;
        access_log off;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    location /api/ {
        limit_req zone=api burst=20 nodelay;
    }
}
```

```bash
# Enable site and restart Nginx
sudo ln -s /etc/nginx/sites-available/linhmai-academy /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 9. SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain SSL certificate
sudo certbot --nginx -d linhmai.edu.vn -d www.linhmai.edu.vn

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 10. Firewall Configuration

```bash
# Configure UFW
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw allow 3306 # MySQL (if external access needed)
sudo ufw enable
```

## 🔧 System Configuration

### FFmpeg Optimization

```bash
# Verify FFmpeg installation
ffmpeg -version

# Create FFmpeg configuration for optimal video processing
sudo nano /etc/ffmpeg.conf
```

### MySQL Optimization

```bash
# Edit MySQL configuration
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf
```

Add these optimizations:
```ini
[mysqld]
innodb_buffer_pool_size = 2G
innodb_log_file_size = 256M
max_connections = 200
query_cache_size = 64M
tmp_table_size = 64M
max_heap_table_size = 64M
```

```bash
sudo systemctl restart mysql
```

## 📊 Monitoring & Maintenance

### 1. PM2 Monitoring

```bash
# Monitor processes
pm2 monit

# View logs
pm2 logs linhmai-backend

# Restart application
pm2 restart linhmai-backend

# Reload without downtime
pm2 reload linhmai-backend
```

### 2. Log Rotation

```bash
# Create logrotate configuration
sudo nano /etc/logrotate.d/linhmai-academy
```

```
/var/log/linhmai/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reloadLogs
    endscript
}
```

### 3. Database Backup

```bash
# Create backup script
sudo nano /usr/local/bin/backup-linhmai-db.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/linhmai"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="linhmai_academy"
DB_USER="linhmai_user"
DB_PASS="your_secure_password"

mkdir -p $BACKUP_DIR
mysqldump -u $DB_USER -p$DB_PASS $DB_NAME > $BACKUP_DIR/linhmai_$DATE.sql
gzip $BACKUP_DIR/linhmai_$DATE.sql

# Keep only last 30 days of backups
find $BACKUP_DIR -name "linhmai_*.sql.gz" -mtime +30 -delete
```

```bash
sudo chmod +x /usr/local/bin/backup-linhmai-db.sh

# Schedule daily backups
sudo crontab -e
# Add: 0 2 * * * /usr/local/bin/backup-linhmai-db.sh
```

## 🔍 Health Checks & Testing

### 1. API Health Check

```bash
# Test API endpoints
curl -X GET https://linhmai.edu.vn/health
curl -X GET https://linhmai.edu.vn/api/docs
```

### 2. Video Processing Test

```bash
# Test video upload (requires authentication)
curl -X POST https://linhmai.edu.vn/api/video/async/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "IDBH=1" \
  -F "video=@test-video.mp4"
```

### 3. Database Connection Test

```bash
# Test database connectivity
mysql -u linhmai_user -p linhmai_academy -e "SELECT COUNT(*) FROM HocVien;"
```

## 🚨 Troubleshooting

### Common Issues

1. **Video Processing Fails**
   - Check FFmpeg installation: `ffmpeg -version`
   - Verify file permissions on uploads directory
   - Check available disk space
   - Monitor PM2 logs: `pm2 logs linhmai-backend`

2. **Database Connection Issues**
   - Verify MySQL service: `sudo systemctl status mysql`
   - Check database credentials in `.env`
   - Test connection: `mysql -u linhmai_user -p`

3. **High Memory Usage**
   - Monitor with: `pm2 monit`
   - Adjust `max_memory_restart` in PM2 config
   - Optimize MySQL buffer pool size

4. **File Upload Issues**
   - Check upload directory permissions
   - Verify Nginx client_max_body_size
   - Monitor disk space usage

### Performance Optimization

1. **Enable Redis Caching** (Optional)
```bash
sudo apt install redis-server -y
# Configure Redis in your application
```

2. **Database Indexing**
```sql
-- Add indexes for better performance
CREATE INDEX idx_hocvien_email_phone ON HocVien(Email, Phone);
CREATE INDEX idx_video_jobs_status ON VideoProcessingJobs(status, created_at);
CREATE INDEX idx_admin_logs_date ON AdminLogs(created_at);
```

## 📈 Scaling Considerations

### Horizontal Scaling
- Use load balancer (HAProxy/Nginx)
- Separate database server
- Implement Redis for session storage
- Use CDN for static assets

### Vertical Scaling
- Increase server resources
- Optimize database queries
- Implement caching strategies
- Use SSD storage for better I/O

## 🔐 Security Checklist

- ✅ SSL/TLS encryption enabled
- ✅ Firewall configured
- ✅ Database user with limited privileges
- ✅ JWT secrets are secure
- ✅ File upload validation
- ✅ Rate limiting enabled
- ✅ Security headers configured
- ✅ Regular security updates
- ✅ Backup strategy implemented
- ✅ Log monitoring enabled

## 📞 Support

For deployment issues or questions:
- Check logs: `pm2 logs linhmai-backend`
- Monitor system: `pm2 monit`
- Database logs: `sudo tail -f /var/log/mysql/error.log`
- Nginx logs: `sudo tail -f /var/log/nginx/error.log`

---

**Deployment Version:** 2.0.0  
**Last Updated:** $(date)  
**Status:** Production Ready ✅
