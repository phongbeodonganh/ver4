# LinhMai Academy API Documentation v2.0

## 🚀 Enhanced API Endpoints

This documentation covers all API endpoints for the enhanced LinhMai Academy system, including new features for async video processing, enhanced news system, media library, admin logs, and advanced statistics.

## 🔐 Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

**Base URL:** `https://linhmai.edu.vn/api`

---

## 📚 Core Endpoints (Updated)

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - User login
- `GET /auth/me` - Get current user info
- `PUT /auth/change-password` - Change password
- `PUT /auth/profile` - Update profile
- `POST /auth/logout` - User logout

### Courses
- `GET /khoahoc` - Get all courses
- `GET /khoahoc/featured` - Get featured courses
- `GET /khoahoc/:id` - Get course by ID
- `GET /khoahoc/:id/chuong` - Get course chapters
- `POST /khoahoc` - Create course (Admin)
- `PUT /khoahoc/:id` - Update course (Admin)
- `DELETE /khoahoc/:id` - Delete course (Admin)

---

## 🆕 Enhanced Endpoints

### 1. Advanced Student Search
**Base Route:** `/api/hocvien/search`

#### GET /search
Advanced student search with AND/OR logic

**Query Parameters:**
```javascript
{
  name?: string,           // Student name
  email?: string,          // Email address
  phone?: string,          // Phone number (NEW)
  course?: string,         // Course name
  status?: string,         // Registration status
  dateFrom?: string,       // Registration date from (YYYY-MM-DD)
  dateTo?: string,         // Registration date to (YYYY-MM-DD)
  logic?: 'AND' | 'OR',   // Search logic (default: AND)
  page?: number,           // Page number (default: 1)
  limit?: number,          // Items per page (default: 10)
  sortBy?: string,         // Sort field
  sortOrder?: 'ASC' | 'DESC' // Sort order
}
```

**Response:**
```javascript
{
  success: true,
  message: "Tìm kiếm học viên thành công",
  data: {
    students: [
      {
        IDHV: 1,
        TenHV: "Nguyễn Văn A",
        Email: "student@example.com",
        Phone: "0123456789",
        NgayDangKy: "2024-01-15T00:00:00.000Z",
        courses: ["React Development", "JavaScript Mastery"],
        totalSpent: 500000,
        lastActivity: "2024-01-20T10:30:00.000Z"
      }
    ],
    pagination: {
      page: 1,
      limit: 10,
      total: 25,
      totalPages: 3
    },
    filters: {
      logic: "AND",
      appliedFilters: ["name", "email"]
    }
  }
}
```

#### GET /search/export
Export search results to CSV/Excel

**Query Parameters:** Same as search + `format=csv|excel`

---

### 2. Asynchronous Video Processing
**Base Route:** `/api/video/async`

#### POST /upload
Start asynchronous video upload and processing

**Request (multipart/form-data):**
```javascript
{
  IDBH: number,           // Lesson ID
  video: File,            // Video file
  title?: string,         // Video title
  description?: string    // Video description
}
```

**Response:**
```javascript
{
  success: true,
  message: "Video upload started successfully",
  data: {
    jobId: "uuid-job-id",
    lessonId: 1,
    status: "processing",
    estimatedTime: "5-10 minutes",
    progress: 0
  }
}
```

#### GET /job/:jobId/status
Get processing job status

**Response:**
```javascript
{
  success: true,
  data: {
    jobId: "uuid-job-id",
    status: "completed", // pending, processing, completed, failed
    progress: 100,
    startTime: "2024-01-20T10:00:00.000Z",
    endTime: "2024-01-20T10:05:30.000Z",
    result: {
      videoId: "abc123",
      urls: {
        "480p": "https://linhmai.edu.vn/api/video/stream/abc123-480p.mp4",
        "720p": "https://linhmai.edu.vn/api/video/stream/abc123-720p.mp4",
        "1080p": "https://linhmai.edu.vn/api/video/stream/abc123-1080p.mp4"
      },
      duration: 1800,
      fileSize: 157286400
    }
  }
}
```

#### GET /job/:jobId/progress
Get detailed processing progress

**Response:**
```javascript
{
  success: true,
  data: {
    jobId: "uuid-job-id",
    currentStep: "Converting to 720p",
    progress: 65,
    steps: [
      { name: "Upload", status: "completed", progress: 100 },
      { name: "480p conversion", status: "completed", progress: 100 },
      { name: "720p conversion", status: "processing", progress: 65 },
      { name: "1080p conversion", status: "pending", progress: 0 },
      { name: "Thumbnail generation", status: "pending", progress: 0 }
    ],
    eta: "2 minutes remaining"
  }
}
```

#### DELETE /job/:jobId
Cancel processing job

---

### 3. Enhanced News System
**Base Route:** `/api/news/enhanced`

#### GET /
Get all news with advanced filtering

**Query Parameters:**
```javascript
{
  type?: 'text' | 'image' | 'video', // News type
  status?: 'draft' | 'published',    // Publication status
  featured?: boolean,                 // Featured news only
  category?: string,                  // News category
  tags?: string[],                   // Filter by tags
  dateFrom?: string,                 // Date range from
  dateTo?: string,                   // Date range to
  search?: string,                   // Search in title/content
  page?: number,
  limit?: number
}
```

**Response:**
```javascript
{
  success: true,
  data: {
    news: [
      {
        id: 1,
        title: "Khóa học React mới ra mắt",
        content: "Nội dung chi tiết...",
        type: "image",
        thumbnail: "https://linhmai.edu.vn/uploads/news/thumb1.jpg",
        author: "Admin",
        publishDate: "2024-01-20T00:00:00.000Z",
        views: 150,
        tags: ["react", "javascript", "frontend"],
        featured: true,
        seo: {
          metaTitle: "Khóa học React mới",
          metaDescription: "Học React từ cơ bản đến nâng cao",
          keywords: ["react", "javascript"]
        }
      }
    ],
    pagination: { /* ... */ }
  }
}
```

#### POST /
Create new news article (Admin only)

**Request:**
```javascript
{
  title: string,
  content: string,
  type: 'text' | 'image' | 'video',
  thumbnail?: string,
  featured?: boolean,
  tags?: string[],
  publishDate?: string,
  seo?: {
    metaTitle?: string,
    metaDescription?: string,
    keywords?: string[]
  }
}
```

#### PUT /:id
Update news article (Admin only)

#### DELETE /:id
Delete news article (Admin only)

#### GET /featured
Get featured news

#### GET /by-type/:type
Get news by type (text, image, video)

---

### 4. Enhanced Document Management
**Base Route:** `/api/documents/public`

#### GET /
Get public documents (no authentication required)

**Query Parameters:**
```javascript
{
  category?: string,      // Document category
  tags?: string[],        // Filter by tags
  search?: string,        // Search in title/description
  fileType?: string,      // File type filter
  page?: number,
  limit?: number
}
```

**Response:**
```javascript
{
  success: true,
  data: {
    documents: [
      {
        id: 1,
        title: "Tài liệu học React cơ bản",
        description: "Hướng dẫn học React từ A-Z",
        fileUrl: "https://linhmai.edu.vn/uploads/documents/react-guide.pdf",
        fileName: "react-guide.pdf",
        fileSize: 2048576,
        category: "programming",
        tags: ["react", "javascript", "tutorial"],
        downloadCount: 245,
        createdAt: "2024-01-15T00:00:00.000Z"
      }
    ],
    pagination: { /* ... */ },
    categories: ["programming", "design", "business"]
  }
}
```

#### GET /:id/download
Download public document (tracks download count)

**Response:** File download with proper headers

---

### 5. Media Library System
**Base Route:** `/api/media` (Admin only)

#### GET /
Get all media files

**Query Parameters:**
```javascript
{
  type?: 'image' | 'video' | 'document', // Media type
  category?: string,                      // Media category
  search?: string,                        // Search filename
  dateFrom?: string,                      // Upload date from
  dateTo?: string,                        // Upload date to
  page?: number,
  limit?: number
}
```

**Response:**
```javascript
{
  success: true,
  data: {
    media: [
      {
        id: 1,
        filename: "course-banner.jpg",
        originalName: "react-course-banner.jpg",
        type: "image",
        mimeType: "image/jpeg",
        size: 1024576,
        url: "https://linhmai.edu.vn/uploads/images/course-banner.jpg",
        thumbnailUrl: "https://linhmai.edu.vn/uploads/images/thumbs/course-banner.jpg",
        category: "course-materials",
        uploadedBy: "admin",
        uploadedAt: "2024-01-20T10:00:00.000Z",
        metadata: {
          width: 1920,
          height: 1080,
          format: "JPEG"
        }
      }
    ],
    pagination: { /* ... */ },
    stats: {
      totalFiles: 150,
      totalSize: "2.5 GB",
      byType: {
        images: 80,
        videos: 45,
        documents: 25
      }
    }
  }
}
```

#### POST /upload
Upload media file

**Request (multipart/form-data):**
```javascript
{
  file: File,
  category?: string,
  description?: string
}
```

#### DELETE /:id
Delete media file

#### GET /stats
Get media library statistics

---

### 6. Admin Activity Logging
**Base Route:** `/api/logs/admin` (Admin only)

#### GET /
Get admin activity logs

**Query Parameters:**
```javascript
{
  action?: string,        // Filter by action type
  userId?: number,        // Filter by admin user
  dateFrom?: string,      // Date range from
  dateTo?: string,        // Date range to
  ipAddress?: string,     // Filter by IP
  page?: number,
  limit?: number
}
```

**Response:**
```javascript
{
  success: true,
  data: {
    logs: [
      {
        id: 1,
        userId: 1,
        userName: "Admin User",
        action: "CREATE_COURSE",
        description: "Created new course: React Development",
        ipAddress: "192.168.1.100",
        userAgent: "Mozilla/5.0...",
        metadata: {
          courseId: 5,
          courseName: "React Development"
        },
        createdAt: "2024-01-20T10:30:00.000Z"
      }
    ],
    pagination: { /* ... */ },
    summary: {
      totalActions: 1250,
      uniqueUsers: 5,
      topActions: [
        { action: "LOGIN", count: 450 },
        { action: "UPDATE_COURSE", count: 120 }
      ]
    }
  }
}
```

#### POST /
Create log entry (automatic via middleware)

#### GET /stats
Get logging statistics

#### DELETE /cleanup
Cleanup old logs (Admin only)

---

### 7. Advanced Statistics
**Base Route:** `/api/thongke` (Admin only)

#### GET /overview
Get system overview statistics

**Response:**
```javascript
{
  success: true,
  data: {
    students: {
      total: 1250,
      newThisMonth: 85,
      activeThisWeek: 320
    },
    courses: {
      total: 25,
      published: 20,
      averageRating: 4.6
    },
    revenue: {
      thisMonth: 15000000,
      lastMonth: 12000000,
      growth: 25
    },
    files: {
      totalUploaded: 450,
      totalSize: "5.2 GB",
      videosProcessed: 120
    },
    system: {
      uptime: "15 days",
      apiCalls: 25000,
      errorRate: 0.02
    }
  }
}
```

#### GET /students
Get detailed student statistics

**Response:**
```javascript
{
  success: true,
  data: {
    registrationTrend: [
      { month: "2024-01", count: 45 },
      { month: "2024-02", count: 62 }
    ],
    courseEnrollments: [
      { courseName: "React Development", students: 150 },
      { courseName: "JavaScript Mastery", students: 120 }
    ],
    demographics: {
      ageGroups: {
        "18-25": 35,
        "26-35": 45,
        "36-45": 15,
        "45+": 5
      }
    },
    engagement: {
      averageSessionTime: "45 minutes",
      completionRate: 78,
      returnRate: 65
    }
  }
}
```

#### GET /courses
Get course performance statistics

#### GET /revenue
Get revenue analytics

#### GET /files
Get file upload and storage statistics

---

## 🔧 Video Upload Flow

### Complete Video Upload Process

1. **Start Upload**
```javascript
POST /api/video/async/upload
// Returns jobId
```

2. **Monitor Progress**
```javascript
GET /api/video/async/job/{jobId}/progress
// Check every 5-10 seconds
```

3. **Get Final Result**
```javascript
GET /api/video/async/job/{jobId}/status
// When status = "completed"
```

4. **Use Video URLs**
```javascript
// URLs returned in job status
{
  "480p": "https://linhmai.edu.vn/api/video/stream/abc123-480p.mp4",
  "720p": "https://linhmai.edu.vn/api/video/stream/abc123-720p.mp4", 
  "1080p": "https://linhmai.edu.vn/api/video/stream/abc123-1080p.mp4"
}
```

### Video Player Integration

```javascript
// Example Video.js configuration
const videoOptions = {
  sources: [
    {
      src: 'https://linhmai.edu.vn/api/video/stream/abc123-1080p.mp4',
      type: 'video/mp4',
      label: '1080p'
    },
    {
      src: 'https://linhmai.edu.vn/api/video/stream/abc123-720p.mp4',
      type: 'video/mp4',
      label: '720p'
    },
    {
      src: 'https://linhmai.edu.vn/api/video/stream/abc123-480p.mp4',
      type: 'video/mp4',
      label: '480p'
    }
  ],
  plugins: {
    qualitySelector: {
      default: 'auto'
    }
  }
};
```

---

## 📱 Frontend Integration Examples

### React Hook for Student Search

```javascript
import { useState, useEffect } from 'react';

const useStudentSearch = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({});

  const searchStudents = async (filters) => {
    setLoading(true);
    try {
      const params = new URLSearchParams(filters);
      const response = await fetch(`/api/hocvien/search?${params}`);
      const data = await response.json();
      
      setStudents(data.data.students);
      setPagination(data.data.pagination);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return { students, loading, pagination, searchStudents };
};
```

### Video Upload Component

```javascript
import { useState } from 'react';

const VideoUploader = ({ lessonId, onUploadComplete }) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [jobId, setJobId] = useState(null);

  const uploadVideo = async (file) => {
    setUploading(true);
    
    const formData = new FormData();
    formData.append('IDBH', lessonId);
    formData.append('video', file);

    try {
      // Start upload
      const uploadResponse = await fetch('/api/video/async/upload', {
        method: 'POST',
        body: formData
      });
      const uploadData = await uploadResponse.json();
      setJobId(uploadData.data.jobId);

      // Monitor progress
      const interval = setInterval(async () => {
        const progressResponse = await fetch(`/api/video/async/job/${uploadData.data.jobId}/progress`);
        const progressData = await progressResponse.json();
        
        setProgress(progressData.data.progress);
        
        if (progressData.data.progress === 100) {
          clearInterval(interval);
          onUploadComplete(progressData.data.result);
          setUploading(false);
        }
      }, 5000);

    } catch (error) {
      console.error('Upload failed:', error);
      setUploading(false);
    }
  };

  return (
    <div>
      <input 
        type="file" 
        accept="video/*" 
        onChange={(e) => uploadVideo(e.target.files[0])}
        disabled={uploading}
      />
      {uploading && (
        <div>
          <div>Uploading... {progress}%</div>
          <progress value={progress} max="100" />
        </div>
      )}
    </div>
  );
};
```

---

## 🚨 Error Handling

### Standard Error Response Format

```javascript
{
  success: false,
  message: "Error description",
  error: "SPECIFIC_ERROR_CODE",
  details: {
    field: "validation error details"
  }
}
```

### Common Error Codes

- `VALIDATION_ERROR` - Input validation failed
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `FILE_TOO_LARGE` - File exceeds size limit
- `PROCESSING_FAILED` - Video processing failed
- `DATABASE_ERROR` - Database operation failed

---

## 🔒 Rate Limiting

- **General API**: 100 requests per 15 minutes per IP
- **File Upload**: 10 uploads per hour per user
- **Video Processing**: 3 concurrent jobs per user
- **Search API**: 50 requests per minute per user

---

## 📊 Response Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `413` - Payload Too Large
- `429` - Too Many Requests
- `500` - Internal Server Error

---

**API Version:** 2.0.0  
**Last Updated:** $(date)  
**Base URL:** https://linhmai.edu.vn/api
