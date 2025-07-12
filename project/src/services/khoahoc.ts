import { api } from './api';

export interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  price: number;
  isFree: boolean;
  chapters: Chapter[];
  totalLessons: number;
  completedLessons: number;
}

export interface Chapter {
  id: string;
  title: string;
  description: string;
  lessons: Lesson[];
  order: number;
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  duration: number;
  isFree: boolean;
  isCompleted: boolean;
  order: number;
}

export const courseService = {
  getFeaturedCourses: async (): Promise<Course[]> => {
    // Mock data - replace with real API call
    return [
      {
        id: '1',
        title: 'React Development Fundamentals',
        description: 'Learn the basics of React development with hands-on projects',
        thumbnail: 'https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=400',
        price: 299000,
        isFree: false,
        chapters: [],
        totalLessons: 24,
        completedLessons: 0
      },
      {
        id: '2',
        title: 'JavaScript Mastery',
        description: 'Master JavaScript from beginner to advanced level',
        thumbnail: 'https://images.pexels.com/photos/574077/pexels-photo-574077.jpeg?auto=compress&cs=tinysrgb&w=400',
        price: 199000,
        isFree: false,
        chapters: [],
        totalLessons: 32,
        completedLessons: 0
      },
      {
        id: '3',
        title: 'Web Design Basics',
        description: 'Learn fundamental web design principles and create beautiful websites',
        thumbnail: 'https://images.pexels.com/photos/196644/pexels-photo-196644.jpeg?auto=compress&cs=tinysrgb&w=400',
        price: 0,
        isFree: true,
        chapters: [],
        totalLessons: 12,
        completedLessons: 0
      }
    ];
  },

  getCourseById: async (id: string): Promise<Course> => {
    // Mock data - replace with real API call
    return {
      id,
      title: 'React Development Fundamentals',
      description: 'Learn the basics of React development with hands-on projects',
      thumbnail: 'https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=400',
      price: 299000,
      isFree: false,
      totalLessons: 24,
      completedLessons: 5,
      chapters: [
        {
          id: '1',
          title: 'Introduction to React',
          description: 'Getting started with React development',
          order: 1,
          lessons: [
            {
              id: '1',
              title: 'What is React?',
              description: 'Understanding React and its ecosystem',
              videoUrl: 'https://example.com/video1.mp4',
              duration: 600,
              isFree: true,
              isCompleted: true,
              order: 1
            },
            {
              id: '2',
              title: 'Setting up Development Environment',
              description: 'Installing Node.js, npm, and create-react-app',
              videoUrl: 'https://example.com/video2.mp4',
              duration: 900,
              isFree: true,
              isCompleted: false,
              order: 2
            }
          ]
        }
      ]
    };
  },

  markLessonCompleted: async (lessonId: string): Promise<void> => {
    // Mock API call - replace with real implementation
    console.log('Marking lesson as completed:', lessonId);
  },

  rateLesson: async (lessonId: string, rating: number, comment: string): Promise<void> => {
    // Mock API call - replace with real implementation
    console.log('Rating lesson:', lessonId, rating, comment);
  }
};