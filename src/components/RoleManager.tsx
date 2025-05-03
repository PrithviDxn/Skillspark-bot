import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { roleAPI, techStackAPI } from '@/api';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type RoleFormData = {
  name: string;
  description: string;
};

type TechStack = {
  id: string;
  name: string;
  description: string;
};

type Role = {
  id: string;
  name: string;
  description: string;
  techStacks: TechStack[];
};

const RoleManager = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [techStacks, setTechStacks] = useState<TechStack[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const form = useForm<RoleFormData>({
    defaultValues: {
      name: '',
      description: ''
    }
  });

  // Fetch roles and tech stacks on component mount
  useEffect(() => {
    fetchRoles();
    fetchTechStacks();
  }, []);

  const fetchRoles = async () => {
    setIsLoading(true);
    try {
      const response = await roleAPI.getAll();
      if (response.data && response.data.data) {
        setRoles(response.data.data.map((role: any) => ({
          id: role._id,
          name: role.name,
          description: role.description,
          techStacks: role.techStacks?.map((stack: any) => ({
            id: typeof stack === 'object' ? stack._id : stack,
            name: typeof stack === 'object' ? stack.name : 'Loading...',
            description: typeof stack === 'object' ? stack.description : ''
          })) || []
        })));
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast.error('Failed to fetch roles');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTechStacks = async () => {
    try {
      const response = await techStackAPI.getAll();
      if (response.data && response.data.data) {
        setTechStacks(response.data.data.map((stack: any) => ({
          id: stack._id,
          name: stack.name,
          description: stack.description
        })));
      }
    } catch (error) {
      console.error('Error fetching tech stacks:', error);
      toast.error('Failed to fetch tech stacks');
    }
  };

  const handleSubmit = async (data: RoleFormData) => {
    setIsLoading(true);
    try {
      if (selectedRole) {
        // Update existing role
        await roleAPI.update(selectedRole.id, data);
        toast.success('Role updated successfully');
      } else {
        // Create new role
        await roleAPI.create(data);
        toast.success('Role created successfully');
      }
      
      // Reset form and refresh roles
      form.reset();
      setSelectedRole(null);
      fetchRoles();
    } catch (error) {
      console.error('Error saving role:', error);
      toast.error('Failed to save role');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (role: Role) => {
    setSelectedRole(role);
    form.setValue('name', role.name);
    form.setValue('description', role.description);
  };

  const handleDelete = async (roleId: string) => {
    if (!confirm('Are you sure you want to delete this role?')) return;
    
    setIsLoading(true);
    try {
      await roleAPI.delete(roleId);
      toast.success('Role deleted successfully');
      fetchRoles();
    } catch (error) {
      console.error('Error deleting role:', error);
      toast.error('Failed to delete role');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setSelectedRole(null);
    form.reset();
  };

  const handleAddTechStack = async (roleId: string, techStackId: string) => {
    setIsLoading(true);
    try {
      await roleAPI.addTechStacks(roleId, [techStackId]);
      toast.success('Tech stack added to role');
      fetchRoles();
    } catch (error) {
      console.error('Error adding tech stack to role:', error);
      toast.error('Failed to add tech stack to role');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveTechStack = async (roleId: string, techStackId: string) => {
    setIsLoading(true);
    try {
      await roleAPI.removeTechStack(roleId, techStackId);
      toast.success('Tech stack removed from role');
      fetchRoles();
    } catch (error) {
      console.error('Error removing tech stack from role:', error);
      toast.error('Failed to remove tech stack from role');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>{selectedRole ? 'Edit Role' : 'Add New Role'}</CardTitle>
          <CardDescription>
            {selectedRole ? 'Update role details' : 'Create a new role for candidates'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Frontend Developer" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe the role and responsibilities" 
                        {...field} 
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end space-x-2">
                {selectedRole && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleCancel}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                )}
                <Button type="submit" disabled={isLoading}>
                  {selectedRole ? 'Update Role' : 'Create Role'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manage Roles</CardTitle>
          <CardDescription>View, edit and manage tech stacks for each role</CardDescription>
        </CardHeader>
        <CardContent>
          {roles.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No roles found. Create your first role above.</p>
          ) : (
            <div className="space-y-6">
              {roles.map(role => (
                <div key={role.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-lg font-semibold">{role.name}</h3>
                      <p className="text-sm text-muted-foreground">{role.description}</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleEdit(role)}
                      >
                        Edit
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => handleDelete(role.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Tech Stacks</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {role.techStacks.map(stack => (
                        <Badge key={stack.id} variant="secondary" className="flex items-center gap-1">
                          {stack.name}
                          <button
                            className="ml-1 rounded-full hover:bg-muted p-0.5"
                            onClick={() => handleRemoveTechStack(role.id, stack.id)}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                      {role.techStacks.length === 0 && (
                        <span className="text-sm text-muted-foreground">No tech stacks assigned</span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Select
                        onValueChange={(value) => handleAddTechStack(role.id, value)}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Add tech stack" />
                        </SelectTrigger>
                        <SelectContent>
                          {techStacks
                            .filter(stack => !role.techStacks.some(s => s.id === stack.id))
                            .map(stack => (
                              <SelectItem key={stack.id} value={stack.id}>
                                {stack.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Button 
                        type="button" 
                        size="sm" 
                        variant="outline"
                        className="flex items-center gap-1"
                        disabled={techStacks.length === role.techStacks.length}
                      >
                        <Plus className="h-4 w-4" /> Add
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RoleManager;
