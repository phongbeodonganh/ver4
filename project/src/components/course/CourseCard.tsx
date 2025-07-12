import React from 'react';
import { Course } from '../../services/khoahoc';
import { Clock, Users, Star, Play } from 'lucide-react';
import Button from '../common/Button';

interface CourseCardProps {
  course: Course;
  onViewDetails: (courseId: string) => void;
}

const CourseCard: React.FC<CourseCardProps> = ({ course, onViewDetails }) => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative">
        <img
          src={course.thumbnail}
          alt={course.title}
          className="w-full h-48 object-cover"
        />
        {course.isFree && (
          <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-md text-sm font-medium">
            Miễn phí
          </div>
        )}
        <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all flex items-center justify-center">
          <Play className="h-12 w-12 text-white opacity-0 hover:opacity-100 transition-opacity" />
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{course.title}</h3>
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{course.description}</p>
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              <span>{course.totalLessons} bài học</span>
            </div>
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-1" />
              <span>1.2k</span>
            </div>
            <div className="flex items-center">
              <Star className="h-4 w-4 mr-1 text-yellow-500" />
              <span>4.8</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-lg font-bold text-gray-900">
            {course.isFree ? 'Miễn phí' : `${course.price.toLocaleString('vi-VN')} VNĐ`}
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onViewDetails(course.id)}
          >
            Xem chi tiết
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CourseCard;