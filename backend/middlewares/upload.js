const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Tạo thư mục uploads nếu chưa tồn tại
const createUploadDirs = () => {
  const dirs = [
    './uploads',
    './uploads/videos',
    './uploads/images',
    './uploads/documents'
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Đã tạo thư mục: ${dir}`);
    }
  });
};

// Khởi tạo thư mục
createUploadDirs();

// Cấu hình storage cho video
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/videos/');
  },
  filename: (req, file, cb) => {
    // Tạo tên file unique: timestamp_originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}_${uniqueSuffix}${ext}`);
  }
});

// Cấu hình storage cho hình ảnh
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/images/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}_${uniqueSuffix}${ext}`);
  }
});

// Cấu hình storage cho tài liệu
const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/documents/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}_${uniqueSuffix}${ext}`);
  }
});

// File filter cho video - chỉ chấp nhận MP4
const videoFileFilter = (req, file, cb) => {
  const allowedTypes = ['video/mp4'];
  const allowedExtensions = ['.mp4'];
  
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file video MP4'), false);
  }
};

// File filter cho hình ảnh
const imageFileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file hình ảnh (JPEG, PNG, GIF, WebP)'), false);
  }
};

// File filter cho tài liệu
const documentFileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file tài liệu (PDF, DOC, DOCX, PPT, PPTX, TXT)'), false);
  }
};

// Cấu hình upload video
const uploadVideo = multer({
  storage: videoStorage,
  fileFilter: videoFileFilter,
  limits: {
    fileSize: 1024 * 1024 * 1024, // 1GB
    files: 3 // Tối đa 3 file (480p, 720p, 1080p)
  }
});

// Cấu hình upload hình ảnh
const uploadImage = multer({
  storage: imageStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1
  }
});

// Cấu hình upload tài liệu
const uploadDocument = multer({
  storage: documentStorage,
  fileFilter: documentFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5
  }
});

// Middleware xử lý lỗi upload
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File quá lớn. Vui lòng chọn file nhỏ hơn.'
      });
    } else if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Quá nhiều file. Vui lòng chọn ít file hơn.'
      });
    } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Tên field không đúng hoặc quá nhiều file.'
      });
    }
  } else if (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  next();
};

// Utility function để xóa file
const deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🗑️ Đã xóa file: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Lỗi xóa file:', error.message);
    return false;
  }
};

// Utility function để tạo URL file
const getFileUrl = (req, filePath) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  return `${baseUrl}/${filePath.replace(/\\/g, '/')}`;
};

module.exports = {
  uploadVideo,
  uploadImage,
  uploadDocument,
  handleUploadError,
  deleteFile,
  getFileUrl,
  createUploadDirs
};
