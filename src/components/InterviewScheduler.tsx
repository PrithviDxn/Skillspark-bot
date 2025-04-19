
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

type ScheduleFormData = {
  candidateEmail: string;
  techStackId: string;
  datetime: {
    date: Date;
    time: string;
  };
};

const InterviewScheduler = () => {
  const { availableTechStacks } = useInterview();
  const form = useForm<ScheduleFormData>();

  const handleSubmit = (data: ScheduleFormData) => {
    // Combine date and time into a single Date object
    const { date } = data.datetime;
    const [hours, minutes] = data.datetime.time.split(':');
    
    const combinedDateTime = new Date(date);
    combinedDateTime.setHours(parseInt(hours), parseInt(minutes));

    const scheduleData = {
      ...data,
      datetime: combinedDateTime,
    };

    console.log('Schedule interview:', scheduleData);
    toast.success('Interview scheduled successfully (demo)');
    form.reset();
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
              name="candidateEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Candidate Email</FormLabel>
                  <FormControl>
                    <Input placeholder="candidate@example.com" {...field} />
                  </FormControl>
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
                          selected={field.value?.date}
                          onSelect={(date) => field.onChange({ ...field.value, date })}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className="pointer-events-auto"
                        />
                        <div className="mt-4">
                          <FormLabel>Time</FormLabel>
                          <Input
                            type="time"
                            value={field.value?.time || ""}
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
