import React from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface SettingsPanelProps {
  currentEndpoint: string;
  setCurrentEndpoint: (endpoint: string) => void;
  defaultEndpoint: string;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  currentEndpoint,
  setCurrentEndpoint,
  defaultEndpoint
}) => {
  return (
    <Card className="m-4 p-4 animate-slide-up">
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">
          API Endpoint:
        </label>
        <Input
          value={currentEndpoint}
          onChange={(e) => setCurrentEndpoint(e.target.value)}
          placeholder="Enter your AI agent endpoint URL"
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Configure the endpoint where your AI agent is hosted. Default: {defaultEndpoint}
        </p>
      </div>
    </Card>
  );
};

export default SettingsPanel;