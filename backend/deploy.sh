#!/bin/bash

# LinhMai Academy Backend Deployment Script
echo "🚀 Deploying LinhMai Academy Backend..."

# 1. Tạo file .env (nếu chưa có)
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_NAME=linhmai
DB_USER=root
DB_PASS=your_password_here
JWT_SECRET=super-secret-key
NODE_ENV=production
FRONTEND_URL=https://www.linhmai.edu.vn
EOF
    echo "✅ .env file created. Please update DB_PASS and JWT_SECRET!"
else
    echo "✅ .env file already exists"
fi

# 2. Tạo cơ sở dữ liệu MySQL (nếu cần)
echo "📊 Setting up MySQL database..."
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS linhmai CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;" 2>/dev/null || echo "⚠️ Please run: mysql -u root -p -e \"CREATE DATABASE IF NOT EXISTS linhmai CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;\""

# Import database schema
if [ -f init_db.sql ]; then
    echo "📥 Importing database schema..."
    mysql -u root -p linhmai < init_db.sql 2>/dev/null || echo "⚠️ Please run: mysql -u root -p linhmai < init_db.sql"
fi

# 3. Cài các gói backend (nếu chưa có)
echo "📦 Installing dependencies..."
npm install --production

# 4. Chạy backend bằng PM2
echo "🔄 Starting backend with PM2..."
pm2 delete linhmai-backend 2>/dev/null || true
pm2 start server.js --name linhmai-backend

# 5. Lưu cấu hình PM2 để tự khởi động lại sau reboot
echo "💾 Saving PM2 configuration..."
pm2 save
pm2 startup

echo "🎉 Deployment completed!"
echo "🌐 API running at: http://localhost:3000"
echo "📚 API Docs: http://localhost:3000/api/docs"
echo "💚 Health Check: http://localhost:3000/health"
echo ""
echo "📋 Next steps:"
echo "1. Update .env file with your actual database password"
echo "2. Update JWT_SECRET with a secure key"
echo "3. Configure Nginx for your domain (see DEPLOYMENT_GUIDE.md)"
echo "4. Setup SSL certificate"
echo ""
echo "🔧 PM2 Commands:"
echo "- View logs: pm2 logs linhmai-backend"
echo "- Restart: pm2 restart linhmai-backend"
echo "- Stop: pm2 stop linhmai-backend"
echo "- Monitor: pm2 monit"
