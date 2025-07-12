import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { 
  Users, BookOpen, DollarSign, TrendingUp, Award, 
  Calendar, Eye, Settings, Plus, Edit, Trash2, ChevronDown,
  ChevronRight, Play, FileText, Upload, Palette, Image
} from 'lucide-react';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';

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

const DashboardAdmin: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'course' | 'chapter' | 'lesson' | 'user' | 'staff'>('course');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());

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

  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    course: ''
  });

  const [websiteSettings, setWebsiteSettings] = useState({
    logo: '',
    primaryColor: '#3B82F6',
    secondaryColor: '#10B981',
    bannerImage: '',
    siteName: 'EduPlatform',
    headerText: 'Nền tảng học tập trực tuyến hàng đầu',
    footerText: 'Tất cả quyền được bảo lưu.',
    socialLinks: {
      youtube: '',
      facebook: '',
      tiktok: '',
      zalo: ''
    }
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
            },
            {
              id: '2',
              title: 'Cài đặt môi trường',
              description: 'Hướng dẫn cài đặt Node.js và React',
              type: 'video',
              videoUrl: 'https://example.com/video2.mp4',
              duration: 900,
              order: 2,
              isFree: false
            }
          ]
        }
      ]
    }
  ]);

  const revenueData = [
    { month: 'Jan', revenue: 4000000 },
    { month: 'Feb', revenue: 3000000 },
    { month: 'Mar', revenue: 5000000 },
    { month: 'Apr', revenue: 4500000 },
    { month: 'May', revenue: 6000000 },
    { month: 'Jun', revenue: 5500000 },
  ];

  const courseData = [
    { name: 'React Development', students: 250, color: '#3B82F6' },
    { name: 'JavaScript Mastery', students: 180, color: '#10B981' },
    { name: 'Web Design', students: 120, color: '#F59E0B' },
    { name: 'Node.js Backend', students: 90, color: '#EF4444' },
  ];

  const staffData = [
    { name: 'Nguyễn Văn A', students: 45, revenue: 13500000, conversion: 85 },
    { name: 'Trần Thị B', students: 38, revenue: 11400000, conversion: 78 },
    { name: 'Lê Văn C', students: 32, revenue: 9600000, conversion: 72 },
    { name: 'Phạm Thị D', students: 28, revenue: 8400000, conversion: 65 },
  ];

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

  const openModal = (type: 'course' | 'chapter' | 'lesson' | 'user' | 'staff', course?: Course, chapter?: Chapter) => {
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
    } else if (type === 'user') {
      setUserForm({ name: '', email: '', password: '', course: '' });
    }
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

  const handleSaveCourse = () => {
    const newCourse: Course = {
      id: Date.now().toString(),
      title: courseForm.title,
      description: courseForm.description,
      price: parseInt(courseForm.price),
      thumbnail: courseForm.thumbnail,
      chapters: []
    };
    setCourses([...courses, newCourse]);
    setIsModalOpen(false);
  };

  const handleSaveChapter = () => {
    if (!selectedCourse) return;
    
    const newChapter: Chapter = {
      id: Date.now().toString(),
      title: chapterForm.title,
      description: chapterForm.description,
      order: parseInt(chapterForm.order),
      lessons: []
    };

    const updatedCourses = courses.map(course => {
      if (course.id === selectedCourse.id) {
        return {
          ...course,
          chapters: [...course.chapters, newChapter]
        };
      }
      return course;
    });

    setCourses(updatedCourses);
    setIsModalOpen(false);
  };

  const handleSaveLesson = () => {
    if (!selectedCourse || !selectedChapter) return;

    const newLesson: Lesson = {
      id: Date.now().toString(),
      title: lessonForm.title,
      description: lessonForm.description,
      type: lessonForm.type,
      videoUrl: lessonForm.videoUrl,
      documentUrl: lessonForm.documentUrl,
      duration: parseInt(lessonForm.duration),
      order: parseInt(lessonForm.order),
      isFree: lessonForm.isFree
    };

    const updatedCourses = courses.map(course => {
      if (course.id === selectedCourse.id) {
        return {
          ...course,
          chapters: course.chapters.map(chapter => {
            if (chapter.id === selectedChapter.id) {
              return {
                ...chapter,
                lessons: [...chapter.lessons, newLesson]
              };
            }
            return chapter;
          })
        };
      }
      return course;
    });

    setCourses(updatedCourses);
    setIsModalOpen(false);
  };

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

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Học viên theo khóa học</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={courseData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="students"
                label={({ name, students }) => `${name}: ${students}`}
              >
                {courseData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Hoạt động gần đây</h3>
        <div className="space-y-3">
          {[
            { activity: 'Nguyễn Văn A đăng ký khóa React Development', time: '2 phút trước' },
            { activity: 'Trần Thị B hoàn thành bài học "State Management"', time: '15 phút trước' },
            { activity: 'Lê Văn C gửi đánh giá 5 sao cho khóa JavaScript', time: '1 giờ trước' },
            { activity: 'Phạm Thị D thanh toán khóa học Web Design', time: '2 giờ trước' },
          ].map((item, index) => (
            <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">{item.activity}</p>
                <p className="text-xs text-gray-500">{item.time}</p>
              </div>
            </div>
          ))}
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
                    <button className="text-blue-600 hover:text-blue-900">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button className="text-red-600 hover:text-red-900">
                      <Trash2 className="h-4 w-4" />
                    </button>
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
                                <button className="text-blue-600 hover:text-blue-900">
                                  <Edit className="h-3 w-3" />
                                </button>
                                <button className="text-red-600 hover:text-red-900">
                                  <Trash2 className="h-3 w-3" />
                                </button>
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
                                        <div className="flex items-center space-x-2">
                                          <button className="text-blue-600 hover:text-blue-900">
                                            <Edit className="h-3 w-3" />
                                          </button>
                                          <button className="text-red-600 hover:text-red-900">
                                            <Trash2 className="h-3 w-3" />
                                          </button>
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

  const renderUsers = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Quản lý học viên</h2>
        <Button
          variant="primary"
          icon={Plus}
          onClick={() => openModal('user')}
        >
          Thêm học viên
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Học viên
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Khóa học
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tiến độ
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {[
              { name: 'Nguyễn Văn A', email: 'nguyenvana@email.com', course: 'React Development', progress: 75 },
              { name: 'Trần Thị B', email: 'tranthib@email.com', course: 'JavaScript Mastery', progress: 60 },
              { name: 'Lê Văn C', email: 'levanc@email.com', course: 'Web Design', progress: 90 },
              { name: 'Phạm Thị D', email: 'phamthid@email.com', course: 'Node.js Backend', progress: 45 },
            ].map((user, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{user.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{user.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{user.course}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-full bg-gray-200 rounded-full h-2 mr-3">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${user.progress}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-900">{user.progress}%</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button className="text-blue-600 hover:text-blue-900">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button className="text-red-600 hover:text-red-900">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderStaff = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Quản lý nhân viên Sale</h2>
        <Button
          variant="primary"
          icon={Plus}
          onClick={() => openModal('staff')}
        >
          Thêm nhân viên
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nhân viên
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Học viên
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Doanh thu
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Chuyển đổi
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {staffData.map((staff, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-700">
                        {staff.name.charAt(0)}
                      </span>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{staff.name}</div>
                      {index === 0 && (
                        <div className="flex items-center">
                          <Award className="h-4 w-4 text-yellow-500 mr-1" />
                          <span className="text-xs text-yellow-600">Top Performer</span>
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{staff.students}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {staff.revenue.toLocaleString('vi-VN')} VNĐ
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    staff.conversion >= 80 ? 'bg-green-100 text-green-800' :
                    staff.conversion >= 70 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {staff.conversion}%
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button className="text-blue-600 hover:text-blue-900">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button className="text-red-600 hover:text-red-900">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Cài đặt website</h2>
      
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
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Logo URL
              </label>
              <input
                type="url"
                value={websiteSettings.logo}
                onChange={(e) => setWebsiteSettings({...websiteSettings, logo: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://example.com/logo.png"
              />
            </div>

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

        {/* Content Settings */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Image className="h-5 w-5 mr-2" />
            Nội dung & Hình ảnh
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ảnh banner chính
              </label>
              <input
                type="url"
                value={websiteSettings.bannerImage}
                onChange={(e) => setWebsiteSettings({...websiteSettings, bannerImage: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://example.com/banner.jpg"
              />
            </div>

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

        {/* Social Media Settings */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Mạng xã hội
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                YouTube
              </label>
              <input
                type="url"
                value={websiteSettings.socialLinks.youtube}
                onChange={(e) => setWebsiteSettings({
                  ...websiteSettings,
                  socialLinks: {...websiteSettings.socialLinks, youtube: e.target.value}
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://youtube.com/@channel"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Facebook
              </label>
              <input
                type="url"
                value={websiteSettings.socialLinks.facebook}
                onChange={(e) => setWebsiteSettings({
                  ...websiteSettings,
                  socialLinks: {...websiteSettings.socialLinks, facebook: e.target.value}
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://facebook.com/page"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                TikTok
              </label>
              <input
                type="url"
                value={websiteSettings.socialLinks.tiktok}
                onChange={(e) => setWebsiteSettings({
                  ...websiteSettings,
                  socialLinks: {...websiteSettings.socialLinks, tiktok: e.target.value}
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://tiktok.com/@username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Zalo
              </label>
              <input
                type="text"
                value={websiteSettings.socialLinks.zalo}
                onChange={(e) => setWebsiteSettings({
                  ...websiteSettings,
                  socialLinks: {...websiteSettings.socialLinks, zalo: e.target.value}
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Số điện thoại Zalo"
              />
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Xem trước
          </h3>
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center space-x-3 mb-3">
              {websiteSettings.logo && (
                <img src={websiteSettings.logo} alt="Logo" className="h-8 w-8 object-contain" />
              )}
              <span className="font-bold" style={{color: websiteSettings.primaryColor}}>
                {websiteSettings.siteName}
              </span>
            </div>
            <div className="text-sm text-gray-600 mb-2">
              {websiteSettings.headerText}
            </div>
            {websiteSettings.bannerImage && (
              <img 
                src={websiteSettings.bannerImage} 
                alt="Banner" 
                className="w-full h-20 object-cover rounded mb-2"
              />
            )}
            <div className="text-xs text-gray-500">
              {websiteSettings.footerText}
            </div>
          </div>
          
          <div className="mt-4">
            <Button variant="primary" className="w-full">
              Áp dụng thay đổi
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderModal = () => {
    if (modalType === 'course') {
      return (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Thêm khóa học mới"
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tên khóa học *
              </label>
              <input
                type="text"
                value={courseForm.title}
                onChange={(e) => setCourseForm({...courseForm, title: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nhập tên khóa học"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mô tả khóa học *
              </label>
              <textarea
                value={courseForm.description}
                onChange={(e) => setCourseForm({...courseForm, description: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nhập mô tả khóa học"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Giá khóa học (VNĐ) *
              </label>
              <input
                type="number"
                value={courseForm.price}
                onChange={(e) => setCourseForm({...courseForm, price: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nhập giá khóa học"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ảnh thumbnail
              </label>
              <input
                type="url"
                value={courseForm.thumbnail}
                onChange={(e) => setCourseForm({...courseForm, thumbnail: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="URL ảnh thumbnail"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsModalOpen(false)}
              >
                Hủy
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveCourse}
              >
                Tạo khóa học
              </Button>
            </div>
          </div>
        </Modal>
      );
    }

    if (modalType === 'chapter') {
      return (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={`Thêm chương cho khóa học: ${selectedCourse?.title}`}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tên chương *
              </label>
              <input
                type="text"
                value={chapterForm.title}
                onChange={(e) => setChapterForm({...chapterForm, title: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nhập tên chương"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mô tả chương
              </label>
              <textarea
                value={chapterForm.description}
                onChange={(e) => setChapterForm({...chapterForm, description: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nhập mô tả chương"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Thứ tự chương *
              </label>
              <input
                type="number"
                value={chapterForm.order}
                onChange={(e) => setChapterForm({...chapterForm, order: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nhập thứ tự chương"
                min="1"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsModalOpen(false)}
              >
                Hủy
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveChapter}
              >
                Tạo chương
              </Button>
            </div>
          </div>
        </Modal>
      );
    }

    if (modalType === 'lesson') {
      return (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={`Thêm bài học cho chương: ${selectedChapter?.title}`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tên bài học *
              </label>
              <input
                type="text"
                value={lessonForm.title}
                onChange={(e) => setLessonForm({...lessonForm, title: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nhập tên bài học"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mô tả bài học
              </label>
              <textarea
                value={lessonForm.description}
                onChange={(e) => setLessonForm({...lessonForm, description: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nhập mô tả bài học"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Loại bài học *
                </label>
                <select
                  value={lessonForm.type}
                  onChange={(e) => setLessonForm({...lessonForm, type: e.target.value as 'video' | 'document' | 'quiz'})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="video">Video</option>
                  <option value="document">Tài liệu</option>
                  <option value="quiz">Bài tập</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Thứ tự bài học *
                </label>
                <input
                  type="number"
                  value={lessonForm.order}
                  onChange={(e) => setLessonForm({...lessonForm, order: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Thứ tự"
                  min="1"
                />
              </div>
            </div>

            {lessonForm.type === 'video' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL Video *
                </label>
                <input
                  type="url"
                  value={lessonForm.videoUrl}
                  onChange={(e) => setLessonForm({...lessonForm, videoUrl: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com/video.mp4"
                />
              </div>
            )}

            {lessonForm.type === 'document' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL Tài liệu *
                </label>
                <input
                  type="url"
                  value={lessonForm.documentUrl}
                  onChange={(e) => setLessonForm({...lessonForm, documentUrl: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com/document.pdf"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Thời lượng (giây) *
              </label>
              <input
                type="number"
                value={lessonForm.duration}
                onChange={(e) => setLessonForm({...lessonForm, duration: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Thời lượng tính bằng giây"
                min="1"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isFree"
                checked={lessonForm.isFree}
                onChange={(e) => setLessonForm({...lessonForm, isFree: e.target.checked})}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isFree" className="ml-2 block text-sm text-gray-900">
                Đây là bài học miễn phí (demo)
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsModalOpen(false)}
              >
                Hủy
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveLesson}
              >
                Tạo bài học
              </Button>
            </div>
          </div>
        </Modal>
      );
    }

    if (modalType === 'user') {
      return (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Thêm học viên mới"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tên học viên *
              </label>
              <input
                type="text"
                value={userForm.name}
                onChange={(e) => setUserForm({...userForm, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nhập tên học viên"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nhập email học viên"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mật khẩu *
              </label>
              <input
                type="password"
                value={userForm.password}
                onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nhập mật khẩu cho tài khoản"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Khóa học được cấp quyền
              </label>
              <select 
                value={userForm.course}
                onChange={(e) => setUserForm({...userForm, course: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Chọn khóa học</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>{course.title}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsModalOpen(false)}
              >
                Hủy
              </Button>
              <Button
                variant="primary"
                onClick={() => setIsModalOpen(false)}
              >
                Tạo tài khoản
              </Button>
            </div>
          </div>
        </Modal>
      );
    }

    return null;
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
    { id: 'courses', label: 'Khóa học', icon: BookOpen },
    { id: 'users', label: 'Học viên', icon: Users },
    { id: 'staff', label: 'Nhân viên', icon: Award },
    { id: 'settings', label: 'Cài đặt', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-lg">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-gray-900">Admin Dashboard</h2>
          </div>
          <nav className="mt-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center px-6 py-3 text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="h-5 w-5 mr-3" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'courses' && renderCourses()}
          {activeTab === 'users' && renderUsers()}
          {activeTab === 'staff' && renderStaff()}
          {activeTab === 'settings' && renderSettings()}
        </div>
      </div>

      {/* Modal */}
      {renderModal()}
    </div>
  );
};

export default DashboardAdmin;

export default DashboardAdmin