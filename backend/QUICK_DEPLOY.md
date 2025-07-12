# 🚀 Quick Deploy Guide for LinhMai Academy Backend

## One-Command Deployment

Run the deployment script:
```bash
chmod +x deploy.sh
./deploy.sh
```

## Manual Step-by-Step Deployment

### 1. Create .env file
```bash
echo "PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_NAME=linhmai
DB_USER=root
DB_PASS=your_password_here
JWT_SECRET=super-secret-key
NODE_ENV=production
FRONTEND_URL=https://www.linhmai.edu.vn" > .env
```

### 2. Create MySQL database
```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS linhmai CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;"
```

### 3. Import database schema
```bash
mysql -u root -p linhmai < init_db.sql
```

### 4. Install dependencies
```bash
npm install --production
```

### 5. Start with PM2
```bash
pm2 start server.js --name linhmai-backend
```

### 6. Save PM2 configuration (run once)
```bash
pm2 save
pm2 startup
```

## 🔧 PM2 Management Commands

```bash
# View logs
pm2 logs linhmai-backend

# Restart application
pm2 restart linhmai-backend

# Stop application
pm2 stop linhmai-backend

# Monitor resources
pm2 monit

# View status
pm2 status
```

## 🌐 API Endpoints

Once deployed, your API will be available at:
- **Base URL:** http://localhost:3000 (or your domain)
- **Documentation:** http://localhost:3000/api/docs
- **Health Check:** http://localhost:3000/health

## 🔐 Default Login Credentials

**Admin Account:**
- Email: admin@linhmai.edu.vn
- Password: password

**Student Account:**
- Email: student@linhmai.edu.vn
- Password: password

## 📝 Important Notes

1. **Update .env file** with your actual database password
2. **Change JWT_SECRET** to a secure random string (minimum 32 characters)
3. **Update default passwords** after first login
4. **Configure Nginx** for production domain (see DEPLOYMENT_GUIDE.md)
5. **Setup SSL certificate** for HTTPS

## 🆘 Troubleshooting

**Database connection error:**
```bash
# Check MySQL service
sudo systemctl status mysql
sudo systemctl start mysql
```

**PM2 not starting:**
```bash
# Check logs
pm2 logs linhmai-backend

# Restart PM2
pm2 restart linhmai-backend
```

**Port already in use:**
```bash
# Check what's using port 3000
netstat -tlnp | grep 3000

# Kill process if needed
sudo kill -9 <PID>
```

---

**LinhMai Academy Backend - Ready for linhmai.edu.vn deployment! 🎓**
