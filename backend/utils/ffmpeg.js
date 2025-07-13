const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

class VideoProcessor {
  constructor() {
    // Set FFmpeg path if needed (for production deployment)
    // ffmpeg.setFfmpegPath('/usr/bin/ffmpeg');
    // ffmpeg.setFfprobePath('/usr/bin/ffprobe');
  }

  /**
   * Process video to multiple qualities
   * @param {string} inputPath - Path to input video file
   * @param {string} outputDir - Directory to save processed videos
   * @param {string} baseFilename - Base filename without extension
   * @returns {Promise<Object>} - Object containing paths to processed videos
   */
  async processVideo(inputPath, outputDir, baseFilename) {
    try {
      // Ensure output directory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const qualities = [
        { name: '480p', width: 854, height: 480, bitrate: '1000k' },
        { name: '720p', width: 1280, height: 720, bitrate: '2500k' },
        { name: '1080p', width: 1920, height: 1080, bitrate: '4000k' }
      ];

      const processedVideos = {};
      const videoInfo = await this.getVideoInfo(inputPath);

      // Process each quality
      for (const quality of qualities) {
        const outputFilename = `${baseFilename}_${quality.name}.mp4`;
        const outputPath = path.join(outputDir, outputFilename);

        // Skip if target resolution is higher than source
        if (videoInfo.width < quality.width || videoInfo.height < quality.height) {
          continue;
        }

        await this.convertToQuality(inputPath, outputPath, quality);
        processedVideos[quality.name] = outputFilename;
      }

      // If no qualities were processed (source too small), create a single optimized version
      if (Object.keys(processedVideos).length === 0) {
        const outputFilename = `${baseFilename}_original.mp4`;
        const outputPath = path.join(outputDir, outputFilename);
        
        await this.optimizeVideo(inputPath, outputPath);
        processedVideos['original'] = outputFilename;
      }

      return {
        success: true,
        videos: processedVideos,
        duration: videoInfo.duration,
        originalSize: fs.statSync(inputPath).size
      };

    } catch (error) {
      console.error('Video processing error:', error);
      throw new Error(`Video processing failed: ${error.message}`);
    }
  }

  /**
   * Get video information
   * @param {string} inputPath - Path to video file
   * @returns {Promise<Object>} - Video metadata
   */
  getVideoInfo(inputPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
        
        resolve({
          duration: Math.floor(metadata.format.duration || 0),
          width: videoStream?.width || 0,
          height: videoStream?.height || 0,
          bitrate: metadata.format.bit_rate || 0,
          size: metadata.format.size || 0
        });
      });
    });
  }

  /**
   * Convert video to specific quality
   * @param {string} inputPath - Input video path
   * @param {string} outputPath - Output video path
   * @param {Object} quality - Quality settings
   * @returns {Promise<void>}
   */
  convertToQuality(inputPath, outputPath, quality) {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .videoBitrate(quality.bitrate)
        .size(`${quality.width}x${quality.height}`)
        .aspect('16:9')
        .autopad()
        .format('mp4')
        .outputOptions([
          '-preset fast',
          '-crf 23',
          '-movflags +faststart', // Enable progressive download
          '-pix_fmt yuv420p' // Ensure compatibility
        ])
        .on('start', (commandLine) => {
          console.log(`Starting ${quality.name} conversion:`, commandLine);
        })
        .on('progress', (progress) => {
          console.log(`${quality.name} processing: ${Math.round(progress.percent || 0)}% done`);
        })
        .on('end', () => {
          console.log(`${quality.name} conversion completed: ${outputPath}`);
          resolve();
        })
        .on('error', (err) => {
          console.error(`${quality.name} conversion error:`, err);
          reject(err);
        })
        .save(outputPath);
    });
  }

  /**
   * Optimize video without changing resolution
   * @param {string} inputPath - Input video path
   * @param {string} outputPath - Output video path
   * @returns {Promise<void>}
   */
  optimizeVideo(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .format('mp4')
        .outputOptions([
          '-preset fast',
          '-crf 23',
          '-movflags +faststart',
          '-pix_fmt yuv420p'
        ])
        .on('start', (commandLine) => {
          console.log('Starting video optimization:', commandLine);
        })
        .on('progress', (progress) => {
          console.log(`Optimization processing: ${Math.round(progress.percent || 0)}% done`);
        })
        .on('end', () => {
          console.log('Video optimization completed:', outputPath);
          resolve();
        })
        .on('error', (err) => {
          console.error('Video optimization error:', err);
          reject(err);
        })
        .save(outputPath);
    });
  }

  /**
   * Generate video thumbnail
   * @param {string} inputPath - Input video path
   * @param {string} outputPath - Output thumbnail path
   * @param {number} timeOffset - Time offset in seconds for thumbnail
   * @returns {Promise<void>}
   */
  generateThumbnail(inputPath, outputPath, timeOffset = 10) {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .screenshots({
          timestamps: [timeOffset],
          filename: path.basename(outputPath),
          folder: path.dirname(outputPath),
          size: '1280x720'
        })
        .on('end', () => {
          console.log('Thumbnail generated:', outputPath);
          resolve();
        })
        .on('error', (err) => {
          console.error('Thumbnail generation error:', err);
          reject(err);
        });
    });
  }

  /**
   * Clean up temporary files
   * @param {string[]} filePaths - Array of file paths to delete
   */
  cleanupFiles(filePaths) {
    filePaths.forEach(filePath => {
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log('Cleaned up file:', filePath);
        } catch (error) {
          console.error('Error cleaning up file:', filePath, error);
        }
      }
    });
  }
}

module.exports = new VideoProcessor();
