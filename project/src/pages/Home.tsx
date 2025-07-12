import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Course, courseService } from '../services/khoahoc';
import CourseCard from '../components/course/CourseCard';
import Button from '../components/common/Button';
import { Play, BookOpen, Users, Award, ArrowRight } from 'lucide-react';

const Home: React.FC = () => {
  const [featuredCourses, setFeaturedCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadFeaturedCourses = async () => {
      try {
        const courses = await courseService.getFeaturedCourses();
        setFeaturedCourses(courses);
      } catch (error) {
        console.error('Error loading featured courses:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFeaturedCourses();
  }, []);

  const handleViewCourseDetails = (courseId: string) => {
    navigate(`/course/${courseId}`);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
                Học tập trực tuyến
                <span className="text-blue-600"> hiệu quả</span>
              </h1>
              <p className="text-lg text-gray-600 mb-8">
                Nền tảng học tập trực tuyến hàng đầu với hàng nghìn khóa học chất lượng cao, 
                giúp bạn phát triển kỹ năng và đạt được mục tiêu nghề nghiệp.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => navigate('/login')}
                  className="w-full sm:w-auto"
                >
                  Bắt đầu học ngay
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  icon={Play}
                  className="w-full sm:w-auto"
                >
                  Xem video giới thiệu
                </Button>
              </div>
            </div>
            <div className="relative">
              <img
                src="https://images.pexels.com/photos/3861958/pexels-photo-3861958.jpeg?auto=compress&cs=tinysrgb&w=600"
                alt="Online Learning"
                className="rounded-lg shadow-2xl"
              />
              <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-lg shadow-xl">
                <div className="flex items-center space-x-3">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <Users className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">10,000+</p>
                    <p className="text-xs text-gray-600">Học viên</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Tại sao chọn chúng tôi?</h2>
            <p className="text-lg text-gray-600">Những lợi ích vượt trội khi học tập tại EduPlatform</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6 bg-gray-50 rounded-lg">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Chất lượng cao</h3>
              <p className="text-gray-600">Khóa học được thiết kế bởi các chuyên gia hàng đầu trong ngành</p>
            </div>

            <div className="text-center p-6 bg-gray-50 rounded-lg">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Cộng đồng học tập</h3>
              <p className="text-gray-600">Kết nối với hàng nghìn học viên cùng chí hướng</p>
            </div>

            <div className="text-center p-6 bg-gray-50 rounded-lg">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Chứng chỉ uy tín</h3>
              <p className="text-gray-600">Nhận chứng chỉ được công nhận trong ngành</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Courses */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Khóa học nổi bật</h2>
            <p className="text-lg text-gray-600">Khám phá các khóa học được yêu thích nhất</p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  onViewDetails={handleViewCourseDetails}
                />
              ))}
            </div>
          )}

          <div className="text-center mt-12">
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate('/courses')}
              className="inline-flex items-center"
            >
              Xem tất cả khóa học
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Free Resources */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Tài liệu miễn phí</h2>
            <p className="text-lg text-gray-600">Truy cập ngay các tài liệu học tập chất lượng</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'E-book JavaScript', downloads: '2.5k', type: 'PDF' },
              { title: 'Video React Cơ bản', downloads: '1.8k', type: 'Video' },
              { title: 'Cheat Sheet CSS', downloads: '3.2k', type: 'PDF' },
              { title: 'Template Landing Page', downloads: '1.5k', type: 'HTML' }
            ].map((resource, index) => (
              <div key={index} className="bg-gray-50 p-6 rounded-lg hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    {resource.type}
                  </span>
                  <span className="text-sm text-gray-500">{resource.downloads} lượt tải</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{resource.title}</h3>
                <Button variant="outline" size="sm" className="w-full">
                  Tải xuống
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Sẵn sàng bắt đầu hành trình học tập?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Đăng ký ngay để trải nghiệm các khóa học chất lượng cao
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="secondary"
              size="lg"
              onClick={() => navigate('/register')}
              className="bg-white text-blue-600 hover:bg-gray-100"
            >
              Đăng ký miễn phí
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-white text-white hover:bg-white hover:text-blue-600"
            >
              Xem trước bài học mẫu
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;