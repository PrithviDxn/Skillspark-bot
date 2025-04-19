
import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';

type User = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'candidate';
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role: 'admin' | 'candidate') => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// For demo purposes, we'll use local storage to simulate a backend
const mockUsers = [
  {
    id: '1',
    name: 'Admin User',
    email: 'admin@example.com',
    password: 'admin123',
    role: 'admin' as const
  },
  {
    id: '2',
    name: 'Candidate User',
    email: 'candidate@example.com',
    password: 'candidate123',
    role: 'candidate' as const
  }
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const storedUser = localStorage.getItem('interview_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Find user
      const foundUser = mockUsers.find(
        u => u.email === email && u.password === password
      );
      
      if (!foundUser) {
        throw new Error('Invalid credentials');
      }
      
      // Remove password before storing
      const { password: _, ...userWithoutPassword } = foundUser;
      setUser(userWithoutPassword);
      localStorage.setItem('interview_user', JSON.stringify(userWithoutPassword));
      toast.success('Successfully logged in!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Login failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string, role: 'admin' | 'candidate') => {
    setIsLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if user already exists
      const userExists = mockUsers.some(u => u.email === email);
      
      if (userExists) {
        throw new Error('User already exists');
      }
      
      // Create new user
      const newUser = {
        id: Date.now().toString(),
        name,
        email,
        role
      };
      
      // In a real app, this would be an API call to register
      mockUsers.push({ ...newUser, password });
      
      setUser(newUser);
      localStorage.setItem('interview_user', JSON.stringify(newUser));
      toast.success('Successfully registered!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Registration failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('interview_user');
    toast.info('You have been logged out');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin'
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
