
import React, { useState, useEffect } from 'react';
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarClock, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useInterview } from '@/context/InterviewContext';
import { interviewAPI, userAPI, roleAPI, emailAPI } from '@/api/index';
import { Badge } from '@/components/ui/badge';

type ScheduleFormData = {
  candidateId: string; // ObjectId of the candidate
  roleId: string; // ObjectId of the role
  techStackIds: string[]; // Array of tech stack ObjectIds
  datetime: {
    date: string | Date;
    time: string;
  };
};

type Role = {
  id: string;
  name: string;
  description: string;
  techStacks: TechStack[];
};

type TechStack = {
  id: string;
  name: string;
  description: string;
};

const InterviewScheduler = () => {
  const { availableTechStacks, refreshTechStacks } = useInterview();
  const { refreshInterview } = useInterview();
  const { interviews } = useInterview();
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedTechStacks, setSelectedTechStacks] = useState<string[]>([]);
  const [availableTechStacksForRole, setAvailableTechStacksForRole] = useState<TechStack[]>([]);
  
  const form = useForm<ScheduleFormData>({
    defaultValues: {
      candidateId: '',
      roleId: '',
      techStackIds: [],
      datetime: {
        date: undefined,
        time: ''
      }
    }
  });

  // Candidate state
  const [candidates, setCandidates] = useState<any[]>([]);
  
  // Fetch candidates, roles, and tech stacks on component mount
  useEffect(() => {
    fetchCandidates();
    fetchRoles();
    // Only refresh tech stacks once on mount
    refreshTechStacks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);  // Empty dependency array to run only once
  
  // Initialize available tech stacks when they change
  useEffect(() => {
    setAvailableTechStacksForRole(availableTechStacks);
  }, [availableTechStacks]);
  
  const fetchCandidates = async () => {
    try {
      const res = await userAPI.getAll();
      setCandidates(res.data.data || []);
    } catch (error) {
      console.error('Error fetching candidates:', error);
      toast.error('Failed to fetch candidates');
    }
  };
  
  const fetchRoles = async () => {
    try {
      const res = await roleAPI.getAll();
      if (res.data && res.data.data) {
        const rolesData = res.data.data.map((role: any) => ({
          id: role._id,
          name: role.name,
          description: role.description,
          techStacks: role.techStacks?.map((stack: any) => ({
            id: typeof stack === 'object' ? stack._id : stack,
            name: typeof stack === 'object' ? stack.name : 'Loading...',
            description: typeof stack === 'object' ? stack.description : ''
          })) || []
        }));
        setRoles(rolesData);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast.error('Failed to fetch roles');
    }
  };
  
  // Update role selection without filtering tech stacks
  const handleRoleChange = (roleId: string) => {
    form.setValue('roleId', roleId);
    // Don't reset tech stack selection when role changes
    // form.setValue('techStackIds', []);
    // setSelectedTechStacks([]);
    
    // Show all available tech stacks regardless of role
    setAvailableTechStacksForRole(availableTechStacks);
  };
  
  // Handle tech stack selection/deselection
  const handleTechStackToggle = (techStackId: string) => {
    const updatedSelection = selectedTechStacks.includes(techStackId)
      ? selectedTechStacks.filter(id => id !== techStackId)
      : [...selectedTechStacks, techStackId];
    
    setSelectedTechStacks(updatedSelection);
    form.setValue('techStackIds', updatedSelection);
  };


  const handleSubmit = async (data: ScheduleFormData) => {
    try {
      // Validate that at least one tech stack is selected
      if (!data.techStackIds || data.techStackIds.length === 0) {
        toast.error('Please select at least one tech stack');
        return;
      }

      // Debug: log the date and time being submitted
      console.log('Submitting datetime:', data.datetime);
      // Combine date and time into a single ISO string
      const { date, time } = data.datetime;
      let scheduledDate: string;
      if (date && time) {
        // date is a Date object or string
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        const [hours, minutes] = time.split(':');
        dateObj.setHours(Number(hours));
        dateObj.setMinutes(Number(minutes));
        dateObj.setSeconds(0);
        dateObj.setMilliseconds(0);
        scheduledDate = dateObj.toISOString();
      } else {
        scheduledDate = typeof date === 'string' ? date : date.toISOString();
      }

      // Prepare payload for API
      const payload = {
        candidate: data.candidateId,
        role: data.roleId,
        techStacks: data.techStackIds, // Send array of tech stack IDs
        techStack: data.techStackIds[0], // For backward compatibility - required field
        scheduledDate, // Send as full ISO string
        scheduledTime: time, // Send as HH:mm string
        duration: 30 // Optional, default to 30 minutes
      };
      
      // Debug: log payload
      console.log('Interview creation payload:', payload);

      // Call the backend API to create the interview
      const response = await interviewAPI.create(payload);
      if (response.data && response.data.success && response.data.data) {
        const interviewId = response.data.data._id;
        toast.success('Interview scheduled successfully!');
        
        // Send email invitation
        try {
          toast.info('Sending interview invitation email...');
          const emailResponse = await emailAPI.sendInvitation(interviewId);
          
          if (emailResponse.data?.success) {
            toast.success('Interview invitation email sent!');
          } else {
            toast.error('Failed to send invitation email. You can send it later from the interview details page.');
          }
        } catch (emailError) {
          console.error('Error sending invitation email:', emailError);
          toast.error('Failed to send invitation email. You can send it later from the interview details page.');
        }
        
        form.reset();
        setSelectedTechStacks([]);
        setAvailableTechStacksForRole([]);
        // Refresh the interview list so the new interview appears
        if (typeof refreshTechStacks === 'function') {
          await refreshTechStacks(); // refreshes interviews as well on mount
        }
      } else {
        toast.error('Failed to schedule interview.');
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error scheduling interview:', error);
      toast.error('Failed to schedule interview.');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Schedule Interview</CardTitle>
        <CardDescription>Schedule an interview for a candidate</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="candidateId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Candidate</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a candidate" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {candidates.map(candidate => (
                        <SelectItem key={candidate._id} value={candidate._id}>
                          {candidate.name} ({candidate.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="roleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={(value) => {
                    field.onChange(value);
                    handleRoleChange(value);
                  }} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            
            <div>
              <FormLabel>Tech Stacks</FormLabel>
              <div className="mt-2 mb-4">
                {selectedTechStacks.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedTechStacks.map(stackId => {
                      const stack = availableTechStacksForRole.find(s => s.id === stackId);
                      return (
                        <Badge key={stackId} variant="secondary" className="flex items-center gap-1">
                          {stack?.name || 'Unknown'}
                          <button
                            type="button"
                            className="ml-1 rounded-full hover:bg-muted p-0.5"
                            onClick={() => handleTechStackToggle(stackId)}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No tech stacks selected. Please select at least one tech stack.</p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-2 mt-2">
                {availableTechStacksForRole.map(stack => (
                  <Button
                    key={stack.id}
                    type="button"
                    variant={selectedTechStacks.includes(stack.id) ? "default" : "outline"}
                    size="sm"
                    className="justify-start"
                    onClick={() => handleTechStackToggle(stack.id)}
                  >
                    {stack.name}
                  </Button>
                ))}
              </div>
              {availableTechStacksForRole.length === 0 && (
                <p className="text-sm text-muted-foreground mt-2">No tech stacks available. Please add tech stacks first.</p>
              )}
              {selectedTechStacks.length === 0 && availableTechStacksForRole.length > 0 && (
                <p className="text-sm text-muted-foreground mt-2">Please select at least one tech stack for the interview.</p>
              )}
            </div>

            <FormField
              control={form.control}
              name="datetime"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date & Time</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value?.date ? (
                            <span>
                              {format(field.value.date, "PPP")} at {field.value.time || "Select time"}
                            </span>
                          ) : (
                            <span>Pick date and time</span>
                          )}
                          <CalendarClock className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-4" align="start">
                      <div className="space-y-4">
                        <Calendar
                          mode="single"
                          selected={typeof field.value?.date === 'string' ? new Date(field.value.date) : field.value?.date}
                          onSelect={(date) => field.onChange({ ...field.value, date })}
                          disabled={(date) => {
                            const today = new Date();
                            today.setHours(0,0,0,0);
                            return date < today;
                          }}
                          initialFocus
                          className="pointer-events-auto"
                        />
                        <div className="mt-4">
                          <FormLabel>Time</FormLabel>
                          <Input
                            type="time"
                            value={field.value?.time || ""}
                            min={(() => {
                              const selectedDate = typeof field.value?.date === 'string' ? new Date(field.value.date) : field.value?.date;
                              const now = new Date();
                              if (
                                selectedDate &&
                                selectedDate.getFullYear() === now.getFullYear() &&
                                selectedDate.getMonth() === now.getMonth() &&
                                selectedDate.getDate() === now.getDate()
                              ) {
                                // Only allow times after the current time if today is selected
                                return now.toTimeString().slice(0,5);
                              }
                              return undefined;
                            })()}
                            onChange={(e) => field.onChange({ ...field.value, time: e.target.value })}
                            className="mt-2"
                          />
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full">Schedule Interview</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default InterviewScheduler;
