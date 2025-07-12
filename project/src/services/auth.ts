import { api } from './api';

export const authService = {
  login: async (email: string, password: string) => {
    // Mock authentication - replace with real API call
    const mockUsers = [
      { id: '1', email: 'student@example.com', name: 'Student User', role: 'user' as const },
      { id: '2', email: 'admin@example.com', name: 'Admin User', role: 'admin' as const }
    ];
    
    const user = mockUsers.find(u => u.email === email);
    if (!user) throw new Error('Invalid credentials');
    
    return {
      token: 'mock-jwt-token',
      user
    };
  },

  register: async (email: string, password: string, name: string) => {
    // Mock registration - replace with real API call
    return {
      token: 'mock-jwt-token',
      user: {
        id: Date.now().toString(),
        email,
        name,
        role: 'user' as const
      }
    };
  },

  getCurrentUser: async () => {
    // Mock user data - replace with real API call
    const email = localStorage.getItem('userEmail') || 'student@example.com';
    const mockUsers = [
      { id: '1', email: 'student@example.com', name: 'Student User', role: 'user' as const },
      { id: '2', email: 'admin@example.com', name: 'Admin User', role: 'admin' as const }
    ];
    
    const user = mockUsers.find(u => u.email === email);
    if (!user) throw new Error('User not found');
    
    return user;
  }
};