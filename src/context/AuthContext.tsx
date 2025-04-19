import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { authAPI } from '../api';

type User = {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role?: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    if (token) {
      fetchCurrentUser();
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await authAPI.getMe();
      if (response.data && response.data.data) {
        setUser(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch user', error);
      localStorage.removeItem('token');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    
    try {
      const response = await authAPI.login({ email, password });
      if (response.data && response.data.token) {
        localStorage.setItem('token', response.data.token);
        await fetchCurrentUser();
        toast.success('Successfully logged in!');
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Login failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string, role?: string) => {
    setIsLoading(true);
    
    try {
      const userData = { name, email, password };
      // Only include role if it's specified and is 'admin'
      if (role === 'admin') {
        Object.assign(userData, { role });
      }
      
      const response = await authAPI.register(userData);
      if (response.data && response.data.token) {
        localStorage.setItem('token', response.data.token);
        await fetchCurrentUser();
        toast.success('Successfully registered!');
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Registration failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error', error);
    } finally {
      setUser(null);
      localStorage.removeItem('token');
      toast.info('You have been logged out');
    }
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
