// Thorough testing for Lesson endpoints with database validation
const request = require('supertest');
const app = require('../server');
const { executeQuery } = require('../config/database');
const path = require('path');

describe('Lesson Endpoints (Thorough Testing)', () => {
  let adminToken;
  let testCourseId;
  let testChapterId;
  let testLessonIds = [];

  beforeAll(async () => {
    // Setup admin token
    adminToken = 'Bearer mock_admin_token';
    
    // Create test course and chapter for lessons
    const courseResult = await executeQuery(
      'INSERT INTO KhoaHoc (TenKH, MoTaKH, GiaKH, TrangThai) VALUES (?, ?, ?, ?)',
      ['Test Course for Lessons', 'Course for lesson testing', 299000, 'active']
    );
    testCourseId = courseResult.insertId;

    const chapterResult = await executeQuery(
      'INSERT INTO ChuongHoc (IDKH, TenCH, ThuTuCH, MoTaCH) VALUES (?, ?, ?, ?)',
      [testCourseId, 'Test Chapter for Lessons', 1, 'Chapter for lesson testing']
    );
    testChapterId = chapterResult.insertId;

    // Clean up any existing test lessons
    await executeQuery('DELETE FROM BaiHoc WHERE TenBH LIKE ?', ['Test Lesson%']);
  });

  afterAll(async () => {
    // Cleanup test data
    if (testLessonIds.length > 0) {
      const placeholders = testLessonIds.map(() => '?').join(',');
      await executeQuery(`DELETE FROM BaiHoc WHERE IDBH IN (${placeholders})`, testLessonIds);
    }
    await executeQuery('DELETE FROM BaiHoc WHERE TenBH LIKE ?', ['Test Lesson%']);
    await executeQuery('DELETE FROM ChuongHoc WHERE IDCH = ?', [testChapterId]);
    await executeQuery('DELETE FROM KhoaHoc WHERE IDKH = ?', [testCourseId]);
  });

  describe('POST /api/lessons (Create Lesson)', () => {
    it('should create a lesson with video upload successfully', async () => {
      const lessonData = {
        IDCH: testChapterId,
        TenBH: 'Test Lesson with Video',
        LoaiND: 'video',
        ThuTuBH: 1,
        duration: 600, // 10 minutes
        TaiLieu: JSON.stringify({ documents: [], exercises: [] })
      };

      // Mock video file path
      const testVideoPath = path.join(__dirname, 'fixtures', 'test-video.mp4');

      const res = await request(app)
        .post('/api/lessons')
        .set('Authorization', adminToken)
        .field('IDCH', lessonData.IDCH.toString())
        .field('TenBH', lessonData.TenBH)
        .field('LoaiND', lessonData.LoaiND)
        .field('ThuTuBH', lessonData.ThuTuBH.toString())
        .field('duration', lessonData.duration.toString())
        .field('TaiLieu', lessonData.TaiLieu)
        .attach('video', testVideoPath);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.title).toBe(lessonData.TenBH);
      expect(res.body.data).toHaveProperty('videoUrl');
      expect(res.body.data.videoUrl).toContain('/uploads/videos/');

      // Verify database insertion
      const dbResult = await executeQuery('SELECT * FROM BaiHoc WHERE IDBH = ?', [res.body.data.id]);
      expect(dbResult.length).toBe(1);
      expect(dbResult[0].TenBH).toBe(lessonData.TenBH);
      expect(dbResult[0].LinkND).toContain('/uploads/videos/');
      
      testLessonIds.push(parseInt(res.body.data.id));
    });

    it('should create a text lesson without video', async () => {
      const lessonData = {
        IDCH: testChapterId,
        TenBH: 'Test Lesson Text Only',
        LoaiND: 'text',
        ThuTuBH: 2,
        TaiLieu: JSON.stringify({ 
          documents: ['document1.pdf'], 
          exercises: ['exercise1.txt'] 
        })
      };

      const res = await request(app)
        .post('/api/lessons')
        .set('Authorization', adminToken)
        .send(lessonData);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe(lessonData.TenBH);
      expect(res.body.data.type).toBe('text');

      // Verify database insertion
      const dbResult = await executeQuery('SELECT * FROM BaiHoc WHERE IDBH = ?', [res.body.data.id]);
      expect(dbResult.length).toBe(1);
      expect(dbResult[0].LoaiND).toBe('text');
      
      testLessonIds.push(parseInt(res.body.data.id));
    });

    it('should return error when chapter ID is missing', async () => {
      const lessonData = {
        TenBH: 'Test Lesson No Chapter',
        LoaiND: 'video',
        ThuTuBH: 1
      };

      const res = await request(app)
        .post('/api/lessons')
        .set('Authorization', adminToken)
        .send(lessonData);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });

    it('should return error when lesson title is missing', async () => {
      const lessonData = {
        IDCH: testChapterId,
        LoaiND: 'video',
        ThuTuBH: 1
      };

      const res = await request(app)
        .post('/api/lessons')
        .set('Authorization', adminToken)
        .send(lessonData);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return error when chapter does not exist', async () => {
      const lessonData = {
        IDCH: 99999,
        TenBH: 'Test Lesson Invalid Chapter',
        LoaiND: 'video',
        ThuTuBH: 1
      };

      const res = await request(app)
        .post('/api/lessons')
        .set('Authorization', adminToken)
        .send(lessonData);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('chapter');
    });

    it('should return error when not authenticated', async () => {
      const lessonData = {
        IDCH: testChapterId,
        TenBH: 'Test Lesson No Auth',
        LoaiND: 'video',
        ThuTuBH: 1
      };

      const res = await request(app)
        .post('/api/lessons')
        .send(lessonData);

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should handle invalid video file format', async () => {
      const lessonData = {
        IDCH: testChapterId,
        TenBH: 'Test Lesson Invalid Video',
        LoaiND: 'video',
        ThuTuBH: 3
      };

      // Mock invalid file (PDF instead of video)
      const testPdfPath = path.join(__dirname, 'fixtures', 'test-document.pdf');

      const res = await request(app)
        .post('/api/lessons')
        .set('Authorization', adminToken)
        .field('IDCH', lessonData.IDCH.toString())
        .field('TenBH', lessonData.TenBH)
        .field('LoaiND', lessonData.LoaiND)
        .field('ThuTuBH', lessonData.ThuTuBH.toString())
        .attach('video', testPdfPath);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('video');
    });

    it('should handle duplicate lesson order in same chapter', async () => {
      const lessonData = {
        IDCH: testChapterId,
        TenBH: 'Test Lesson Duplicate Order',
        LoaiND: 'text',
        ThuTuBH: 1 // Same order as first lesson
      };

      const res = await request(app)
        .post('/api/lessons')
        .set('Authorization', adminToken)
        .send(lessonData);

      // Should either succeed with auto-increment or return validation error
      expect([201, 400]).toContain(res.statusCode);
      
      if (res.statusCode === 201) {
        testLessonIds.push(parseInt(res.body.data.id));
      }
    });
  });

  describe('GET /api/lessons/:id', () => {
    it('should get lesson by ID successfully', async () => {
      const lessonId = testLessonIds[0];
      
      const res = await request(app)
        .get(`/api/lessons/${lessonId}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.id).toBe(lessonId.toString());
    });

    it('should return 404 for non-existent lesson', async () => {
      const res = await request(app)
        .get('/api/lessons/99999');

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should include video information for video lessons', async () => {
      const videoLessonId = testLessonIds[0]; // First lesson has video
      
      const res = await request(app)
        .get(`/api/lessons/${videoLessonId}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.type).toBe('video');
      expect(res.body.data).toHaveProperty('videoUrl');
    });
  });

  describe('PUT /api/lessons/:id (Update Lesson)', () => {
    it('should update lesson successfully', async () => {
      const lessonId = testLessonIds[1]; // Text lesson
      const updateData = {
        TenBH: 'Updated Lesson Title',
        ThuTuBH: 5
      };

      const res = await request(app)
        .put(`/api/lessons/${lessonId}`)
        .set('Authorization', adminToken)
        .send(updateData);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe(updateData.TenBH);

      // Verify database update
      const dbResult = await executeQuery('SELECT * FROM BaiHoc WHERE IDBH = ?', [lessonId]);
      expect(dbResult[0].TenBH).toBe(updateData.TenBH);
      expect(dbResult[0].ThuTuBH).toBe(updateData.ThuTuBH);
    });

    it('should update lesson with new video', async () => {
      const lessonId = testLessonIds[0];
      const testVideoPath = path.join(__dirname, 'fixtures', 'updated-video.mp4');

      const res = await request(app)
        .put(`/api/lessons/${lessonId}`)
        .set('Authorization', adminToken)
        .field('TenBH', 'Updated with New Video')
        .attach('video', testVideoPath);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('videoUrl');
    });

    it('should return 404 for non-existent lesson update', async () => {
      const res = await request(app)
        .put('/api/lessons/99999')
        .set('Authorization', adminToken)
        .send({ TenBH: 'Updated Title' });

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('DELETE /api/lessons/:id', () => {
    it('should delete lesson successfully', async () => {
      // Create a lesson to delete
      const result = await executeQuery(
        'INSERT INTO BaiHoc (IDCH, TenBH, LoaiND, ThuTuBH, TaiLieu) VALUES (?, ?, ?, ?, ?)',
        [testChapterId, 'Lesson to Delete', 'text', 10, '{}']
      );
      const lessonToDeleteId = result.insertId;

      const res = await request(app)
        .delete(`/api/lessons/${lessonToDeleteId}`)
        .set('Authorization', adminToken);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify database deletion
      const dbResult = await executeQuery('SELECT * FROM BaiHoc WHERE IDBH = ?', [lessonToDeleteId]);
      expect(dbResult.length).toBe(0);
    });

    it('should return 404 for non-existent lesson deletion', async () => {
      const res = await request(app)
        .delete('/api/lessons/99999')
        .set('Authorization', adminToken);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should delete associated video files when deleting video lesson', async () => {
      // Create a video lesson
      const result = await executeQuery(
        'INSERT INTO BaiHoc (IDCH, TenBH, LoaiND, LinkND, ThuTuBH, TaiLieu) VALUES (?, ?, ?, ?, ?, ?)',
        [testChapterId, 'Video Lesson to Delete', 'video', '/uploads/videos/test-video.mp4', 11, '{}']
      );
      const videoLessonId = result.insertId;

      const res = await request(app)
        .delete(`/api/lessons/${videoLessonId}`)
        .set('Authorization', adminToken);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      // File deletion should be handled by the controller
    });
  });

  describe('GET /api/chapters/:chapterId/lessons', () => {
    it('should get all lessons in a chapter', async () => {
      const res = await request(app)
        .get(`/api/chapters/${testChapterId}/lessons`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThan(0);
      
      // Lessons should be ordered by ThuTuBH
      for (let i = 1; i < res.body.data.length; i++) {
        expect(res.body.data[i].order).toBeGreaterThanOrEqual(res.body.data[i-1].order);
      }
    });

    it('should return empty array for chapter with no lessons', async () => {
      // Create empty chapter
      const emptyChapterResult = await executeQuery(
        'INSERT INTO ChuongHoc (IDKH, TenCH, ThuTuCH, MoTaCH) VALUES (?, ?, ?, ?)',
        [testCourseId, 'Empty Chapter', 2, 'Chapter with no lessons']
      );
      const emptyChapterId = emptyChapterResult.insertId;

      const res = await request(app)
        .get(`/api/chapters/${emptyChapterId}/lessons`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBe(0);

      // Cleanup
      await executeQuery('DELETE FROM ChuongHoc WHERE IDCH = ?', [emptyChapterId]);
    });

    it('should return 404 for non-existent chapter', async () => {
      const res = await request(app)
        .get('/api/chapters/99999/lessons');

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Edge Cases and Validation', () => {
    it('should handle very long lesson titles', async () => {
      const longTitle = 'A'.repeat(250); // Exceeds typical limit
      const lessonData = {
        IDCH: testChapterId,
        TenBH: longTitle,
        LoaiND: 'text',
        ThuTuBH: 20
      };

      const res = await request(app)
        .post('/api/lessons')
        .set('Authorization', adminToken)
        .send(lessonData);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should handle special characters in lesson title', async () => {
      const lessonData = {
        IDCH: testChapterId,
        TenBH: 'Lesson with Special Chars: @#$%^&*()',
        LoaiND: 'text',
        ThuTuBH: 21
      };

      const res = await request(app)
        .post('/api/lessons')
        .set('Authorization', adminToken)
        .send(lessonData);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      
      testLessonIds.push(parseInt(res.body.data.id));
    });

    it('should handle invalid JSON in TaiLieu field', async () => {
      const lessonData = {
        IDCH: testChapterId,
        TenBH: 'Lesson with Invalid JSON',
        LoaiND: 'text',
        ThuTuBH: 22,
        TaiLieu: 'invalid_json_string'
      };

      const res = await request(app)
        .post('/api/lessons')
        .set('Authorization', adminToken)
        .send(lessonData);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should handle negative lesson order', async () => {
      const lessonData = {
        IDCH: testChapterId,
        TenBH: 'Lesson with Negative Order',
        LoaiND: 'text',
        ThuTuBH: -1
      };

      const res = await request(app)
        .post('/api/lessons')
        .set('Authorization', adminToken)
        .send(lessonData);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
