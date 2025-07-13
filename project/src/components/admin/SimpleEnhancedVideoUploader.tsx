import React, { useState, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Upload, X, CheckCircle, AlertCircle, Play } from 'lucide-react';
import { asyncVideoApi } from '../../services/enhancedApi';

// Validation schema
const videoUploadSchema = z.object({
  lessonId: z.number().min(1, 'Lesson ID is required'),
  title: z.string().optional(),
  description: z.string().optional(),
});

type VideoUploadForm = z.infer<typeof videoUploadSchema>;

interface JobProgress {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  currentStep: string;
  steps: Array<{
    name: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
  }>;
  eta?: string;
  result?: {
    videoId: string;
    urls: {
      '480p'?: string;
      '720p'?: string;
      '1080p'?: string;
    };
    duration: number;
    fileSize: number;
  };
}

interface SimpleEnhancedVideoUploaderProps {
  lessonId?: number;
  onUploadComplete?: (result: any) => void;
  onUploadError?: (error: string) => void;
}

const SimpleEnhancedVideoUploader: React.FC<SimpleEnhancedVideoUploaderProps> = ({
  lessonId,
  onUploadComplete,
  onUploadError
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [jobProgress, setJobProgress] = useState<JobProgress | null>(null);
  const [progressInterval, setProgressInterval] = useState<NodeJS.Timeout | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VideoUploadForm>({
    resolver: zodResolver(videoUploadSchema),
    defaultValues: {
      lessonId: lessonId || 0
    }
  });

  // Handle file selection
  const handleFileSelect = (file: File) => {
    // Validate file type
    const allowedTypes = ['video/mp4', 'video/avi', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please select a valid video file (MP4, AVI, MOV, WMV, WebM)');
      return;
    }

    // Validate file size (2GB max)
    if (file.size > 2 * 1024 * 1024 * 1024) {
      alert('File size must be less than 2GB');
      return;
    }

    setSelectedFile(file);
  };

  // Handle drag events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, []);

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  // Monitor upload progress
  const monitorProgress = useCallback(async (jobId: string) => {
    try {
      const progressData = await asyncVideoApi.getJobProgress(jobId);
      setJobProgress(progressData.data);

      if (progressData.data.status === 'completed') {
        setUploading(false);
        if (progressInterval) {
          clearInterval(progressInterval);
          setProgressInterval(null);
        }
        if (onUploadComplete) {
          onUploadComplete(progressData.data.result);
        }
      } else if (progressData.data.status === 'failed') {
        setUploading(false);
        if (progressInterval) {
          clearInterval(progressInterval);
          setProgressInterval(null);
        }
        if (onUploadError) {
          onUploadError('Video processing failed');
        }
      }
    } catch (error) {
      console.error('Error monitoring progress:', error);
    }
  }, [progressInterval, onUploadComplete, onUploadError]);

  // Handle form submission
  const onSubmit = async (data: VideoUploadForm) => {
    if (!selectedFile) {
      alert('Please select a video file');
      return;
    }

    setUploading(true);
    setJobProgress(null);

    try {
      const response = await asyncVideoApi.upload(
        data.lessonId,
        selectedFile,
        data.title,
        data.description
      );

      const jobId = response.data.jobId;
      
      // Start monitoring progress
      const interval = setInterval(() => {
        monitorProgress(jobId);
      }, 3000); // Check every 3 seconds

      setProgressInterval(interval);

    } catch (error: any) {
      setUploading(false);
      const errorMessage = error.response?.data?.message || 'Upload failed';
      if (onUploadError) {
        onUploadError(errorMessage);
      }
    }
  };

  // Cancel upload
  const cancelUpload = async () => {
    if (jobProgress?.jobId) {
      try {
        await asyncVideoApi.cancelJob(jobProgress.jobId);
        if (progressInterval) {
          clearInterval(progressInterval);
          setProgressInterval(null);
        }
        setUploading(false);
        setJobProgress(null);
      } catch (error) {
        console.error('Error canceling upload:', error);
      }
    }
  };

  // Remove selected file
  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Upload Video</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Lesson ID Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Lesson ID *
          </label>
          <input
            type="number"
            {...register('lessonId', { valueAsNumber: true })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter lesson ID"
          />
          {errors.lessonId && (
            <p className="mt-1 text-sm text-red-600">{errors.lessonId.message}</p>
          )}
        </div>

        {/* Title Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Video Title (Optional)
          </label>
          <input
            type="text"
            {...register('title')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter video title"
          />
        </div>

        {/* Description Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description (Optional)
          </label>
          <textarea
            {...register('description')}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter video description"
          />
        </div>

        {/* File Drop Zone */}
        {!selectedFile && (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              dragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-700 mb-2">
              {dragActive ? 'Drop video here' : 'Drag & drop video here'}
            </p>
            <p className="text-sm text-gray-500">
              or click to select file (Max 2GB)
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Supported formats: MP4, AVI, MOV, WMV, WebM
            </p>
          </div>
        )}

        {/* Selected File Display */}
        {selectedFile && (
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Play className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="font-medium text-gray-800">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
              </div>
              {!uploading && (
                <button
                  type="button"
                  onClick={removeFile}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Progress Display */}
        {jobProgress && (
          <div className="border rounded-lg p-4 bg-blue-50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-800">Processing Video</h3>
              <span className="text-sm text-gray-600">{jobProgress.progress}%</span>
            </div>
            
            {/* Overall Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${jobProgress.progress}%` }}
              />
            </div>

            {/* Current Step */}
            <p className="text-sm text-gray-600 mb-3">
              Current: {jobProgress.currentStep}
            </p>

            {/* Step Details */}
            <div className="space-y-2">
              {jobProgress.steps?.map((step, index) => (
                <div key={index} className="flex items-center space-x-2">
                  {step.status === 'completed' && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                  {step.status === 'processing' && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                  )}
                  {step.status === 'failed' && (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                  {step.status === 'pending' && (
                    <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                  )}
                  <span className={`text-sm ${
                    step.status === 'completed' ? 'text-green-600' :
                    step.status === 'processing' ? 'text-blue-600' :
                    step.status === 'failed' ? 'text-red-600' :
                    'text-gray-500'
                  }`}>
                    {step.name}
                  </span>
                </div>
              ))}
            </div>

            {jobProgress.eta && (
              <p className="text-xs text-gray-500 mt-3">
                Estimated time remaining: {jobProgress.eta}
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={!selectedFile || uploading}
            className={`flex-1 py-2 px-4 rounded-md font-medium ${
              !selectedFile || uploading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {uploading ? 'Processing...' : 'Upload Video'}
          </button>

          {uploading && (
            <button
              type="button"
              onClick={cancelUpload}
              className="px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Success Message */}
      {jobProgress?.status === 'completed' && jobProgress.result && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <h3 className="font-medium text-green-800">Upload Completed!</h3>
          </div>
          <p className="text-sm text-green-700 mb-3">
            Video processed successfully with multiple quality options.
          </p>
          <div className="text-xs text-green-600 space-y-1">
            <p>Video ID: {jobProgress.result.videoId}</p>
            <p>Duration: {Math.round(jobProgress.result.duration / 60)} minutes</p>
            <p>File Size: {formatFileSize(jobProgress.result.fileSize)}</p>
            <div className="mt-2">
              <p className="font-medium">Available Qualities:</p>
              {Object.entries(jobProgress.result.urls).map(([quality, url]) => (
                <p key={quality} className="ml-2">• {quality}: Available</p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleEnhancedVideoUploader;
