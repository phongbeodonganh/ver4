import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { 
  Users, BookOpen, DollarSign, TrendingUp, Award, 
  Settings, Plus, ChevronDown, ChevronRight, Play, FileText, 
  Palette, Image, Globe, Type, MessageCircle, Phone, Mail, MapPin,
  Youtube, Facebook, Trash2
} from 'lucide-react';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import FileUploadField from '../components/admin/FileUploadField';
import MediaLibrary from '../components/admin/MediaLibrary';

// Mock upload and settings functions
const uploadFile = async (file: File, type: string, onProgress: (progress: number) => void) => {
  // Simulate upload progress
  for (let i = 0; i <= 100; i += 10) {
    onProgress(i);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return { url: `https://example.com/${type}/${file.name}` };
};

const getSettings = async () => {
  return {};
};

const updateSettings = async (settings: any) => {
  console.log('Settings updated:', settings);
};

interface Course {
  id: string;
  title: string;
  description: string;
  price: number;
  thumbnail: string;
  chapters: Chapter[];
}

interface Chapter {
  id: string;
  title: string;
  description: string;
  order: number;
  lessons: Lesson[];
}

interface Lesson {
  id: string;
  title: string;
  description: string;
  type: 'video' | 'document' | 'quiz';
  videoUrl?: string;
  documentUrl?: string;
  duration: number;
  order: number;
  isFree: boolean;
}

interface WebsiteSettings {
  siteName: string;
  logo: string;
  favicon: string;
  primaryColor: string;
  secondaryColor: string;
  bannerImage: string;
  backgroundImage: string;
  headerText: string;
  footerText: string;
  seoTitle: string;
  seoDescription: string;
  fontFamily: string;
  fontSize: string;
  socialLinks: {
    youtube: string;
    facebook: string;
    tiktok: string;
    zalo: string;
  };
  contactInfo: {
    phone: string;
    email: string;
    address: string;
  };
  googleAnalytics: string;
  facebookPixel: string;
  bannerSlides: Array<{
    id: string;
    image: string;
    title: string;
    description: string;
    link: string;
  }>;
}

const DashboardAdmin: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'course' | 'chapter' | 'lesson' | 'user' | 'staff' | 'banner'>('course');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());

  // Upload states
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [mediaLibraryType, setMediaLibraryType] = useState<'images' | 'videos' | 'documents'>('images');
  const [currentUploadField, setCurrentUploadField] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});

  // Form states
  const [courseForm, setCourseForm] = useState({
    title: '',
    description: '',
    price: '',
    thumbnail: ''
  });

  const [chapterForm, setChapterForm] = useState({
    title: '',
    description: '',
    order: ''
  });

  const [lessonForm, setLessonForm] = useState({
    title: '',
    description: '',
    type: 'video' as 'video' | 'document' | 'quiz',
    videoUrl: '',
    documentUrl: '',
    duration: '',
    order: '',
    isFree: false
  });

  const [bannerForm, setBannerForm] = useState({
    title: '',
    description: '',
    image: '',
    link: ''
  });

  const [websiteSettings, setWebsiteSettings] = useState<WebsiteSettings>({
    siteName: 'LinhMai Academy',
    logo: '',
    favicon: '',
    primaryColor: '#3B82F6',
    secondaryColor: '#10B981',
    bannerImage: '',
    backgroundImage: '',
    headerText: 'Nền tảng học tập trực tuyến hàng đầu',
    footerText: 'Tất cả quyền được bảo lưu.',
    seoTitle: 'LinhMai Academy - Học tập trực tuyến',
    seoDescription: 'Nền tảng học tập trực tuyến với các khóa học chất lượng cao',
    fontFamily: 'Inter',
    fontSize: '16px',
    socialLinks: {
      youtube: '',
      facebook: '',
      tiktok: '',
      zalo: ''
    },
    contactInfo: {
      phone: '',
      email: '',
      address: ''
    },
    googleAnalytics: '',
    facebookPixel: '',
    bannerSlides: []
  });

  // Mock data
  const [courses, setCourses] = useState<Course[]>([
    {
      id: '1',
      title: 'React Development',
      description: 'Học React từ cơ bản đến nâng cao',
      price: 299000,
      thumbnail: 'https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=400',
      chapters: [
        {
          id: '1',
          title: 'Giới thiệu React',
          description: 'Tìm hiểu về React và ecosystem',
          order: 1,
          lessons: [
            {
              id: '1',
              title: 'React là gì?',
              description: 'Hiểu về React và ứng dụng',
              type: 'video',
              videoUrl: 'https://example.com/video1.mp4',
              duration: 600,
              order: 1,
              isFree: true
            }
          ]
        }
      ]
    }
  ]);

  const fontOptions = [
    { value: 'Inter', label: 'Inter' },
    { value: 'Roboto', label: 'Roboto' },
    { value: 'Open Sans', label: 'Open Sans' },
    { value: 'Lato', label: 'Lato' },
    { value: 'Montserrat', label: 'Montserrat' },
    { value: 'Poppins', label: 'Poppins' }
  ];

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await getSettings();
      if (settings) {
        setWebsiteSettings(prev => ({ ...prev, ...settings }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      await updateSettings(websiteSettings);
      alert('Cài đặt đã được lưu thành công!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Có lỗi xảy ra khi lưu cài đặt!');
    }
  };

  // Upload handlers
  const handleFileUpload = async (file: File, type: 'images' | 'videos' | 'documents', fieldKey: string) => {
    try {
      setUploadProgress(prev => ({ ...prev, [fieldKey]: 0 }));
      
      const result = await uploadFile(file, type, (progress: number) => {
        setUploadProgress(prev => ({ ...prev, [fieldKey]: progress }));
      });
      
      // Update the appropriate form field
      updateFormField(fieldKey, result.url);
      setUploadProgress(prev => ({ ...prev, [fieldKey]: 100 }));
      
      setTimeout(() => {
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[fieldKey];
          return newProgress;
        });
      }, 2000);
      
    } catch (error) {
      console.error('Upload error:', error);
      setUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[fieldKey];
        return newProgress;
      });
    }
  };

  const updateFormField = (fieldKey: string, url: string) => {
    const [form, field] = fieldKey.split('.');
    
    switch (form) {
      case 'course':
        setCourseForm(prev => ({ ...prev, [field]: url }));
        break;
      case 'lesson':
        setLessonForm(prev => ({ ...prev, [field]: url }));
        break;
      case 'settings':
        if (field.includes('.')) {
          const [section, subField] = field.split('.');
          setWebsiteSettings(prev => ({
            ...prev,
            [section]: { 
              ...(prev[section as keyof WebsiteSettings] as any), 
              [subField]: url 
            }
          }));
        } else {
          setWebsiteSettings(prev => ({ ...prev, [field]: url }));
        }
        break;
      case 'banner':
        setBannerForm(prev => ({ ...prev, [field]: url }));
        break;
    }
  };

  const openMediaLibrary = (type: 'images' | 'videos' | 'documents', fieldKey: string) => {
    setMediaLibraryType(type);
    setCurrentUploadField(fieldKey);
    setShowMediaLibrary(true);
  };

  const handleMediaSelect = (fileUrl: string) => {
    updateFormField(currentUploadField, fileUrl);
    setShowMediaLibrary(false);
  };

  // Modal handlers
  const openModal = (type: 'course' | 'chapter' | 'lesson' | 'user' | 'staff' | 'banner', course?: Course, chapter?: Chapter) => {
    setModalType(type);
    setSelectedCourse(course || null);
    setSelectedChapter(chapter || null);
    setIsModalOpen(true);
    
    // Reset forms
    if (type === 'course') {
      setCourseForm({ title: '', description: '', price: '', thumbnail: '' });
    } else if (type === 'chapter') {
      setChapterForm({ title: '', description: '', order: '' });
    } else if (type === 'lesson') {
      setLessonForm({
        title: '',
        description: '',
        type: 'video',
        videoUrl: '',
        documentUrl: '',
        duration: '',
        order: '',
        isFree: false
      });
    } else if (type === 'banner') {
      setBannerForm({ title: '', description: '', image: '', link: '' });
    }
  };

  const addBannerSlide = () => {
    const newSlide = {
      id: Date.now().toString(),
      title: bannerForm.title,
      description: bannerForm.description,
      image: bannerForm.image,
      link: bannerForm.link
    };
    
    setWebsiteSettings(prev => ({
      ...prev,
      bannerSlides: [...prev.bannerSlides, newSlide]
    }));
    
    setIsModalOpen(false);
  };

  const removeBannerSlide = (slideId: string) => {
    setWebsiteSettings(prev => ({
      ...prev,
      bannerSlides: prev.bannerSlides.filter(slide => slide.id !== slideId)
    }));
  };

  const toggleCourseExpansion = (courseId: string) => {
    const newExpanded = new Set(expandedCourses);
    if (newExpanded.has(courseId)) {
      newExpanded.delete(courseId);
    } else {
      newExpanded.add(courseId);
    }
    setExpandedCourses(newExpanded);
  };

  const toggleChapterExpansion = (chapterId: string) => {
    const newExpanded = new Set(expandedChapters);
    if (newExpanded.has(chapterId)) {
      newExpanded.delete(chapterId);
    } else {
      newExpanded.add(chapterId);
    }
    setExpandedChapters(newExpanded);
  };

  // Stats data
  const stats = [
    { 
      title: 'Tổng doanh thu', 
      value: '28,500,000 VNĐ', 
      change: '+12.5%', 
      icon: DollarSign, 
      color: 'bg-green-500' 
    },
    { 
      title: 'Học viên', 
      value: '1,247', 
      change: '+8.2%', 
      icon: Users, 
      color: 'bg-blue-500' 
    },
    { 
      title: 'Khóa học', 
      value: '24', 
      change: '+2', 
      icon: BookOpen, 
      color: 'bg-purple-500' 
    },
    { 
      title: 'Tỷ lệ chuyển đổi', 
      value: '74.8%', 
      change: '+5.1%', 
      icon: TrendingUp, 
      color: 'bg-orange-500' 
    },
  ];

  const revenueData = [
    { month: 'Jan', revenue: 4000000 },
    { month: 'Feb', revenue: 3000000 },
    { month: 'Mar', revenue: 5000000 },
    { month: 'Apr', revenue: 4500000 },
    { month: 'May', revenue: 6000000 },
    { month: 'Jun', revenue: 5500000 },
  ];

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-green-600">{stat.change} so với tháng trước</p>
              </div>
              <div className={`p-3 rounded-full ${stat.color}`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Doanh thu theo tháng</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `${Number(value).toLocaleString('vi-VN')} VNĐ`} />
              <Bar dataKey="revenue" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  const renderCourses = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Quản lý khóa học</h2>
        <Button
          variant="primary"
          icon={Plus}
          onClick={() => openModal('course')}
        >
          Thêm khóa học
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="space-y-4">
            {courses.map((course) => (
              <div key={course.id} className="border rounded-lg">
                <div className="p-4 bg-gray-50 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => toggleCourseExpansion(course.id)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      {expandedCourses.has(course.id) ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                    </button>
                    <BookOpen className="h-5 w-5 text-blue-600" />
                    <div>
                      <h3 className="font-semibold text-gray-900">{course.title}</h3>
                      <p className="text-sm text-gray-600">{course.description}</p>
                      <p className="text-sm font-medium text-green-600">
                        {course.price.toLocaleString('vi-VN')} VNĐ
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={Plus}
                      onClick={() => openModal('chapter', course)}
                    >
                      Thêm chương
                    </Button>
                  </div>
                </div>

                {expandedCourses.has(course.id) && (
                  <div className="p-4 border-t">
                    {course.chapters.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">
                        Chưa có chương học nào. Hãy thêm chương đầu tiên.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {course.chapters.map((chapter) => (
                          <div key={chapter.id} className="border rounded-lg">
                            <div className="p-3 bg-blue-50 flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <button
                                  onClick={() => toggleChapterExpansion(chapter.id)}
                                  className="text-gray-500 hover:text-gray-700"
                                >
                                  {expandedChapters.has(chapter.id) ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </button>
                                <FileText className="h-4 w-4 text-blue-600" />
                                <div>
                                  <h4 className="font-medium text-gray-900">
                                    Chương {chapter.order}: {chapter.title}
                                  </h4>
                                  <p className="text-sm text-gray-600">{chapter.description}</p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  icon={Plus}
                                  onClick={() => openModal('lesson', course, chapter)}
                                >
                                  Thêm bài học
                                </Button>
                              </div>
                            </div>

                            {expandedChapters.has(chapter.id) && (
                              <div className="p-3 border-t">
                                {chapter.lessons.length === 0 ? (
                                  <p className="text-gray-500 text-center py-2">
                                    Chưa có bài học nào. Hãy thêm bài học đầu tiên.
                                  </p>
                                ) : (
                                  <div className="space-y-2">
                                    {chapter.lessons.map((lesson) => (
                                      <div key={lesson.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                        <div className="flex items-center space-x-3">
                                          {lesson.type === 'video' ? (
                                            <Play className="h-4 w-4 text-green-600" />
                                          ) : (
                                            <FileText className="h-4 w-4 text-orange-600" />
                                          )}
                                          <div>
                                            <p className="font-medium text-gray-900">
                                              Bài {lesson.order}: {lesson.title}
                                            </p>
                                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                                              <span>{Math.floor(lesson.duration / 60)}:{(lesson.duration % 60).toString().padStart(2, '0')}</span>
                                              {lesson.isFree && (
                                                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                                                  Miễn phí
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Cài đặt website</h2>
        <Button variant="primary" onClick={saveSettings}>
          Lưu tất cả thay đổi
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Branding Settings */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Palette className="h-5 w-5 mr-2" />
            Thương hiệu & Màu sắc
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tên website
              </label>
              <input
                type="text"
                value={websiteSettings.siteName}
                onChange={(e) => setWebsiteSettings({...websiteSettings, siteName: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <FileUploadField
              label="Logo website"
              value={websiteSettings.logo}
              onChange={(url) => setWebsiteSettings({...websiteSettings, logo: url})}
              type="images"
              placeholder="URL logo website"
              onUpload={(file) => handleFileUpload(file, 'images', 'settings.logo')}
              uploadProgress={uploadProgress['settings.logo']}
              showMediaLibrary={() => openMediaLibrary('images', 'settings.logo')}
            />

            <FileUploadField
              label="Favicon"
              value={websiteSettings.favicon}
              onChange={(url) => setWebsiteSettings({...websiteSettings, favicon: url})}
              type="images"
              placeholder="URL favicon (16x16px)"
              onUpload={(file) => handleFileUpload(file, 'images', 'settings.favicon')}
              uploadProgress={uploadProgress['settings.favicon']}
              showMediaLibrary={() => openMediaLibrary('images', 'settings.favicon')}
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Màu chính
                </label>
                <input
                  type="color"
                  value={websiteSettings.primaryColor}
                  onChange={(e) => setWebsiteSettings({...websiteSettings, primaryColor: e.target.value})}
                  className="w-full h-10 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Màu phụ
                </label>
                <input
                  type="color"
                  value={websiteSettings.secondaryColor}
                  onChange={(e) => setWebsiteSettings({...websiteSettings, secondaryColor: e.target.value})}
                  className="w-full h-10 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Content & Images Settings */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Image className="h-5 w-5 mr-2" />
            Nội dung & Hình ảnh
          </h3>
          <div className="space-y-4">
            <FileUploadField
              label="Ảnh nền toàn trang"
              value={websiteSettings.backgroundImage}
              onChange={(url) => setWebsiteSettings({...websiteSettings, backgroundImage: url})}
              type="images"
              placeholder="URL ảnh nền website"
              onUpload={(file) => handleFileUpload(file, 'images', 'settings.backgroundImage')}
              uploadProgress={uploadProgress['settings.backgroundImage']}
              showMediaLibrary={() => openMediaLibrary('images', 'settings.backgroundImage')}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tiêu đề header
              </label>
              <input
                type="text"
                value={websiteSettings.headerText}
                onChange={(e) => setWebsiteSettings({...websiteSettings, headerText: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Văn bản footer
              </label>
              <input
                type="text"
                value={websiteSettings.footerText}
                onChange={(e) => setWebsiteSettings({...websiteSettings, footerText: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* SEO Settings */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Globe className="h-5 w-5 mr-2" />
            SEO & Meta Tags
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tiêu đề SEO
              </label>
              <input
                type="text"
                value={websiteSettings.seoTitle}
                onChange={(e) => setWebsiteSettings({...websiteSettings, seoTitle: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tiêu đề hiển thị trên Google"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mô tả SEO
              </label>
              <textarea
                value={websiteSettings.seoDescription}
                onChange={(e) => setWebsiteSettings({...websiteSettings, seoDescription: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Mô tả hiển thị trên Google (160 ký tự)"
              />
            </div>
          </div>
        </div>

        {/* Typography Settings */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Type className="h-5 w-5 mr-2" />
            Typography
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Font chữ
              </label>
              <select
                value={websiteSettings.fontFamily}
                onChange={(e) => setWebsiteSettings({...websiteSettings,
