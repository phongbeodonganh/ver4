import React, { useEffect, useRef, useState } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

interface VideoSource {
  src: string;
  type: string;
  label: string;
}

interface EnhancedVideoPlayerProps {
  videoUrls: {
    '480p'?: string;
    '720p'?: string;
    '1080p'?: string;
  };
  poster?: string;
  title?: string;
  onProgress?: (currentTime: number, duration: number) => void;
  onComplete?: () => void;
  autoplay?: boolean;
  startTime?: number;
}

const EnhancedVideoPlayer: React.FC<EnhancedVideoPlayerProps> = ({
  videoUrls,
  poster,
  title,
  onProgress,
  onComplete,
  autoplay = false,
  startTime = 0
}) => {
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Make sure Video.js player is only initialized once
    if (!playerRef.current) {
      // The Video.js player needs to be _inside_ the component el for React 18 Strict Mode
      const videoElement = document.createElement("video-js");
      
      videoElement.classList.add('vjs-big-play-centered');
      videoRef.current!.appendChild(videoElement);

      // Prepare video sources with quality labels
      const sources: VideoSource[] = [];
      
      if (videoUrls['1080p']) {
        sources.push({
          src: videoUrls['1080p'],
          type: 'video/mp4',
          label: '1080p'
        });
      }
      
      if (videoUrls['720p']) {
        sources.push({
          src: videoUrls['720p'],
          type: 'video/mp4',
          label: '720p'
        });
      }
      
      if (videoUrls['480p']) {
        sources.push({
          src: videoUrls['480p'],
          type: 'video/mp4',
          label: '480p'
        });
      }

      const player = playerRef.current = videojs(videoElement, {
        autoplay: autoplay,
        controls: true,
        responsive: true,
        fluid: true,
        poster: poster,
        sources: sources,
        playbackRates: [0.5, 1, 1.25, 1.5, 2],
        plugins: {
          // Quality selector plugin would go here
        }
      }, () => {
        videojs.log('Player is ready');
        setIsReady(true);
        
        // Set start time if provided
        if (startTime > 0) {
          player.currentTime(startTime);
        }
      });

      // Add event listeners
      player.on('timeupdate', () => {
        if (onProgress) {
          const currentTime = player.currentTime() || 0;
          const duration = player.duration() || 0;
          onProgress(currentTime, duration);
        }
      });

      player.on('ended', () => {
        if (onComplete) {
          onComplete();
        }
      });

      // Add quality selector manually if sources exist
      if (sources.length > 1) {
        addQualitySelector(player, sources);
      }
    }
  }, [videoUrls, poster, autoplay, startTime, onProgress, onComplete]);

  // Add custom quality selector
  const addQualitySelector = (player: any, sources: VideoSource[]) => {
    const qualityButton = player.controlBar.addChild('MenuButton', {
      title: 'Quality'
    });
    
    qualityButton.addClass('vjs-quality-selector');
    
    sources.forEach((source, index) => {
      const menuItem = qualityButton.menu.addChild('MenuItem', {
        label: source.label,
        selectable: true,
        selected: index === 0
      });
      
      menuItem.on('click', () => {
        const currentTime = player.currentTime();
        const isPaused = player.paused();
        
        player.src(source);
        player.ready(() => {
          player.currentTime(currentTime);
          if (!isPaused) {
            player.play();
          }
        });
        
        // Update selected state
        qualityButton.menu.children().forEach((child: any) => {
          child.selected(false);
        });
        menuItem.selected(true);
      });
    });
  };

  // Dispose the Video.js player when the functional component unmounts
  useEffect(() => {
    const player = playerRef.current;

    return () => {
      if (player && !player.isDisposed()) {
        player.dispose();
        playerRef.current = null;
      }
    };
  }, [playerRef]);

  return (
    <div className="w-full">
      {title && (
        <h3 className="text-lg font-semibold mb-4 text-gray-800">
          {title}
        </h3>
      )}
      <div 
        ref={videoRef} 
        className="video-container bg-black rounded-lg overflow-hidden shadow-lg"
        style={{ aspectRatio: '16/9' }}
      />
      {!isReady && (
        <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}
    </div>
  );
};

export default EnhancedVideoPlayer;
