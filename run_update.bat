 
@echo off
echo === BẮT ĐẦU CẬP NHẬT HỆ THỐNG ===

:: Kéo code mới từ Git
git pull origin main

:: Cài dependencies nếu cần
npm install

:: Build frontend
cd frontend
npm run build
cd ..

:: Khởi động lại backend bằng PM2
pm2 restart backend

:: Khởi động lại frontend bằng PM2
pm2 restart frontend

echo === HOÀN TẤT ===
pause
