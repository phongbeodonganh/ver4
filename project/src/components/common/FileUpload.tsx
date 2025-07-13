import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, File, Image, Video, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import UploadService, { UploadProgress, UploadResponse } from '../../services/upload';

interface FileUploadProps {
  type: 'image' | 'video' | 'document' | 'images';
  accept?: string;
  maxSize?: number;
  multiple?: boolean;
  onUploadSuccess?: (response: UploadResponse | UploadResponse[]) => void;
  onUploadError?: (error: string) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}

interface FileWithProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  response?: UploadResponse;
}

const FileUpload: React.FC<FileUploadProps> = ({
  type,
  accept,
  maxSize = 10,
  multiple = false,
  onUploadSuccess,
  onUploadError,
  className = '',
  disabled = false,
  placeholder
}) => {
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getAcceptedTypes = () => {
    if (accept) return accept;
    
    switch (type) {
      case 'image':
      case 'images':
        return 'image/*';
      case 'video':
        return 'video/*';
      case 'document':
        return '.pdf,.doc,.docx,.ppt,.pptx,.txt';
      default:
        return '*/*';
    }
  };

  const getMaxSize = () => {
    switch (type) {
      case 'image':
      case 'images':
        return 5; // 5MB for images
      case 'video':
        return 1024; // 1GB for videos
      case 'document':
        return 10; // 10MB for documents
      default:
        return maxSize;
    }
  };

  const validateFile = (file: File): string | null => {
    // Check file size
    const maxSizeInBytes = getMaxSize() * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      return `File quá lớn. Kích thước tối đa: ${getMaxSize()}MB`;
    }

    // Check file type
    const acceptedTypes = getAcceptedTypes();
    if (acceptedTypes !== '*/*') {
      const isValid = acceptedTypes.split(',').some(acceptedType => {
        const trimmedType = acceptedType.trim();
        if (trimmedType.startsWith('.')) {
          return file.name.toLowerCase().endsWith(trimmedType.toLowerCase());
        }
        if (trimmedType.includes('/*')) {
          const baseType = trimmedType.split('/')[0];
          return file.type.startsWith(baseType);
        }
        return file.type === trimmedType;
      });

      if (!isValid) {
        return `Loại file không được hỗ trợ. Chỉ chấp nhận: ${acceptedTypes}`;
      }
    }

    return null;
  };

  const handleFileSelect = useCallback((selectedFiles: FileList) => {
    const newFiles: FileWithProgress[] = [];
    
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const error = validateFile(file);
      
      newFiles.push({
        file,
        progress: 0,
        status: error ? 'error' : 'pending',
        error
      });
    }

    if (multiple) {
      setFiles(prev => [...prev, ...newFiles]);
    } else {
      setFiles(newFiles);
    }

    // Start uploading valid files
    newFiles.forEach((fileWithProgress, index) => {
      if (fileWithProgress.status === 'pending') {
        uploadFile(fileWithProgress, multiple ? files.length + index : index);
      }
    });
  }, [files.length, multiple]);

  const uploadFile = async (fileWithProgress: FileWithProgress, index: number) => {
    setFiles(prev => prev.map((f, i) => 
      i === index ? { ...f, status: 'uploading' } : f
    ));

    try {
      let response: UploadResponse;
      
      const onProgress = (progress: UploadProgress) => {
        setFiles(prev => prev.map((f, i) => 
          i === index ? { ...f, progress: progress.percentage } : f
        ));
      };

      switch (type) {
        case 'image':
          response = await UploadService.uploadImage(fileWithProgress.file, onProgress);
          break;
        case 'video':
          response = await UploadService.uploadVideo(fileWithProgress.file, onProgress);
          break;
        case 'document':
          response = await UploadService.uploadDocument(fileWithProgress.file, onProgress);
          break;
        case 'images':
          // For multiple images, we upload them one by one
          response = await UploadService.uploadImage(fileWithProgress.file, onProgress);
          break;
        default:
          throw new Error('Unsupported upload type');
      }

      setFiles(prev => prev.map((f, i) => 
        i === index ? { ...f, status: 'success', progress: 100, response } : f
      ));

      if (onUploadSuccess) {
        if (type === 'images' && multiple) {
          // For multiple images, we'll call onUploadSuccess for each successful upload
          onUploadSuccess(response);
        } else if (!multiple) {
          onUploadSuccess(response);
        }
      }

    } catch (error: any) {
      const errorMessage = error.message || 'Lỗi upload file';
      
      setFiles(prev => prev.map((f, i) => 
        i === index ? { ...f, status: 'error', error: errorMessage } : f
      ));

      if (onUploadError) {
        onUploadError(errorMessage);
      }
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (disabled) return;

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      handleFileSelect(droppedFiles);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      handleFileSelect(selectedFiles);
    }
  };

  const openFileDialog = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="h-8 w-8 text-blue-500" />;
    } else if (file.type.startsWith('video/')) {
      return <Video className="h-8 w-8 text-purple-500" />;
    } else {
      return <FileText className="h-8 w-8 text-gray-500" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getPlaceholderText = () => {
    if (placeholder) return placeholder;
    
    switch (type) {
      case 'image':
        return 'Kéo thả hoặc click để chọn hình ảnh';
      case 'video':
        return 'Kéo thả hoặc click để chọn video';
      case 'document':
        return 'Kéo thả hoặc click để chọn tài liệu';
      case 'images':
        return 'Kéo thả hoặc click để chọn nhiều hình ảnh';
      default:
        return 'Kéo thả hoặc click để chọn file';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-400 hover:bg-gray-50'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-lg font-medium text-gray-700 mb-2">
          {getPlaceholderText()}
        </p>
        <p className="text-sm text-gray-500">
          Kích thước tối đa: {getMaxSize()}MB
          {multiple && ' • Có thể chọn nhiều file'}
        </p>
        
        <input
          ref={fileInputRef}
          type="file"
          accept={getAcceptedTypes()}
          multiple={multiple}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Files đã chọn:</h4>
          {files.map((fileWithProgress, index) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  {getFileIcon(fileWithProgress.file)}
                  <div>
                    <p className="font-medium text-gray-900">
                      {fileWithProgress.file.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {UploadService.formatFileSize(fileWithProgress.file.size)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(fileWithProgress.status)}
                  <button
                    onClick={() => removeFile(index)}
                    className="text-gray-400 hover:text-red-500"
                    disabled={fileWithProgress.status === 'uploading'}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              {fileWithProgress.status === 'uploading' && (
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${fileWithProgress.progress}%` }}
                  />
                </div>
              )}

              {/* Error Message */}
              {fileWithProgress.status === 'error' && fileWithProgress.error && (
                <p className="text-sm text-red-600 mt-2">
                  {fileWithProgress.error}
                </p>
              )}

              {/* Success Message */}
              {fileWithProgress.status === 'success' && fileWithProgress.response && (
                <div className="text-sm text-green-600 mt-2">
                  <p>Upload thành công!</p>
                  <p className="text-xs text-gray-500 mt-1">
                    URL: {fileWithProgress.response.data.url}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
