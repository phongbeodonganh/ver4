import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, Trash2, Eye, Download, Upload, 
  Image, Video, FileText, Grid, List, ChevronLeft, ChevronRight
} from 'lucide-react';
import Button from '../common/Button';
import FileUpload from '../common/FileUpload';
import Modal from '../common/Modal';

interface MediaFile {
  filename: string;
  type: 'images' | 'videos' | 'documents';
  size: number;
  formattedSize: string;
  url: string;
  path: string;
  uploadDate: string;
  modifiedDate: string;
}

interface MediaLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFile?: (file: MediaFile) => void;
  allowMultiple?: boolean;
  fileType?: 'images' | 'videos' | 'documents' | 'all';
}

const MediaLibrary: React.FC<MediaLibraryProps> = ({
  isOpen,
  onClose,
  onSelectFile,
  allowMultiple = false,
  fileType = 'all'
}) => {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<MediaFile[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>(fileType === 'all' ? '' : fileType);
  const [showUpload, setShowUpload] = useState(false);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      fetchFiles();
      fetchStats();
    }
  }, [isOpen, currentPage, searchTerm, filterType]);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(searchTerm && { search: searchTerm }),
        ...(filterType && { type: filterType })
      });

      const response = await fetch(`/api/uploads/media?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFiles(data.data.files);
        setTotalPages(data.data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/uploads/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleFileSelect = (file: MediaFile) => {
    if (allowMultiple) {
      setSelectedFiles(prev => {
        const isSelected = prev.some(f => f.filename === file.filename);
        if (isSelected) {
          return prev.filter(f => f.filename !== file.filename);
        } else {
          return [...prev, file];
        }
      });
    } else {
      setSelectedFiles([file]);
    }
  };

  const handleConfirmSelection = () => {
    if (onSelectFile && selectedFiles.length > 0) {
      if (allowMultiple) {
        onSelectFile(selectedFiles as any);
      } else {
        onSelectFile(selectedFiles[0]);
      }
    }
    onClose();
  };

  const handleDeleteFile = async (file: MediaFile) => {
    if (confirm(`Bạn có chắc muốn xóa file "${file.filename}"?`)) {
      try {
        const response = await fetch(`/api/uploads/media/${file.type}/${file.filename}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          fetchFiles();
          fetchStats();
        }
      } catch (error) {
        console.error('Error deleting file:', error);
      }
    }
  };

  const getFileIcon = (file: MediaFile) => {
    switch (file.type) {
      case 'images':
        return <Image className="h-6 w-6 text-blue-500" />;
      case 'videos':
        return <Video className="h-6 w-6 text-purple-500" />;
      case 'documents':
        return <FileText className="h-6 w-6 text-gray-500" />;
      default:
        return <FileText className="h-6 w-6 text-gray-500" />;
    }
  };

  const renderGridView = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {files.map((file) => (
        <div
          key={file.filename}
          className={`
            relative border-2 rounded-lg p-3 cursor-pointer transition-all
            ${selectedFiles.some(f => f.filename === file.filename)
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
            }
          `}
          onClick={() => handleFileSelect(file)}
        >
          <div className="aspect-square mb-2 flex items-center justify-center bg-gray-100 rounded">
            {file.type === 'images' ? (
              <img
                src={file.url}
                alt={file.filename}
                className="w-full h-full object-cover rounded"
              />
            ) : (
              getFileIcon(file)
            )}
          </div>
          <p className="text-xs font-medium truncate" title={file.filename}>
            {file.filename}
          </p>
          <p className="text-xs text-gray-500">{file.formattedSize}</p>
          
          <div className="absolute top-2 right-2 flex space-x-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.open(file.url, '_blank');
              }}
              className="p-1 bg-white rounded shadow hover:bg-gray-50"
            >
              <Eye className="h-3 w-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteFile(file);
              }}
              className="p-1 bg-white rounded shadow hover:bg-red-50 text-red-600"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  const renderListView = () => (
    <div className="space-y-2">
      {files.map((file) => (
        <div
          key={file.filename}
          className={`
            flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all
            ${selectedFiles.some(f => f.filename === file.filename)
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
            }
          `}
          onClick={() => handleFileSelect(file)}
        >
          <div className="flex items-center space-x-3">
            {getFileIcon(file)}
            <div>
              <p className="font-medium">{file.filename}</p>
              <p className="text-sm text-gray-500">
                {file.formattedSize} • {new Date(file.uploadDate).toLocaleDateString('vi-VN')}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.open(file.url, '_blank');
              }}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <Eye className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteFile(file);
              }}
              className="p-2 hover:bg-red-100 rounded text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Thư viện Media"
      maxWidth="xl"
    >
      <div className="space-y-6">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-600">Hình ảnh</p>
              <p className="text-2xl font-bold text-blue-900">{stats.images.count}</p>
              <p className="text-xs text-blue-600">{stats.images.formattedSize}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-purple-600">Video</p>
              <p className="text-2xl font-bold text-purple-900">{stats.videos.count}</p>
              <p className="text-xs text-purple-600">{stats.videos.formattedSize}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Tài liệu</p>
              <p className="text-2xl font-bold text-gray-900">{stats.documents.count}</p>
              <p className="text-xs text-gray-600">{stats.documents.formattedSize}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-600">Tổng cộng</p>
              <p className="text-2xl font-bold text-green-900">{stats.total.count}</p>
              <p className="text-xs text-green-600">{stats.total.formattedSize}</p>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm file..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tất cả loại</option>
              <option value="images">Hình ảnh</option>
              <option value="videos">Video</option>
              <option value="documents">Tài liệu</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUpload(true)}
              icon={Upload}
            >
              Upload
            </Button>
            
            <div className="flex border border-gray-300 rounded-md">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'text-gray-600'}`}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'text-gray-600'}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* File Grid/List */}
        <div className="min-h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <Upload className="h-12 w-12 mb-4" />
              <p>Chưa có file nào được upload</p>
              <Button
                variant="primary"
                onClick={() => setShowUpload(true)}
                className="mt-4"
              >
                Upload file đầu tiên
              </Button>
            </div>
          ) : (
            viewMode === 'grid' ? renderGridView() : renderListView()
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Trang {currentPage} / {totalPages}
            </p>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                icon={ChevronLeft}
              >
                Trước
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                icon={ChevronRight}
              >
                Sau
              </Button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div>
            {selectedFiles.length > 0 && (
              <p className="text-sm text-gray-600">
                Đã chọn {selectedFiles.length} file
              </p>
            )}
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={onClose}>
              Hủy
            </Button>
            {onSelectFile && (
              <Button
                variant="primary"
                onClick={handleConfirmSelection}
                disabled={selectedFiles.length === 0}
              >
                Chọn file
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <Modal
          isOpen={showUpload}
          onClose={() => setShowUpload(false)}
          title="Upload File"
          maxWidth="lg"
        >
          <div className="space-y-4">
            <FileUpload
              type={filterType as any || 'images'}
              multiple={true}
              onUploadSuccess={() => {
                fetchFiles();
                fetchStats();
                setShowUpload(false);
              }}
              onUploadError={(error) => {
                console.error('Upload error:', error);
              }}
            />
          </div>
        </Modal>
      )}
    </Modal>
  );
};

export default MediaLibrary;
