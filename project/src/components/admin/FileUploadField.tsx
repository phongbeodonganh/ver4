import React, { useState } from 'react';
import { Upload, Image, Video, FileText, X, Eye, Loader } from 'lucide-react';
import Button from '../common/Button';

interface FileUploadFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  type: 'images' | 'videos' | 'documents';
  accept?: string;
  placeholder?: string;
  required?: boolean;
  onUpload?: (file: File) => Promise<void>;
  uploadProgress?: number;
  showMediaLibrary?: () => void;
}

const FileUploadField: React.FC<FileUploadFieldProps> = ({
  label,
  value,
  onChange,
  type,
  accept,
  placeholder,
  required = false,
  onUpload,
  uploadProgress,
  showMediaLibrary
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);

  const getIcon = () => {
    switch (type) {
      case 'images':
        return <Image className="h-5 w-5" />;
      case 'videos':
        return <Video className="h-5 w-5" />;
      case 'documents':
        return <FileText className="h-5 w-5" />;
      default:
        return <Upload className="h-5 w-5" />;
    }
  };

  const getAcceptTypes = () => {
    if (accept) return accept;
    
    switch (type) {
      case 'images':
        return 'image/*';
      case 'videos':
        return 'video/*';
      case 'documents':
        return '.pdf,.doc,.docx,.ppt,.pptx,.txt';
      default:
        return '*/*';
    }
  };

  const handleFileSelect = async (file: File) => {
    if (onUpload) {
      setUploading(true);
      try {
        await onUpload(file);
      } catch (error) {
        console.error('Upload error:', error);
      } finally {
        setUploading(false);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const clearFile = () => {
    onChange('');
  };

  const getFileTypeLabel = () => {
    switch (type) {
      case 'images':
        return 'ảnh';
      case 'videos':
        return 'video';
      case 'documents':
        return 'tài liệu';
      default:
        return 'file';
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {/* Current file display */}
      {value && (
        <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg border">
          {getIcon()}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {value.split('/').pop() || 'File đã chọn'}
            </p>
            <p className="text-xs text-gray-500">
              {value}
            </p>
          </div>
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={() => window.open(value, '_blank')}
              className="p-1 text-blue-600 hover:text-blue-800"
              title="Xem file"
            >
              <Eye className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={clearFile}
              className="p-1 text-red-600 hover:text-red-800"
              title="Xóa file"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Upload area */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center transition-colors
          ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
          ${uploading ? 'pointer-events-none opacity-50' : 'hover:border-gray-400'}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {uploading ? (
          <div className="space-y-2">
            <Loader className="h-8 w-8 mx-auto animate-spin text-blue-500" />
            <p className="text-sm text-gray-600">Đang tải lên...</p>
            {uploadProgress !== undefined && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-center">
              {getIcon()}
            </div>
            <div>
              <p className="text-sm text-gray-600">
                Kéo thả {getFileTypeLabel()} vào đây hoặc
              </p>
              <div className="flex justify-center space-x-2 mt-2">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    accept={getAcceptTypes()}
                    onChange={handleFileInputChange}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    icon={Upload}
                  >
                    Chọn file
                  </Button>
                </label>
                {showMediaLibrary && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={showMediaLibrary}
                    icon={Image}
                  >
                    Thư viện
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Manual URL input */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-500">
          Hoặc nhập URL trực tiếp:
        </label>
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || `Nhập URL ${getFileTypeLabel()}...`}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
};

export default FileUploadField;
