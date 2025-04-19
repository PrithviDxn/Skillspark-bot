
import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';

const Header: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-white border-b">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link to="/" className="flex items-center space-x-2">
          <div className="bg-interview-primary rounded-lg p-2">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              width="24" 
              height="24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="text-white"
            >
              <path d="M19 10v2a7 7 0 0 1-14 0v-2M1 8h22M5 8V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3"></path>
              <circle cx="12" cy="16" r="1"></circle>
            </svg>
          </div>
          <span className="text-xl font-bold text-gray-900">SkillSpark</span>
        </Link>

        {isAuthenticated ? (
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              {user?.role === 'admin' ? 'Administrator' : 'Candidate'}: <span className="font-medium">{user?.name}</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center space-x-2"
                onClick={handleLogout}
              >
                <LogOut size={16} />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/login" className="flex items-center space-x-2">
                <User size={16} />
                <span>Login</span>
              </Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
