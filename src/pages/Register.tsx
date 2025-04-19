
import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';

const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'candidate'>('candidate');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await register(name, email, password, role);
      navigate('/');
    } catch (error) {
      // Error is handled in auth context
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="w-full max-w-md mx-auto mt-8">
        <Card className="w-full">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Create an account</CardTitle>
            <CardDescription className="text-center">
              Enter your information to create an account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="********"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-3">
                <Label>Account Type</Label>
                <RadioGroup 
                  defaultValue="candidate" 
                  value={role}
                  onValueChange={(value) => setRole(value as 'admin' | 'candidate')}
                  className="flex space-x-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="candidate" id="candidate" />
                    <Label htmlFor="candidate">Candidate</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="admin" id="admin" />
                    <Label htmlFor="admin">Administrator</Label>
                  </div>
                </RadioGroup>
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating account...' : 'Create account'}
              </Button>
            </form>
          </CardContent>
          <CardFooter>
            <div className="text-sm text-center w-full text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-interview-primary hover:text-interview-accent">
                Log in
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </Layout>
  );
};

export default Register;
