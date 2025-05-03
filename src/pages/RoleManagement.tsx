import React from 'react';
import { useAuth } from '@/context/AuthContext';
import RoleManager from '@/components/RoleManager';
import Layout from '@/components/Layout';

const RoleManagement = () => {
  const { user } = useAuth();
  
  // Check if user is admin
  const isAdmin = user?.role === 'admin';
  
  if (!isAdmin) {
    return (
      <Layout>
        <div className="container mx-auto py-8">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p>You do not have permission to access this page.</p>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8">Role Management</h1>
        <p className="text-muted-foreground mb-8">
          Create and manage roles for candidates. Each role can have multiple tech stacks associated with it.
          When scheduling an interview, candidates will be assigned a role and will receive questions based on the tech stacks associated with that role.
        </p>
        <RoleManager />
      </div>
    </Layout>
  );
};

export default RoleManagement;
