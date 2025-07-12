// Thorough testing for Course endpoints with database validation
const request = require('supertest');
const app = require('../server');
const { executeQuery } = require('../config/database');

describe('Course Endpoints (Thorough Testing)', () => {
  let adminToken;
  let testCourseIds = [];

  beforeAll(async () => {
    // Setup admin token
    adminToken = 'Bearer mock_admin_token';
    
    // Clean up any existing test data
    await executeQuery('DELETE FROM KhoaHoc WHERE TenKH LIKE ?', ['Test Course%']);
    
    // Create test courses for pagination and filtering
    const testCourses = [
      {
        TenKH: 'Test Course React Advanced',
        MoTaKH: 'Advanced React course for testing',
        GiaKH: 299000,
        TrangThai: 'active',
        AnhDaiDien: 'https://example.com/react.jpg'
      },
      {
        TenKH: 'Test Course JavaScript Basics',
        MoTaKH: 'Basic JavaScript course for testing',
        GiaKH: 199000,
        TrangThai: 'active',
        AnhDaiDien: 'https://example.com/js.jpg'
      },
      {
        TenKH: 'Test Course Python Free',
        MoTaKH: 'Free Python course for testing',
        GiaKH: 0,
        TrangThai: 'active',
        AnhDaiDien: 'https://example.com/python.jpg'
      },
      {
        TenKH: 'Test Course Draft Course',
        MoTaKH: 'Draft course for testing',
        GiaKH: 150000,
        TrangThai: 'draft',
        AnhDaiDien: 'https://example.com/draft.jpg'
      }
    ];

    for (const course of testCourses) {
      const result = await executeQuery(
        'INSERT INTO KhoaHoc (TenKH, MoTaKH, GiaKH, TrangThai, AnhDaiDien) VALUES (?, ?, ?, ?, ?)',
        [course.TenKH, course.MoTaKH, course.GiaKH, course.TrangThai, course.AnhDaiDien]
      );
      testCourseIds.push(result.insertId);
    }
  });

  afterAll(async () => {
    // Cleanup test data
    if (testCourseIds.length > 0) {
      const placeholders = testCourseIds.map(() => '?').join(',');
      await executeQuery(`DELETE FROM KhoaHoc WHERE IDKH IN (${placeholders})`, testCourseIds);
    }
    await executeQuery('DELETE FROM KhoaHoc WHERE TenKH LIKE ?', ['Test Course%']);
  });

  describe('GET /api/khoahoc', () => {
    it('should return a paginated list of courses', async () => {
      const res = await request(app)
        .get('/api/khoahoc')
        .query({ page: 1, limit: 2 });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeLessThanOrEqual(2);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(2);
      expect(res.body.pagination.total).toBeGreaterThan(0);
      expect(res.body.pagination.totalPages).toBeGreaterThan(0);
    });

    it('should filter courses by name', async () => {
      const res = await request(app)
        .get('/api/khoahoc')
        .query({ search: 'React' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      
      // All returned courses should contain 'React' in the name
      res.body.data.forEach(course => {
        expect(course.title.toLowerCase()).toContain('react');
      });
    });

    it('should filter courses by price range', async () => {
      const res = await request(app)
        .get('/api/khoahoc')
        .query({ minPrice: 0, maxPrice: 0 });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      
      // All returned courses should be free
      res.body.data.forEach(course => {
        expect(course.price).toBe(0);
      });
    });

    it('should filter courses by status', async () => {
      const res = await request(app)
        .get('/api/khoahoc')
        .query({ status: 'active' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      
      // All returned courses should be active
      res.body.data.forEach(course => {
        expect(course.status).toBe('active');
      });
    });

    it('should return only active courses for non-admin users', async () => {
      const res = await request(app)
        .get('/api/khoahoc');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      
      // Should not include draft courses for public access
      res.body.data.forEach(course => {
        expect(course.status).not.toBe('draft');
      });
    });

    it('should handle empty results gracefully', async () => {
      const res = await request(app)
        .get('/api/khoahoc')
        .query({ search: 'NonExistentCourse12345' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBe(0);
    });

    it('should handle invalid pagination parameters', async () => {
      const res = await request(app)
        .get('/api/khoahoc')
        .query({ page: -1, limit: 0 });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      // Should default to valid pagination values
      expect(res.body.pagination.page).toBeGreaterThan(0);
      expect(res.body.pagination.limit).toBeGreaterThan(0);
    });
  });

  describe('GET /api/khoahoc/featured', () => {
    it('should return featured courses', async () => {
      const res = await request(app)
        .get('/api/khoahoc/featured');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('should limit featured courses to specified number', async () => {
      const res = await request(app)
        .get('/api/khoahoc/featured')
        .query({ limit: 2 });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeLessThanOrEqual(2);
    });
  });

  describe('GET /api/khoahoc/:id', () => {
    it('should get course by ID successfully', async () => {
      const courseId = testCourseIds[0];
      
      const res = await request(app)
        .get(`/api/khoahoc/${courseId}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.id).toBe(courseId.toString());
    });

    it('should return 404 for non-existent course', async () => {
      const res = await request(app)
        .get('/api/khoahoc/99999');

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should include course chapters when available', async () => {
      const courseId = testCourseIds[0];
      
      // Create a test chapter
      const chapterResult = await executeQuery(
        'INSERT INTO ChuongHoc (IDKH, TenCH, ThuTuCH, MoTaCH) VALUES (?, ?, ?, ?)',
        [courseId, 'Test Chapter', 1, 'Test chapter description']
      );
      
      const res = await request(app)
        .get(`/api/khoahoc/${courseId}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('chapters');
      
      // Cleanup
      await executeQuery('DELETE FROM ChuongHoc WHERE IDCH = ?', [chapterResult.insertId]);
    });
  });

  describe('POST /api/khoahoc (Admin only)', () => {
    it('should create a new course successfully', async () => {
      const courseData = {
        TenKH: 'Test Course New Creation',
        MoTaKH: 'Description for new course',
        GiaKH: 399000,
        TrangThai: 'active',
        AnhDaiDien: 'https://example.com/new-course.jpg'
      };

      const res = await request(app)
        .post('/api/khoahoc')
        .set('Authorization', adminToken)
        .send(courseData);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.title).toBe(courseData.TenKH);

      // Verify database insertion
      const dbResult = await executeQuery('SELECT * FROM KhoaHoc WHERE IDKH = ?', [res.body.data.id]);
      expect(dbResult.length).toBe(1);
      expect(dbResult[0].TenKH).toBe(courseData.TenKH);
      
      // Add to cleanup list
      testCourseIds.push(parseInt(res.body.data.id));
    });

    it('should return error when required fields are missing', async () => {
      const courseData = {
        MoTaKH: 'Description without title'
      };

      const res = await request(app)
        .post('/api/khoahoc')
        .set('Authorization', adminToken)
        .send(courseData);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return error when not authenticated', async () => {
      const courseData = {
        TenKH: 'Test Course',
        MoTaKH: 'Description',
        GiaKH: 100000
      };

      const res = await request(app)
        .post('/api/khoahoc')
        .send(courseData);

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should handle invalid price values', async () => {
      const courseData = {
        TenKH: 'Test Course Invalid Price',
        MoTaKH: 'Description',
        GiaKH: -100
      };

      const res = await request(app)
        .post('/api/khoahoc')
        .set('Authorization', adminToken)
        .send(courseData);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/khoahoc/:id (Admin only)', () => {
    it('should update course successfully', async () => {
      const courseId = testCourseIds[0];
      const updateData = {
        TenKH: 'Updated Course Title',
        GiaKH: 450000
      };

      const res = await request(app)
        .put(`/api/khoahoc/${courseId}`)
        .set('Authorization', adminToken)
        .send(updateData);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe(updateData.TenKH);

      // Verify database update
      const dbResult = await executeQuery('SELECT * FROM KhoaHoc WHERE IDKH = ?', [courseId]);
      expect(dbResult[0].TenKH).toBe(updateData.TenKH);
      expect(dbResult[0].GiaKH).toBe(updateData.GiaKH);
    });

    it('should return 404 for non-existent course update', async () => {
      const res = await request(app)
        .put('/api/khoahoc/99999')
        .set('Authorization', adminToken)
        .send({ TenKH: 'Updated Title' });

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('DELETE /api/khoahoc/:id (Admin only)', () => {
    it('should delete course successfully', async () => {
      // Create a course to delete
      const result = await executeQuery(
        'INSERT INTO KhoaHoc (TenKH, MoTaKH, GiaKH, TrangThai) VALUES (?, ?, ?, ?)',
        ['Course to Delete', 'Description', 100000, 'draft']
      );
      const courseToDeleteId = result.insertId;

      const res = await request(app)
        .delete(`/api/khoahoc/${courseToDeleteId}`)
        .set('Authorization', adminToken);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify database deletion
      const dbResult = await executeQuery('SELECT * FROM KhoaHoc WHERE IDKH = ?', [courseToDeleteId]);
      expect(dbResult.length).toBe(0);
    });

    it('should return 404 for non-existent course deletion', async () => {
      const res = await request(app)
        .delete('/api/khoahoc/99999')
        .set('Authorization', adminToken);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/khoahoc/:id/statistics (Admin only)', () => {
    it('should return course statistics for admin', async () => {
      const courseId = testCourseIds[0];

      const res = await request(app)
        .get(`/api/khoahoc/${courseId}/statistics`)
        .set('Authorization', adminToken);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('studentCount');
      expect(res.body.data).toHaveProperty('revenue');
      expect(res.body.data).toHaveProperty('completionRate');
    });

    it('should return 403 for non-admin users', async () => {
      const courseId = testCourseIds[0];

      const res = await request(app)
        .get(`/api/khoahoc/${courseId}/statistics`);

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
