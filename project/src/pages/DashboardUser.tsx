import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Course, courseService } from '../services/khoahoc';
import VideoPlayer from '../components/course/VideoPlayer';
import ChatBot from '../components/course/ChatBot';
import { Play, CheckCircle, Star, Clock, BookOpen, Award } from 'lucide-react';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';

const DashboardUser: React.FC = () => {
  const { user } = useAuth();
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [userCourses, setUserCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUserCourses = async () => {
      try {
        // Mock data - replace with real API call
        const course = await courseService.getCourseById('1');
        setUserCourses([course]);
        setSelectedCourse(course);
        setSelectedLesson(course.chapters[0]?.lessons[0]);
      } catch (error) {
        console.error('Error loading user courses:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserCourses();
  }, []);

  const handleLessonSelect = (lesson: any) => {
    setSelectedLesson(lesson);
  };

  const handleMarkCompleted = async () => {
    if (selectedLesson) {
      await courseService.markLessonCompleted(selectedLesson.id);
      // Update lesson status in state
      setSelectedLesson({ ...selectedLesson, isCompleted: true });
    }
  };

  const handleRateLesson = async () => {
    if (selectedLesson) {
      await courseService.rateLesson(selectedLesson.id, rating, comment);
      setIsRatingModalOpen(false);
      setComment('');
      setRating(5);
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-80 bg-white shadow-lg overflow-y-auto">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-gray-900">Khóa học của tôi</h2>
          </div>

          {userCourses.map((course) => (
            <div key={course.id} className="p-4 border-b">
              <h3 className="font-semibold text-gray-900 mb-2">{course.title}</h3>
              <div className="space-y-2">
                {course.chapters.map((chapter) => (
                  <div key={chapter.id}>
                    <h4 className="font-medium text-gray-700 mb-1">{chapter.title}</h4>
                    <div className="ml-4 space-y-1">
                      {chapter.lessons.map((lesson) => (
                        <button
                          key={lesson.id}
                          onClick={() => handleLessonSelect(lesson)}
                          className={`flex items-center w-full p-2 text-left rounded-md transition-colors ${
                            selectedLesson?.id === lesson.id
                              ? 'bg-blue-50 text-blue-700'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex-shrink-0 mr-3">
                            {lesson.isCompleted ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <Play className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{lesson.title}</p>
                            <p className="text-xs text-gray-500 flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {formatDuration(lesson.duration)}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="bg-white shadow-sm p-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {selectedLesson?.title || 'Chọn bài học'}
                </h1>
                <p className="text-sm text-gray-600">
                  {selectedCourse?.title}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <BookOpen className="h-5 w-5 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {selectedCourse?.completedLessons}/{selectedCourse?.totalLessons} bài học
                  </span>
                </div>
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((selectedCourse?.completedLessons || 0) / (selectedCourse?.totalLessons || 1)) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Video Content */}
          <div className="flex-1 p-6">
            {selectedLesson ? (
              <div className="space-y-6">
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  <VideoPlayer
                    videoUrl={selectedLesson.videoUrl}
                    title={selectedLesson.title}
                    onProgress={(progress) => console.log('Progress:', progress)}
                    onEnded={() => console.log('Video ended')}
                  />
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-3">
                    {selectedLesson.title}
                  </h2>
                  <p className="text-gray-600 mb-6">
                    {selectedLesson.description}
                  </p>

                  <div className="flex items-center space-x-4">
                    <Button
                      variant={selectedLesson.isCompleted ? "secondary" : "primary"}
                      onClick={handleMarkCompleted}
                      icon={CheckCircle}
                    >
                      {selectedLesson.isCompleted ? "Đã hoàn thành" : "Đánh dấu hoàn thành"}
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => setIsRatingModalOpen(true)}
                      icon={Star}
                    >
                      Đánh giá bài học
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Chọn bài học để bắt đầu
                  </h2>
                  <p className="text-gray-600">
                    Hãy chọn một bài học từ sidebar để bắt đầu học tập
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rating Modal */}
      <Modal
        isOpen={isRatingModalOpen}
        onClose={() => setIsRatingModalOpen(false)}
        title="Đánh giá bài học"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Đánh giá (1-5 sao)
            </label>
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className={`p-1 ${rating >= star ? 'text-yellow-400' : 'text-gray-300'}`}
                >
                  <Star className="h-6 w-6 fill-current" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nhận xét
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Chia sẻ cảm nhận của bạn về bài học..."
            />
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setIsRatingModalOpen(false)}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              onClick={handleRateLesson}
            >
              Gửi đánh giá
            </Button>
          </div>
        </div>
      </Modal>

      {/* Chatbot */}
      <ChatBot />
    </div>
  );
};

export default DashboardUser;