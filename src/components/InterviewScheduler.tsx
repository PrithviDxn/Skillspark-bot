
import React from 'react';
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarClock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useInterview } from '@/context/InterviewContext';
import { interviewAPI, userAPI } from '@/api';

type ScheduleFormData = {
  candidateId: string; // ObjectId of the candidate
  techStackId: string; // ObjectId of the tech stack
  datetime: {
    date: string | Date;
    time: string;
  };
};

const InterviewScheduler = () => {
  const { availableTechStacks, refreshTechStacks } = useInterview();
  const { refreshInterview } = useInterview();
  const { interviews } = useInterview();
  const form = useForm<ScheduleFormData>({
    defaultValues: {
      candidateId: '',
      techStackId: '',
      datetime: {
        date: undefined,
        time: ''
      }
    }
  });

  // Candidate state
  const [candidates, setCandidates] = React.useState<any[]>([]);
  React.useEffect(() => {
    userAPI.getAll().then(res => {
      setCandidates(res.data.data || []);
    });
  }, []);


  const handleSubmit = async (data: ScheduleFormData) => {
    try {
      // Debug: log the date and time being submitted
      console.log('Submitting datetime:', data.datetime);
      // Combine date and time into a single ISO string for backend
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
        techStack: data.techStackId,
        scheduledDate, // Send as full ISO string
        duration: 30 // Optional, default to 30 minutes
      };

      // Call the backend API to create the interview
      const response = await interviewAPI.create(payload);
      if (response.data && response.data.success && response.data.data) {
        toast.success('Interview scheduled successfully!');
        form.reset();
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
              name="techStackId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tech Stack</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a tech stack" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableTechStacks.map((stack) => (
                        <SelectItem key={stack.id} value={stack.id}>
                          {stack.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

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
