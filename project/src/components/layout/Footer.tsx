import React from 'react';
import { BookOpen, Youtube, MessageCircle, Phone, Mail } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <BookOpen className="h-8 w-8 text-blue-400" />
              <span className="text-xl font-bold">EduPlatform</span>
            </div>
            <p className="text-gray-300 mb-4">
              Nền tảng học tập trực tuyến hàng đầu Việt Nam, cung cấp các khóa học chất lượng cao 
              từ cơ bản đến nâng cao trong lĩnh vực công nghệ và kinh doanh.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-300 hover:text-red-400 transition-colors">
                <Youtube className="h-6 w-6" />
              </a>
              <a href="#" className="text-gray-300 hover:text-blue-400 transition-colors">
                <MessageCircle className="h-6 w-6" />
              </a>
              <a href="#" className="text-gray-300 hover:text-green-400 transition-colors">
                <Phone className="h-6 w-6" />
              </a>
              <a href="#" className="text-gray-300 hover:text-blue-400 transition-colors">
                <Mail className="h-6 w-6" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Khóa học</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Lập trình Web</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Mobile App</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Data Science</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Digital Marketing</a></li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Hỗ trợ</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Điều khoản sử dụng</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Chính sách bảo mật</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Câu hỏi thường gặp</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Liên hệ</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; 2024 EduPlatform. Tất cả quyền được bảo lưu.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;