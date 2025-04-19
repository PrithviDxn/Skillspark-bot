
import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Play, User, Clipboard, ArrowRight } from 'lucide-react';
import Layout from '@/components/Layout';

const Index: React.FC = () => {
  const { user, isAuthenticated } = useAuth();

  const renderUserDashboard = () => {
    if (!isAuthenticated) {
      return null;
    }

    if (user?.role === 'admin') {
      return (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Admin Dashboard</h2>
          <p className="text-gray-600 mb-4">
            Manage tech stacks, interview questions, and view candidate reports.
          </p>
          <Button asChild>
            <Link to="/admin/dashboard" className="flex items-center">
              <Clipboard size={16} className="mr-2" />
              Go to Admin Dashboard
            </Link>
          </Button>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">Ready for Your Interview?</h2>
        <p className="text-gray-600 mb-4">
          Select a tech stack and begin your technical interview with our AI interviewer.
        </p>
        <Button asChild>
          <Link to="/candidate/select" className="flex items-center">
            <Play size={16} className="mr-2" />
            Start New Interview
          </Link>
        </Button>
      </div>
    );
  };

  return (
    <Layout>
      {/* Hero section */}
      <div className="py-12 md:py-20 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-interview-primary to-interview-secondary">
          SkillSpark AI Interviews
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Elevate your technical interview process with AI-powered assessments. 
          Practice answering questions, receive immediate feedback, and improve your skills.
        </p>
        
        {renderUserDashboard()}
        
        {!isAuthenticated && (
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
            <Button size="lg" asChild>
              <Link to="/register" className="flex items-center">
                <User size={16} className="mr-2" />
                Create Account
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/login">
                Log In
              </Link>
            </Button>
          </div>
        )}
      </div>
      
      {/* Features section */}
      <div className="py-12 bg-gray-50 -mx-4 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="w-12 h-12 flex items-center justify-center bg-interview-primary bg-opacity-10 rounded-full text-interview-primary mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Select Your Tech Stack</h3>
              <p className="text-gray-600">
                Choose from a variety of technology stacks including React, Python, Node.js, and more.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="w-12 h-12 flex items-center justify-center bg-interview-secondary bg-opacity-10 rounded-full text-interview-secondary mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Answer Questions</h3>
              <p className="text-gray-600">
                Respond to technical questions with voice recordings. The AI transcribes your answers automatically.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="w-12 h-12 flex items-center justify-center bg-interview-accent bg-opacity-10 rounded-full text-interview-accent mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Get Evaluated</h3>
              <p className="text-gray-600">
                Our AI evaluates your responses, providing scores and detailed feedback to help you improve.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* CTA section */}
      <div className="py-16 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to Ace Your Next Interview?</h2>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Practice makes perfect. Start interviewing with our AI today and build your confidence.
        </p>
        
        {!isAuthenticated ? (
          <Button size="lg" asChild>
            <Link to="/register" className="flex items-center">
              Get Started
              <ArrowRight size={16} className="ml-2" />
            </Link>
          </Button>
        ) : (
          <Button size="lg" asChild>
            <Link to={user?.role === 'admin' ? '/admin/dashboard' : '/candidate/select'} className="flex items-center">
              Go to Dashboard
              <ArrowRight size={16} className="ml-2" />
            </Link>
          </Button>
        )}
      </div>
    </Layout>
  );
};

export default Index;
