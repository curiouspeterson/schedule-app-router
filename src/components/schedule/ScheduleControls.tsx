// Schedule controls component - Control panel for schedule management actions

import { Button } from '@/components/ui/button';
import { useMutation } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

export default function ScheduleControls() {
  const [isGenerating, setIsGenerating] = useState(false);

  const { mutate: generateSchedule } = useMutation({
    mutationFn: async () => {
      setIsGenerating(true);
      try {
        const response = await fetch('/api/schedule/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to generate schedule');
        }

        return response.json();
      } finally {
        setIsGenerating(false);
      }
    },
  });

  const handleGenerateSchedule = () => {
    if (window.confirm('Are you sure you want to generate a new schedule? This may overwrite existing assignments.')) {
      generateSchedule();
    }
  };

  const handlePublishSchedule = () => {
    // TODO: Implement publish functionality
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="space-x-4">
          <Button
            variant="default"
            onClick={handleGenerateSchedule}
            disabled={isGenerating}
          >
            {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isGenerating ? 'Generating...' : 'Generate Schedule'}
          </Button>
          <Button
            variant="outline"
            onClick={handlePublishSchedule}
          >
            Publish Schedule
          </Button>
        </div>
        <div className="text-sm text-gray-500">
          Last generated: Never
        </div>
      </div>
    </div>
  );
} 