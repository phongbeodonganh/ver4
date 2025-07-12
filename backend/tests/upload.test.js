
const request = require('supertest');
const app = require('../server'); // Đường dẫn có thể cần điều chỉnh tùy vào cấu trúc của bạn
const path = require('path');

describe('Upload API Tests', () => {
  describe('POST /api/uploads/video', () => {
    it('should upload a valid .mp4 video', async () => {
      const res = await request(app)
        .post('/api/uploads/video')
        .attach('file', path.join(__dirname, 'fixtures/sample-video.mp4'));
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('video_url');
    });

    it('should fail when uploading a non-video file (e.g. .pdf)', async () => {
      const res = await request(app)
        .post('/api/uploads/video')
        .attach('file', path.join(__dirname, 'fixtures/sample.pdf'));
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });

    it('should fail when no file is sent', async () => {
      const res = await request(app)
        .post('/api/uploads/video');
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });
  });

  describe('POST /api/uploads/document', () => {
    it('should upload a .pdf document under size limit', async () => {
      const res = await request(app)
        .post('/api/uploads/document')
        .attach('file', path.join(__dirname, 'fixtures/sample.pdf'));
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('document_url');
    });

    it('should upload a .docx document', async () => {
      const res = await request(app)
        .post('/api/uploads/document')
        .attach('file', path.join(__dirname, 'fixtures/sample.docx'));
      expect(res.statusCode).toEqual(200);
    });

    it('should fail when file exceeds size limit', async () => {
      const res = await request(app)
        .post('/api/uploads/document')
        .attach('file', path.join(__dirname, 'fixtures/large-file.pdf'));
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });
  });
});
