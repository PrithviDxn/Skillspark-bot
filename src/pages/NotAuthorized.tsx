
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Layout from '@/components/Layout';

const NotAuthorized: React.FC = () => {
  return (
    <Layout>
      <div className="max-w-md mx-auto text-center py-10">
        <h1 className="text-3xl font-bold mb-4">Access Denied</h1>
        <p className="text-gray-600 mb-6">
          You don't have permission to access this page. Please log in with the appropriate account.
        </p>
        <div className="flex justify-center space-x-4">
          <Button asChild>
            <Link to="/login">Log In</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/">Go Home</Link>
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default NotAuthorized;
