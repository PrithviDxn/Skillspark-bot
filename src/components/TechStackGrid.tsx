import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Edit, Trash } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { techStackAPI } from '@/api';
import { useInterview } from '@/context/InterviewContext';

type TechStack = {
  _id: string;
  id: string;
  name: string;
  description: string;
};

const TechStackGrid: React.FC = () => {
  const [techStacks, setTechStacks] = useState<TechStack[]>([]);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingStack, setEditingStack] = useState<TechStack | null>(null);
  const [editStackName, setEditStackName] = useState('');
  const [editStackDescription, setEditStackDescription] = useState('');
  const { refreshTechStacks } = useInterview();

  useEffect(() => {
    fetchTechStacks();
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

  const handleDeleteTechStack = async (techStackId: string) => {
    if (!window.confirm('Are you sure you want to delete this tech stack?')) return;
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Existing Tech Stacks</CardTitle>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  );
};

export default TechStackGrid; 