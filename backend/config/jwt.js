const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_here_change_in_production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Tạo JWT token
const generateToken = (payload) => {
  try {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'linhmai-academy',
      audience: 'linhmai-users'
    });
  } catch (error) {
    console.error('Lỗi tạo JWT token:', error.message);
    throw new Error('Không thể tạo token');
  }
};

// Xác thực JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'linhmai-academy',
      audience: 'linhmai-users'
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token đã hết hạn');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Token không hợp lệ');
    } else {
      throw new Error('Lỗi xác thực token');
    }
  }
};

// Giải mã token không cần verify (để lấy thông tin)
const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    console.error('Lỗi giải mã token:', error.message);
    return null;
  }
};

// Tạo refresh token
const generateRefreshToken = (payload) => {
  try {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: '7d',
      issuer: 'linhmai-academy',
      audience: 'linhmai-refresh'
    });
  } catch (error) {
    console.error('Lỗi tạo refresh token:', error.message);
    throw new Error('Không thể tạo refresh token');
  }
};

// Xác thực refresh token
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'linhmai-academy',
      audience: 'linhmai-refresh'
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Refresh token đã hết hạn');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Refresh token không hợp lệ');
    } else {
      throw new Error('Lỗi xác thực refresh token');
    }
  }
};

module.exports = {
  generateToken,
  verifyToken,
  decodeToken,
  generateRefreshToken,
  verifyRefreshToken,
  JWT_SECRET,
  JWT_EXPIRES_IN
};
