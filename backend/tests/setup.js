const { executeQuery } = require('../config/database');

// Global test setup
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  
  // You can add global test database setup here
  console.log('🧪 Setting up test environment...');
  
  // Example: Create test database or connect to test DB
  // await setupTestDatabase();
});

afterAll(async () => {
  // Global cleanup
  console.log('🧹 Cleaning up test environment...');
  
  // Close database connections
  // await closeTestDatabase();
});

// Mock authentication for tests
global.mockAdminToken = 'Bearer mock_admin_token';
global.mockUserToken = 'Bearer mock_user_token';

// Mock file paths for testing
global.mockFilePaths = {
  video: '/path/to/test/video.mp4',
  image: '/path/to/test/image.jpg',
  document: '/path/to/test/document.pdf'
};

// Helper function to create test data
global.createTestData = async (table, data) => {
  try {
    const fields = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const values = Object.values(data);
    
    const result = await executeQuery(
      `INSERT INTO ${table} (${fields}) VALUES (${placeholders})`,
      values
    );
    
    return result.insertId;
  } catch (error) {
    console.error(`Error creating test data for ${table}:`, error);
    throw error;
  }
};

// Helper function to cleanup test data
global.cleanupTestData = async (table, condition, values = []) => {
  try {
    await executeQuery(`DELETE FROM ${table} WHERE ${condition}`, values);
  } catch (error) {
    console.error(`Error cleaning up test data from ${table}:`, error);
    throw error;
  }
};

// Mock multer for file upload tests
jest.mock('multer', () => {
  const multer = jest.requireActual('multer');
  
  return {
    ...multer,
    diskStorage: jest.fn(() => ({
      destination: jest.fn((req, file, cb) => cb(null, './uploads/test/')),
      filename: jest.fn((req, file, cb) => cb(null, `test-${Date.now()}-${file.originalname}`))
    }))
  };
});

// Increase timeout for database operations
jest.setTimeout(30000);
