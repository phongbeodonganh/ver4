import React, { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDropzone } from 'react-dropzone';
import { Upload, Video, CheckCircle, AlertCircle, X, Play } from 'lucide-react';
import Button from '../common/Button';

// Validation schema
const videoUploadSchema = z.object({
  lessonId: z.number().min(1, 'ID bài học không hợp lệ'),
  video: z.instanceof(File, { message: 'Vui lòng chọn file video' })
    .refine((file) => file.size <= 500 * 1024 * 1024, 'File không được vượt quá 500MB')
    .refine(
      (file) => file.type.startsWith('video/'),
      'Chỉ chấp nhận file video'
    )
});

type VideoUploadForm = z.infer<typeof videoUploadSchema>;

interface VideoUploaderProps {
  lessonId: number;
  lessonTitle: string;
  onUploadComplete?: (videoData: any) => void;
  onClose?: () => void;
  existingVideo?: {
    videos: {
      '480p'?: string;
      '720p'?: string;
      '1080p'?: string;
      'original'?: string;
    };
    duration: number;
    fileSize: number;
  } | null;
}

interface UploadProgress {
  stage: 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  message: string;
}

const VideoUploader: React.FC<VideoUploaderProps> = ({
  lessonId,
  lessonTitle,
  onUploadComplete,
  onClose,
  existingVideo
}) => {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
    reset
  } = useForm<VideoUploadForm>({
    resolver: zodResolver(videoUploadSchema),
    defaultValues: {
      lessonId: lessonId
    }
  });

  // Handle file drop
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setSelectedFile(file);
      setValue('video', file);
      
      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  }, [setValue]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': []
    },
    maxFiles: 1,
    maxSize: 500 * 1024 * 1024 // 500MB
  });

  // Upload video
  const onSubmit = async (data: VideoUploadForm) => {
    try {
      setUploadProgress({
        stage: 'uploading',
        progress: 0,
        message: 'Đang tải video lên server...'
      });

      const formData = new FormData();
      formData.append('video', data.video);
      formData.append('lessonId', data.lessonId.toString());

      // Create XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();
      
      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress({
            stage: 'uploading',
            progress,
            message: `Đang tải lên... ${progress}%`
          });
        }
      });

      // Handle response
      xhr.addEventListener('load', () => {
        if (xhr.status === 202) {
          // Upload successful, now processing
          setUploadProgress({
            stage: 'processing',
            progress: 0,
            message: 'Video đang được xử lý, vui lòng đợi...'
          });

          // Poll for processing status
          pollProcessingStatus();
        } else {
          throw new Error('Upload failed');
        }
      });

      xhr.addEventListener('error', () => {
        setUploadProgress({
          stage: 'error',
          progress: 0,
          message: 'Lỗi khi tải video lên server'
        });
      });

      // Send request
      xhr.open('POST', `${import.meta.env.VITE_API_URL || 'https://api.linhmai.edu.vn'}/api/video/upload`);
      
      // Add auth header
      const token = localStorage.getItem('token');
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      
      xhr.send(formData);

    } catch (error) {
      console.error('Upload error:', error);
      setUploadProgress({
        stage: 'error',
        progress: 0,
        message: 'Có lỗi xảy ra khi tải video'
      });
    }
  };

  // Poll processing status
  const pollProcessingStatus = async () => {
    const maxAttempts = 60; // 5 minutes max
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || 'https://api.linhmai.edu.vn'}/api/video/status/${lessonId}`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        );

        const result = await response.json();

        if (result.success && result.data.status === 'completed') {
          setUploadProgress({
            stage: 'completed',
            progress: 100,
            message: 'Video đã được xử lý thành công!'
          });

          if (onUploadComplete) {
            onUploadComplete(result.data);
          }

          // Auto close after 2 seconds
          setTimeout(() => {
            handleClose();
          }, 2000);

        } else if (result.data?.status === 'failed') {
          setUploadProgress({
            stage: 'error',
            progress: 0,
            message: 'Xử lý video thất bại'
          });
        } else {
          // Still processing
          attempts++;
          const progress = Math.min((attempts / maxAttempts) * 100, 95);
          
          setUploadProgress({
            stage: 'processing',
            progress,
            message: `Đang xử lý video... ${Math.round(progress)}%`
          });

          if (attempts < maxAttempts) {
            setTimeout(poll, 5000); // Poll every 5 seconds
          } else {
            setUploadProgress({
              stage: 'error',
              progress: 0,
              message: 'Xử lý video mất quá nhiều thời gian'
            });
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
        setUploadProgress({
          stage: 'error',
          progress: 0,
          message: 'Lỗi khi kiểm tra trạng thái xử lý'
        });
      }
    };

    poll();
  };

  // Handle close
  const handleClose = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadProgress(null);
    reset();
    if (onClose) {
      onClose();
    }
  };

  // Remove selected file
  const removeFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setValue('video', undefined as any);
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format duration
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Upload Video</h2>
            <p className="text-sm text-gray-600 mt-1">
              Bài học: {lessonTitle}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={uploadProgress?.stage === 'uploading' || uploadProgress?.stage === 'processing'}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Existing Video Info */}
          {existingVideo && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">Video hiện tại</h3>
              <div className="text-sm text-blue-700">
                <p>Thời lượng: {formatDuration(existingVideo.duration)}</p>
                <p>Kích thước: {formatFileSize(existingVideo.fileSize)}</p>
                <p>Chất lượng có sẵn: {Object.keys(existingVideo.videos).join(', ')}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* File Upload Area */}
            {!selectedFile && !uploadProgress && (
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input {...getInputProps()} />
                <Video className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  {isDragActive ? 'Thả file video vào đây' : 'Chọn hoặc kéo thả file video'}
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  Hỗ trợ: MP4, AVI, MOV, WMV, FLV, WebM, MKV
                </p>
                <p className="text-xs text-gray-500">
                  Kích thước tối đa: 500MB
                </p>
              </div>
            )}

            {/* Selected File Preview */}
            {selectedFile && !uploadProgress && (
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-900">File đã chọn</h3>
                  <button
                    type="button"
                    onClick={removeFile}
                    className="text-red-600 hover:text-red-800"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="flex items-center space-x-4">
                  {previewUrl && (
                    <video
                      src={previewUrl}
                      className="w-32 h-20 object-cover rounded"
                      controls={false}
                    />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-sm text-gray-600">
                      {formatFileSize(selectedFile.size)}
                    </p>
                    <p className="text-sm text-gray-600">
                      {selectedFile.type}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Upload Progress */}
            {uploadProgress && (
              <div className="border rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-4">
                  {uploadProgress.stage === 'uploading' && (
                    <Upload className="h-5 w-5 text-blue-600 animate-pulse" />
                  )}
                  {uploadProgress.stage === 'processing' && (
                    <Video className="h-5 w-5 text-orange-600 animate-pulse" />
                  )}
                  {uploadProgress.stage === 'completed' && (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                  {uploadProgress.stage === 'error' && (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                  <span className="font-medium text-gray-900">
                    {uploadProgress.message}
                  </span>
                </div>

                {uploadProgress.stage !== 'error' && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        uploadProgress.stage === 'completed'
                          ? 'bg-green-600'
                          : uploadProgress.stage === 'processing'
                          ? 'bg-orange-600'
                          : 'bg-blue-600'
                      }`}
                      style={{ width: `${uploadProgress.progress}%` }}
                    />
                  </div>
                )}

                {uploadProgress.stage === 'processing' && (
                  <p className="text-sm text-gray-600 mt-2">
                    Video đang được chuyển đổi thành các chất lượng khác nhau (480p, 720p, 1080p)
                  </p>
                )}
              </div>
            )}

            {/* Error Messages */}
            {errors.video && (
              <p className="text-sm text-red-600">{errors.video.message}</p>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={uploadProgress?.stage === 'uploading' || uploadProgress?.stage === 'processing'}
              >
                {uploadProgress?.stage === 'completed' ? 'Đóng' : 'Hủy'}
              </Button>
              
              {selectedFile && !uploadProgress && (
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting}
                  icon={Upload}
                >
                  {isSubmitting ? 'Đang tải...' : 'Tải lên và xử lý'}
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VideoUploader;
