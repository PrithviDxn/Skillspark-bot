import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Mail } from 'lucide-react';
import { emailAPI } from '@/api/index';

interface SendInvitationButtonProps {
  interviewId: string;
  disabled?: boolean;
  onSuccess?: () => void;
}

const SendInvitationButton: React.FC<SendInvitationButtonProps> = ({
  interviewId,
  disabled = false,
  onSuccess
}) => {
  const [isSending, setIsSending] = useState(false);

  const handleSendInvitation = async () => {
    try {
      setIsSending(true);
      toast.info('Sending interview invitation...');
      
      const response = await emailAPI.sendInvitation(interviewId);
      
      if (response.data?.success) {
        toast.success('Interview invitation sent successfully!');
        if (onSuccess) {
          onSuccess();
        }
      } else {
        toast.error('Failed to send invitation');
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error('Failed to send invitation. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Button
      onClick={handleSendInvitation}
      disabled={disabled || isSending}
      variant="outline"
      className="flex items-center gap-2"
    >
      <Mail size={16} />
      {isSending ? 'Sending...' : 'Send Invitation'}
    </Button>
  );
};

export default SendInvitationButton;
