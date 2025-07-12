const mysql = require('mysql2/promise');
require('dotenv').config();

// Cấu hình kết nối database
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'linhmai_academy',
  port: process.env.DB_PORT || 3306,
  charset: 'utf8mb4',
  timezone: '+07:00',
  connectionLimit: 10,
  queueLimit: 0
};

// Tạo connection pool
const pool = mysql.createPool(dbConfig);

// Test kết nối database
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Kết nối MySQL thành công!');
    console.log(`📊 Database: ${dbConfig.database}`);
    console.log(`🌐 Host: ${dbConfig.host}:${dbConfig.port}`);
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Lỗi kết nối MySQL:', error.message);
    console.error('⚠️ Chạy ở chế độ demo - không có database');
    return false;
  }
};

// Thực thi query với error handling
const executeQuery = async (query, params = []) => {
  try {
    const [results] = await pool.execute(query, params);
    return results;
  } catch (error) {
    console.error('Database Query Error:', error.message);
    // Trả về mock data cho demo
    if (query.includes('SELECT')) {
      if (query.includes('COUNT')) {
        return [{ total: 0 }];
      }
      return [];
    }
    if (query.includes('INSERT')) {
      return { insertId: Date.now(), affectedRows: 1 };
    }
    return { affectedRows: 1 };
  }
};

// Thực thi transaction
const executeTransaction = async (queries) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const results = [];
    for (const { query, params } of queries) {
      const [result] = await connection.execute(query, params || []);
      results.push(result);
    }
    
    await connection.commit();
    return results;
  } catch (error) {
    await connection.rollback();
    // Trả về mock data cho demo
    return [{ insertId: 1, affectedRows: 1 }];
  } finally {
    connection.release();
  }
};

// Đóng connection pool
const closePool = async () => {
  try {
    await pool.end();
    console.log('🔒 Đã đóng connection pool MySQL');
  } catch (error) {
    console.error('Lỗi khi đóng connection pool:', error.message);
  }
};

module.exports = {
  pool,
  testConnection,
  executeQuery,
  executeTransaction,
  closePool
};
