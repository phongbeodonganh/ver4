// Thorough testing for Document endpoints with database validation
const request = require('supertest');
const app = require('../server');
const { executeQuery } = require('../config/database');
const path = require('path');

describe('Document Endpoints (Thorough Testing)', () => {
  let adminToken;
  let testDocumentIds = [];

  beforeAll(async () => {
    // Setup admin token
    adminToken = 'Bearer mock_admin_token';
    
    // Clean up any existing test data
    await executeQuery('DELETE FROM Documents WHERE title LIKE ?', ['Test Document%']);
    
    // Create test documents
    const testDocuments = [
      {
        title: 'Test Document React Guide',
        description: 'React development guide for testing',
        tags: JSON.stringify(['react', 'javascript', 'tutorial']),
        category: 'programming',
        created_by: 1
      },
      {
        title: 'Test Document Python Basics',
        description: 'Python basics document for testing',
        tags: JSON.stringify(['python', 'basics', 'tutorial']),
        category: 'programming',
        created_by: 1
      },
      {
        title: 'Test Document Design Principles',
        description: 'Design principles document for testing',
        tags: JSON.stringify(['design', 'ui', 'ux']),
        category: 'design',
        created_by: 1
      }
    ];

    for (const doc of testDocuments) {
      const result = await executeQuery(
        'INSERT INTO Documents (title, description, tags, category, created_by) VALUES (?, ?, ?, ?, ?)',
        [doc.title, doc.description, doc.tags, doc.category, doc.created_by]
      );
      testDocumentIds.push(result.insertId);
    }
  });

  afterAll(async () => {
    // Cleanup test data
    if (testDocumentIds.length > 0) {
      const placeholders = testDocumentIds.map(() => '?').join(',');
      await executeQuery(`DELETE FROM Documents WHERE id IN (${placeholders})`, testDocumentIds);
    }
    await executeQuery('DELETE FROM Documents WHERE title LIKE ?', ['Test Document%']);
  });

  describe('GET /api/documents', () => {
    it('should return a paginated list of documents', async () => {
      const res = await request(app)
        .get('/api/documents')
        .query({ page: 1, limit: 2 });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('documents');
      expect(res.body.data.documents).toBeInstanceOf(Array);
      expect(res.body.data.documents.length).toBeLessThanOrEqual(2);
      expect(res.body.data.pagination).toBeDefined();
      expect(res.body.data.pagination.page).toBe(1);
      expect(res.body.data.pagination.limit).toBe(2);
    });

    it('should filter documents by category', async () => {
      const res = await request(app)
        .get('/api/documents')
        .query({ category: 'programming' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.documents).toBeInstanceOf(Array);
      
      res.body.data.documents.forEach(doc => {
        expect(doc.category).toBe('programming');
      });
    });

    it('should search documents by title and description', async () => {
      const res = await request(app)
        .get('/api/documents')
        .query({ search: 'React' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.documents).toBeInstanceOf(Array);
      
      res.body.data.documents.forEach(doc => {
        expect(
          doc.title.toLowerCase().includes('react') || 
          doc.description.toLowerCase().includes('react')
        ).toBe(true);
      });
    });

    it('should handle empty search results gracefully', async () => {
      const res = await request(app)
        .get('/api/documents')
        .query({ search: 'NonExistentDocument12345' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.documents).toBeInstanceOf(Array);
      expect(res.body.data.documents.length).toBe(0);
    });

    it('should handle invalid pagination parameters', async () => {
      const res = await request(app)
        .get('/api/documents')
        .query({ page: -1, limit: 0 });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      // Should default to valid pagination values
      expect(res.body.data.pagination.page).toBeGreaterThan(0);
      expect(res.body.data.pagination.limit).toBeGreaterThan(0);
    });
  });

  describe('GET /api/documents/categories', () => {
    it('should return list of available categories', async () => {
      const res = await request(app)
        .get('/api/documents/categories');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data).toContain('programming');
      expect(res.body.data).toContain('design');
    });
  });

  describe('GET /api/documents/:id', () => {
    it('should get document by ID successfully', async () => {
      const documentId = testDocumentIds[0];
      
      const res = await request(app)
        .get(`/api/documents/${documentId}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.id).toBe(documentId);
      expect(res.body.data).toHaveProperty('tags');
      expect(res.body.data.tags).toBeInstanceOf(Array);
    });

    it('should return 404 for non-existent document', async () => {
      const res = await request(app)
        .get('/api/documents/99999');

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/documents (Admin only)', () => {
    it('should create a document without file successfully', async () => {
      const documentData = {
        title: 'Test Document New Creation',
        description: 'Description for new document',
        tags: ['test', 'new', 'document'],
        category: 'testing'
      };

      const res = await request(app)
        .post('/api/documents')
        .set('Authorization', adminToken)
        .send(documentData);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.title).toBe(documentData.title);
      expect(res.body.data.tags).toEqual(documentData.tags);

      // Verify database insertion
      const dbResult = await executeQuery('SELECT * FROM Documents WHERE id = ?', [res.body.data.id]);
      expect(dbResult.length).toBe(1);
      expect(dbResult[0].title).toBe(documentData.title);
      
      // Add to cleanup list
      testDocumentIds.push(res.body.data.id);
    });

    it('should create a document with file upload successfully', async () => {
      const documentData = {
        title: 'Test Document With File',
        description: 'Document with file upload',
        tags: JSON.stringify(['test', 'file']),
        category: 'testing'
      };

      // Mock file path for testing
      const testFilePath = path.join(__dirname, 'fixtures', 'test-document.pdf');

      const res = await request(app)
        .post('/api/documents')
        .set('Authorization', adminToken)
        .field('title', documentData.title)
        .field('description', documentData.description)
        .field('tags', documentData.tags)
        .field('category', documentData.category)
        .attach('document', testFilePath);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('fileUrl');
      expect(res.body.data).toHaveProperty('fileName');
      
      testDocumentIds.push(res.body.data.id);
    });

    it('should return error when title is missing', async () => {
      const documentData = {
        description: 'Description without title'
      };

      const res = await request(app)
        .post('/api/documents')
        .set('Authorization', adminToken)
        .send(documentData);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });

    it('should return error when not authenticated', async () => {
      const documentData = {
        title: 'Test Document',
        description: 'Description'
      };

      const res = await request(app)
        .post('/api/documents')
        .send(documentData);

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should handle invalid tags format', async () => {
      const documentData = {
        title: 'Test Document Invalid Tags',
        description: 'Description',
        tags: 'invalid_tags_format'
      };

      const res = await request(app)
        .post('/api/documents')
        .set('Authorization', adminToken)
        .send(documentData);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/documents/:id (Admin only)', () => {
    it('should update document successfully', async () => {
      const documentId = testDocumentIds[0];
      const updateData = {
        title: 'Updated Document Title',
        description: 'Updated description',
        category: 'updated'
      };

      const res = await request(app)
        .put(`/api/documents/${documentId}`)
        .set('Authorization', adminToken)
        .send(updateData);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe(updateData.title);

      // Verify database update
      const dbResult = await executeQuery('SELECT * FROM Documents WHERE id = ?', [documentId]);
      expect(dbResult[0].title).toBe(updateData.title);
      expect(dbResult[0].description).toBe(updateData.description);
    });

    it('should update document with new file', async () => {
      const documentId = testDocumentIds[1];
      const testFilePath = path.join(__dirname, 'fixtures', 'updated-document.pdf');

      const res = await request(app)
        .put(`/api/documents/${documentId}`)
        .set('Authorization', adminToken)
        .field('title', 'Updated with File')
        .attach('document', testFilePath);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('fileUrl');
    });

    it('should return 404 for non-existent document update', async () => {
      const res = await request(app)
        .put('/api/documents/99999')
        .set('Authorization', adminToken)
        .send({ title: 'Updated Title' });

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('DELETE /api/documents/:id (Admin only)', () => {
    it('should delete document successfully', async () => {
      // Create a document to delete
      const result = await executeQuery(
        'INSERT INTO Documents (title, description, category, created_by) VALUES (?, ?, ?, ?)',
        ['Document to Delete', 'Description', 'test', 1]
      );
      const documentToDeleteId = result.insertId;

      const res = await request(app)
        .delete(`/api/documents/${documentToDeleteId}`)
        .set('Authorization', adminToken);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify database deletion
      const dbResult = await executeQuery('SELECT * FROM Documents WHERE id = ?', [documentToDeleteId]);
      expect(dbResult.length).toBe(0);
    });

    it('should return 404 for non-existent document deletion', async () => {
      const res = await request(app)
        .delete('/api/documents/99999')
        .set('Authorization', adminToken);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/documents/:id/download', () => {
    it('should increment download count successfully', async () => {
      const documentId = testDocumentIds[0];

      // Get initial download count
      const initialResult = await executeQuery('SELECT download_count FROM Documents WHERE id = ?', [documentId]);
      const initialCount = initialResult[0].download_count;

      const res = await request(app)
        .post(`/api/documents/${documentId}/download`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify download count increment
      const updatedResult = await executeQuery('SELECT download_count FROM Documents WHERE id = ?', [documentId]);
      expect(updatedResult[0].download_count).toBe(initialCount + 1);
    });

    it('should handle non-existent document download', async () => {
      const res = await request(app)
        .post('/api/documents/99999/download');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      // Should not throw error even if document doesn't exist
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long document titles', async () => {
      const longTitle = 'A'.repeat(250); // Exceeds 200 char limit
      const documentData = {
        title: longTitle,
        description: 'Description'
      };

      const res = await request(app)
        .post('/api/documents')
        .set('Authorization', adminToken)
        .send(documentData);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should handle special characters in document title', async () => {
      const documentData = {
        title: 'Test Document with Special Chars: @#$%^&*()',
        description: 'Description with special characters'
      };

      const res = await request(app)
        .post('/api/documents')
        .set('Authorization', adminToken)
        .send(documentData);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      
      testDocumentIds.push(res.body.data.id);
    });

    it('should handle empty tags array', async () => {
      const documentData = {
        title: 'Document with Empty Tags',
        description: 'Description',
        tags: []
      };

      const res = await request(app)
        .post('/api/documents')
        .set('Authorization', adminToken)
        .send(documentData);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tags).toEqual([]);
      
      testDocumentIds.push(res.body.data.id);
    });
  });
});
