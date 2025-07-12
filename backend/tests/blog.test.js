// Thorough testing for Blog endpoints with database validation
const request = require('supertest');
const app = require('../server');
const { executeQuery } = require('../config/database');

describe('Blog Endpoints (Thorough Testing)', () => {
  let adminToken;
  let testBlogId;

  beforeAll(async () => {
    // Setup test database or use test environment
    // Create admin user and get token for authentication
    const adminUser = {
      email: 'admin@test.com',
      password: 'testpassword'
    };
    
    // Mock or create admin token
    adminToken = 'Bearer mock_admin_token'; // Replace with actual token generation
    
    // Clean up any existing test data
    await executeQuery('DELETE FROM Blog WHERE TacGia = ?', ['Test Author']);
  });

  afterAll(async () => {
    // Cleanup test data
    if (testBlogId) {
      await executeQuery('DELETE FROM Blog WHERE IDBlog = ?', [testBlogId]);
    }
    await executeQuery('DELETE FROM Blog WHERE TacGia = ?', ['Test Author']);
  });

  describe('POST /api/blog', () => {
    it('should create a blog with full valid data successfully', async () => {
      const blogData = {
        TieuDe: 'Test Blog Title',
        NoiDung: 'This is a test blog content with more than 100 characters to meet the validation requirements for blog content length.',
        TacGia: 'Test Author',
        TrangThai: 'published',
        AnhDaiDien: 'https://example.com/image.jpg',
        SEO: {
          keywords: ['test', 'blog'],
          description: 'Test blog description'
        }
      };

      const res = await request(app)
        .post('/api/blog')
        .set('Authorization', adminToken)
        .send(blogData);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.title).toBe(blogData.TieuDe);
      
      testBlogId = res.body.data.id;

      // Verify database insertion
      const dbResult = await executeQuery('SELECT * FROM Blog WHERE IDBlog = ?', [testBlogId]);
      expect(dbResult.length).toBe(1);
      expect(dbResult[0].TieuDe).toBe(blogData.TieuDe);
    });

    it('should return error when title is missing', async () => {
      const blogData = {
        NoiDung: 'This is a test blog content with sufficient length.',
        TacGia: 'Test Author'
      };

      const res = await request(app)
        .post('/api/blog')
        .set('Authorization', adminToken)
        .send(blogData);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });

    it('should return error when title is too short', async () => {
      const blogData = {
        TieuDe: 'Short',
        NoiDung: 'This is a test blog content with sufficient length.',
        TacGia: 'Test Author'
      };

      const res = await request(app)
        .post('/api/blog')
        .set('Authorization', adminToken)
        .send(blogData);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return error when content is too short', async () => {
      const blogData = {
        TieuDe: 'Valid Blog Title',
        NoiDung: 'Short content',
        TacGia: 'Test Author'
      };

      const res = await request(app)
        .post('/api/blog')
        .set('Authorization', adminToken)
        .send(blogData);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return error when invalid status is provided', async () => {
      const blogData = {
        TieuDe: 'Valid Blog Title',
        NoiDung: 'This is a test blog content with sufficient length.',
        TacGia: 'Test Author',
        TrangThai: 'invalid_status'
      };

      const res = await request(app)
        .post('/api/blog')
        .set('Authorization', adminToken)
        .send(blogData);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return error when not authenticated', async () => {
      const blogData = {
        TieuDe: 'Valid Blog Title',
        NoiDung: 'This is a test blog content with sufficient length.',
        TacGia: 'Test Author'
      };

      const res = await request(app)
        .post('/api/blog')
        .send(blogData);

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/blog', () => {
    beforeAll(async () => {
      // Create test blogs for pagination and filtering tests
      const testBlogs = [
        {
          TieuDe: 'Published Blog 1',
          NoiDung: 'Content for published blog 1 with sufficient length for validation.',
          TacGia: 'Test Author',
          TrangThai: 'published'
        },
        {
          TieuDe: 'Published Blog 2',
          NoiDung: 'Content for published blog 2 with sufficient length for validation.',
          TacGia: 'Test Author',
          TrangThai: 'published'
        },
        {
          TieuDe: 'Draft Blog 1',
          NoiDung: 'Content for draft blog 1 with sufficient length for validation.',
          TacGia: 'Test Author',
          TrangThai: 'draft'
        }
      ];

      for (const blog of testBlogs) {
        await executeQuery(
          'INSERT INTO Blog (TieuDe, NoiDung, TacGia, TrangThai) VALUES (?, ?, ?, ?)',
          [blog.TieuDe, blog.NoiDung, blog.TacGia, blog.TrangThai]
        );
      }
    });

    it('should handle pagination correctly', async () => {
      const res = await request(app)
        .get('/api/blog')
        .query({ page: 1, limit: 2 });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(2);
      expect(res.body.pagination.total).toBeGreaterThan(0);
    });

    it('should handle search by title', async () => {
      const res = await request(app)
        .get('/api/blog')
        .query({ search: 'Published Blog 1' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].title).toContain('Published Blog 1');
    });

    it('should filter by status for admin users', async () => {
      const res = await request(app)
        .get('/api/blog')
        .set('Authorization', adminToken)
        .query({ status: 'draft' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      // Should include draft blogs for admin
    });

    it('should only show published blogs for non-admin users', async () => {
      const res = await request(app)
        .get('/api/blog');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      // All returned blogs should be published
      res.body.data.forEach(blog => {
        expect(blog.status).toBe('published');
      });
    });

    it('should filter by author', async () => {
      const res = await request(app)
        .get('/api/blog')
        .query({ author: 'Test Author' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      res.body.data.forEach(blog => {
        expect(blog.author).toBe('Test Author');
      });
    });
  });

  describe('GET /api/blog/:id', () => {
    it('should get blog by ID successfully', async () => {
      if (!testBlogId) {
        // Create a test blog if not exists
        const result = await executeQuery(
          'INSERT INTO Blog (TieuDe, NoiDung, TacGia, TrangThai) VALUES (?, ?, ?, ?)',
          ['Test Blog for Get', 'Content for get test with sufficient length.', 'Test Author', 'published']
        );
        testBlogId = result.insertId;
      }

      const res = await request(app)
        .get(`/api/blog/${testBlogId}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.id).toBe(testBlogId.toString());
    });

    it('should return 404 for non-existent blog', async () => {
      const res = await request(app)
        .get('/api/blog/99999');

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should increment view count for non-admin users', async () => {
      if (!testBlogId) return;

      const initialRes = await request(app)
        .get(`/api/blog/${testBlogId}`);
      
      const initialViews = initialRes.body.data.views;

      const res = await request(app)
        .get(`/api/blog/${testBlogId}`);

      expect(res.body.data.views).toBe(initialViews + 1);
    });
  });

  describe('PUT /api/blog/:id', () => {
    it('should update blog successfully', async () => {
      if (!testBlogId) return;

      const updateData = {
        TieuDe: 'Updated Blog Title',
        TrangThai: 'published'
      };

      const res = await request(app)
        .put(`/api/blog/${testBlogId}`)
        .set('Authorization', adminToken)
        .send(updateData);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe(updateData.TieuDe);

      // Verify database update
      const dbResult = await executeQuery('SELECT * FROM Blog WHERE IDBlog = ?', [testBlogId]);
      expect(dbResult[0].TieuDe).toBe(updateData.TieuDe);
    });

    it('should return 404 for non-existent blog update', async () => {
      const res = await request(app)
        .put('/api/blog/99999')
        .set('Authorization', adminToken)
        .send({ TieuDe: 'Updated Title' });

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('DELETE /api/blog/:id', () => {
    it('should delete blog successfully', async () => {
      // Create a blog to delete
      const result = await executeQuery(
        'INSERT INTO Blog (TieuDe, NoiDung, TacGia, TrangThai) VALUES (?, ?, ?, ?)',
        ['Blog to Delete', 'Content for deletion test with sufficient length.', 'Test Author', 'draft']
      );
      const blogToDeleteId = result.insertId;

      const res = await request(app)
        .delete(`/api/blog/${blogToDeleteId}`)
        .set('Authorization', adminToken);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify database deletion
      const dbResult = await executeQuery('SELECT * FROM Blog WHERE IDBlog = ?', [blogToDeleteId]);
      expect(dbResult.length).toBe(0);
    });

    it('should return 404 for non-existent blog deletion', async () => {
      const res = await request(app)
        .delete('/api/blog/99999')
        .set('Authorization', adminToken);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
