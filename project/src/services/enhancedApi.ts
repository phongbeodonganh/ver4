import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Enhanced Student Search API
export const studentSearchApi = {
  search: async (filters: {
    name?: string;
    email?: string;
    phone?: string;
    course?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    logic?: 'AND' | 'OR';
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });
    
    const response = await api.get(`/hocvien/search?${params}`);
    return response.data;
  },

  export: async (filters: any, format: 'csv' | 'excel' = 'csv') => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });
    params.append('format', format);
    
    const response = await api.get(`/hocvien/search/export?${params}`, {
      responseType: 'blob'
    });
    return response.data;
  }
};

// Async Video Processing API
export const asyncVideoApi = {
  upload: async (lessonId: number, videoFile: File, title?: string, description?: string) => {
    const formData = new FormData();
    formData.append('IDBH', lessonId.toString());
    formData.append('video', videoFile);
    if (title) formData.append('title', title);
    if (description) formData.append('description', description);

    const response = await api.post('/video/async/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 0, // No timeout for file uploads
    });
    return response.data;
  },

  getJobStatus: async (jobId: string) => {
    const response = await api.get(`/video/async/job/${jobId}/status`);
    return response.data;
  },

  getJobProgress: async (jobId: string) => {
    const response = await api.get(`/video/async/job/${jobId}/progress`);
    return response.data;
  },

  cancelJob: async (jobId: string) => {
    const response = await api.delete(`/video/async/job/${jobId}`);
    return response.data;
  }
};

// Enhanced News API
export const enhancedNewsApi = {
  getAll: async (filters: {
    type?: 'text' | 'image' | 'video';
    status?: 'draft' | 'published';
    featured?: boolean;
    category?: string;
    tags?: string[];
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        if (Array.isArray(value)) {
          value.forEach(v => params.append(key, v));
        } else {
          params.append(key, value.toString());
        }
      }
    });
    
    const response = await api.get(`/news/enhanced?${params}`);
    return response.data;
  },

  create: async (newsData: {
    title: string;
    content: string;
    type: 'text' | 'image' | 'video';
    thumbnail?: string;
    featured?: boolean;
    tags?: string[];
    publishDate?: string;
    seo?: {
      metaTitle?: string;
      metaDescription?: string;
      keywords?: string[];
    };
  }) => {
    const response = await api.post('/news/enhanced', newsData);
    return response.data;
  },

  update: async (id: number, newsData: any) => {
    const response = await api.put(`/news/enhanced/${id}`, newsData);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/news/enhanced/${id}`);
    return response.data;
  },

  getFeatured: async () => {
    const response = await api.get('/news/enhanced/featured');
    return response.data;
  },

  getByType: async (type: 'text' | 'image' | 'video') => {
    const response = await api.get(`/news/enhanced/by-type/${type}`);
    return response.data;
  }
};

// Public Documents API (no auth required)
export const publicDocumentsApi = {
  getAll: async (filters: {
    category?: string;
    tags?: string[];
    search?: string;
    fileType?: string;
    page?: number;
    limit?: number;
  } = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        if (Array.isArray(value)) {
          value.forEach(v => params.append(key, v));
        } else {
          params.append(key, value.toString());
        }
      }
    });
    
    // Use axios directly without auth interceptor for public API
    const response = await axios.get(`${API_BASE_URL}/documents/public?${params}`);
    return response.data;
  },

  download: async (id: number) => {
    const response = await axios.get(`${API_BASE_URL}/documents/public/${id}/download`, {
      responseType: 'blob'
    });
    return response.data;
  }
};

// Media Library API
export const mediaLibraryApi = {
  getAll: async (filters: {
    type?: 'image' | 'video' | 'document';
    category?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  } = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, value.toString());
      }
    });
    
    const response = await api.get(`/media?${params}`);
    return response.data;
  },

  upload: async (file: File, category?: string, description?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (category) formData.append('category', category);
    if (description) formData.append('description', description);

    const response = await api.post('/media/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/media/${id}`);
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/media/stats');
    return response.data;
  }
};

// Admin Logs API
export const adminLogsApi = {
  getAll: async (filters: {
    action?: string;
    userId?: number;
    dateFrom?: string;
    dateTo?: string;
    ipAddress?: string;
    page?: number;
    limit?: number;
  } = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, value.toString());
      }
    });
    
    const response = await api.get(`/logs/admin?${params}`);
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/logs/admin/stats');
    return response.data;
  },

  cleanup: async () => {
    const response = await api.delete('/logs/admin/cleanup');
    return response.data;
  }
};

// Statistics API
export const statisticsApi = {
  getOverview: async () => {
    const response = await api.get('/thongke/overview');
    return response.data;
  },

  getStudentStats: async () => {
    const response = await api.get('/thongke/students');
    return response.data;
  },

  getCourseStats: async () => {
    const response = await api.get('/thongke/courses');
    return response.data;
  },

  getRevenueStats: async () => {
    const response = await api.get('/thongke/revenue');
    return response.data;
  },

  getFileStats: async () => {
    const response = await api.get('/thongke/files');
    return response.data;
  }
};

// Export all APIs
export {
  api as default,
  API_BASE_URL
};
