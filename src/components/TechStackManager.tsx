import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, X, Edit, Trash } from 'lucide-react';
import { toast } from 'sonner';
import { techStackAPI, roleAPI } from '@/api';
import { useInterview } from '@/context/InterviewContext';
import axios, { AxiosError } from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type TechStack = {
  _id: string;
  id: string;
  name: string;
  description: string;
};

type Role = {
  _id: string;
  id: string;
  name: string;
  description: string;
  techStacks: TechStack[];
};

interface TechStackManagerProps {
  displayFullCard?: boolean;
}

const TechStackManager: React.FC<TechStackManagerProps> = ({ displayFullCard = false }) => {
  // Tech Stack state
  const [isSubmittingStack, setIsSubmittingStack] = useState(false);
  const [newStackName, setNewStackName] = useState('');
  const [newStackDescription, setNewStackDescription] = useState('');
  const [techStacks, setTechStacks] = useState<TechStack[]>([]);
  
  // Role state
  const [isSubmittingRole, setIsSubmittingRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedTechStackId, setSelectedTechStackId] = useState('');
  
  // Edit dialog state
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingStack, setEditingStack] = useState<TechStack | null>(null);
  const [editStackName, setEditStackName] = useState('');
  const [editStackDescription, setEditStackDescription] = useState('');
  
  const { refreshTechStacks } = useInterview();
  
  // Fetch tech stacks and roles on component mount
  useEffect(() => {
    fetchTechStacks();
    fetchRoles();
  }, []);
  
  const fetchTechStacks = async () => {
    try {
      const response = await techStackAPI.getAll();
      if (response.data && response.data.data) {
        const formattedStacks = response.data.data.map((stack: any) => ({
          _id: stack._id,
          id: stack._id,
          name: stack.name,
          description: stack.description
        }));
        setTechStacks(formattedStacks);
      }
    } catch (error) {
      console.error('Error fetching tech stacks:', error);
      toast.error('Failed to fetch tech stacks');
    }
  };
  
  const fetchRoles = async () => {
    try {
      const response = await roleAPI.getAll();
      if (response.data && response.data.data) {
        const formattedRoles = response.data.data.map((role: any) => ({
          _id: role._id,
          id: role._id,
          name: role.name,
          description: role.description,
          techStacks: role.techStacks?.map((stack: any) => ({
            _id: typeof stack === 'object' ? stack._id : stack,
            id: typeof stack === 'object' ? stack._id : stack,
            name: typeof stack === 'object' ? stack.name : 'Loading...',
            description: typeof stack === 'object' ? stack.description : ''
          })) || []
        }));
        setRoles(formattedRoles);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast.error('Failed to fetch roles');
    }
  };

  const handleAddTechStack = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newStackName.trim()) {
      toast.error('Please enter a tech stack name');
      return;
    }
    
    if (!newStackDescription.trim()) {
      toast.error('Please enter a description');
      return;
    }
    
    setIsSubmittingStack(true);
    
    try {
      const response = await techStackAPI.create({
        name: newStackName.trim(),
        description: newStackDescription.trim()
      });
      
      if (response.data && response.data.data) {
        toast.success(`Tech stack "${newStackName}" added successfully`);
        
        // Reset form
        setNewStackName('');
        setNewStackDescription('');
        
        // Refresh the tech stacks
        await fetchTechStacks();
        await refreshTechStacks();
      }
    } catch (error: unknown) {
      console.error('Error adding tech stack:', error);
      
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        
        if (axiosError.response?.status === 401) {
          toast.error('Authentication error: Please log in again');
        } else if (axiosError.response?.status === 403) {
          toast.error('You do not have permission to add tech stacks');
        } else if (axiosError.response?.data && typeof axiosError.response.data === 'object') {
          const errorData = axiosError.response.data as { error?: string };
          toast.error(`Failed to add tech stack: ${errorData.error || 'Unknown error'}`);
        } else {
          toast.error('Failed to add tech stack: Server error');
        }
      } else {
        toast.error('Failed to add tech stack');
      }
    } finally {
      setIsSubmittingStack(false);
    }
  };
  
  const handleAddRole = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newRoleName.trim()) {
      toast.error('Please enter a role name');
      return;
    }
    
    if (!newRoleDescription.trim()) {
      toast.error('Please enter a role description');
      return;
    }
    
    setIsSubmittingRole(true);
    
    try {
      const response = await roleAPI.create({
        name: newRoleName.trim(),
        description: newRoleDescription.trim()
      });
      
      if (response.data && response.data.data) {
        toast.success(`Role "${newRoleName}" added successfully`);
        
        // Reset form
        setNewRoleName('');
        setNewRoleDescription('');
        
        // Refresh roles
        await fetchRoles();
      }
    } catch (error) {
      console.error('Error adding role:', error);
      toast.error('Failed to add role');
    } finally {
      setIsSubmittingRole(false);
    }
  };
  
  const handleAddTechStackToRole = async (roleId: string, techStackId: string) => {
    if (!roleId || !techStackId) {
      toast.error('Please select both a role and a tech stack');
      return;
    }
    
    try {
      await roleAPI.addTechStacks(roleId, [techStackId]);
      toast.success('Tech stack added to role');
      await fetchRoles();
      setSelectedTechStackId('');
    } catch (error) {
      console.error('Error adding tech stack to role:', error);
      toast.error('Failed to add tech stack to role');
    }
  };
  
  const handleRemoveTechStackFromRole = async (roleId: string, techStackId: string) => {
    try {
      await roleAPI.removeTechStack(roleId, techStackId);
      toast.success('Tech stack removed from role');
      await fetchRoles();
    } catch (error) {
      console.error('Error removing tech stack from role:', error);
      toast.error('Failed to remove tech stack from role');
    }
  };
  
  const handleDeleteRole = async (roleId: string) => {
    if (!confirm('Are you sure you want to delete this role?')) return;
    
    try {
      await roleAPI.delete(roleId);
      toast.success('Role deleted successfully');
      await fetchRoles();
    } catch (error) {
      console.error('Error deleting role:', error);
      toast.error('Failed to delete role');
    }
  };
  
  const handleDeleteTechStack = async (techStackId: string) => {
    if (!confirm('Are you sure you want to delete this tech stack?')) return;
    
    try {
      await techStackAPI.delete(techStackId);
      toast.success('Tech stack deleted successfully');
      await fetchTechStacks();
      await refreshTechStacks();
    } catch (error) {
      console.error('Error deleting tech stack:', error);
      toast.error('Failed to delete tech stack');
    }
  };

  // Render tech stack form
  const renderAddTechStackForm = () => (
    <form onSubmit={handleAddTechStack} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="stack-name">Tech Stack Name</Label>
        <Input
          id="stack-name"
          placeholder="e.g. React, Python, Java"
          value={newStackName}
          onChange={(e) => setNewStackName(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="stack-description">Description</Label>
        <Textarea
          id="stack-description"
          placeholder="Brief description of the technology stack"
          value={newStackDescription}
          onChange={(e) => setNewStackDescription(e.target.value)}
          required
        />
      </div>
      <Button type="submit" disabled={isSubmittingStack} className="w-full">
        <Plus className="w-4 h-4 mr-2" />
        {isSubmittingStack ? 'Adding...' : 'Add Tech Stack'}
      </Button>
    </form>
  );

  // Render role form
  const renderAddRoleForm = () => (
    <form onSubmit={handleAddRole} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="role-name">Role Name</Label>
        <Input
          id="role-name"
          placeholder="e.g. Frontend Developer, Backend Engineer"
          value={newRoleName}
          onChange={(e) => setNewRoleName(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="role-description">Description</Label>
        <Textarea
          id="role-description"
          placeholder="Brief description of the role"
          value={newRoleDescription}
          onChange={(e) => setNewRoleDescription(e.target.value)}
          required
        />
      </div>
      <Button type="submit" disabled={isSubmittingRole} className="w-full">
        <Plus className="w-4 h-4 mr-2" />
        {isSubmittingRole ? 'Adding...' : 'Add Role'}
      </Button>
    </form>
  );

  // Render tech stack list
  const renderTechStackList = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Existing Tech Stacks</h3>
      {techStacks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tech stacks found. Add your first tech stack above.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {techStacks.map((stack) => (
            <Card key={stack._id} className="p-4 flex flex-col justify-between h-full">
              <div className="flex-1">
                <h4 className="font-medium text-lg mb-1">{stack.name}</h4>
                <p className="text-sm text-muted-foreground mb-4">{stack.description}</p>
              </div>
              <div className="flex gap-2 mt-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingStack(stack);
                    setEditStackName(stack.name);
                    setEditStackDescription(stack.description);
                    setShowEditDialog(true);
                  }}
                >
                  <Edit className="h-4 w-4 mr-1" /> Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteTechStack(stack._id)}
                >
                  <Trash className="h-4 w-4 mr-1" /> Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      {/* Edit Tech Stack Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Tech Stack</DialogTitle>
            <DialogDescription>Update the name and description of the tech stack.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-stack-name">Tech Stack Name</Label>
              <Input
                id="edit-stack-name"
                value={editStackName}
                onChange={(e) => setEditStackName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-stack-description">Description</Label>
              <Textarea
                id="edit-stack-description"
                value={editStackDescription}
                onChange={(e) => setEditStackDescription(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!editingStack) return;
                try {
                  await techStackAPI.update(editingStack._id, {
                    name: editStackName,
                    description: editStackDescription
                  });
                  toast.success('Tech stack updated successfully');
                  setShowEditDialog(false);
                  await fetchTechStacks();
                  await refreshTechStacks();
                } catch (error) {
                  console.error('Error updating tech stack:', error);
                  toast.error('Failed to update tech stack');
                }
              }}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  // Render role list with tech stacks
  const renderRoleList = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Existing Roles</h3>
      {roles.length === 0 ? (
        <p className="text-sm text-muted-foreground">No roles found. Add your first role above.</p>
      ) : (
        <div className="space-y-4">
          {roles.map((role) => (
            <Card key={role._id} className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium">{role.name}</h4>
                  <p className="text-sm text-muted-foreground">{role.description}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteRole(role._id)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="mt-4">
                <h5 className="text-sm font-medium mb-2">Associated Tech Stacks</h5>
                {role.techStacks && role.techStacks.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {role.techStacks.map((stack) => (
                      <Badge key={stack._id} variant="secondary" className="flex items-center gap-1">
                        {stack.name}
                        <button
                          type="button"
                          className="ml-1 rounded-full hover:bg-muted p-0.5"
                          onClick={() => handleRemoveTechStackFromRole(role._id, stack._id)}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mb-4">No tech stacks associated with this role.</p>
                )}
                
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label htmlFor={`add-stack-${role._id}`} className="text-sm">Add Tech Stack</Label>
                    <Select
                      value={selectedTechStackId}
                      onValueChange={setSelectedTechStackId}
                    >
                      <SelectTrigger id={`add-stack-${role._id}`}>
                        <SelectValue placeholder="Select a tech stack" />
                      </SelectTrigger>
                      <SelectContent>
                        {techStacks
                          .filter(stack => !role.techStacks.some(s => s._id === stack._id))
                          .map(stack => (
                            <SelectItem key={stack._id} value={stack._id}>
                              {stack.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    type="button" 
                    size="sm"
                    onClick={() => handleAddTechStackToRole(role._id, selectedTechStackId)}
                    disabled={!selectedTechStackId}
                  >
                    Add
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  // Main render
  if (!displayFullCard) {
    return renderAddTechStackForm();
  }

  return (
    <Tabs defaultValue="tech-stacks" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="tech-stacks">Tech Stacks</TabsTrigger>
        <TabsTrigger value="roles">Roles</TabsTrigger>
      </TabsList>
      
      <TabsContent value="tech-stacks" className="space-y-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Add New Tech Stack</CardTitle>
            <CardDescription>
              Create a new technology stack that can be assigned to roles and interviews.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderAddTechStackForm()}
          </CardContent>
        </Card>
        
        {renderTechStackList()}
      </TabsContent>
      
      <TabsContent value="roles" className="space-y-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Add New Role</CardTitle>
            <CardDescription>
              Create a new role that can be assigned to candidates during interview scheduling.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderAddRoleForm()}
          </CardContent>
        </Card>
        
        {renderRoleList()}
      </TabsContent>
    </Tabs>
  );
};

export default TechStackManager;