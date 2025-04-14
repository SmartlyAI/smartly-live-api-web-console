import React from 'react';
import { useLiveAPIContext } from '../../contexts/LiveAPIContext';
import Select from 'react-select';
import './bot-settings.scss';

const voiceOptions = [
  { value: 'Charon', label: 'Charon' },
  { value: 'Puck', label: 'Puck' },
  { value: 'Kore', label: 'Kore' },
  { value: 'Fenrir', label: 'Fenrir' },
  { value: 'Aoede', label: 'Aoede' }
];

const languageOptions = [
  { value: 'fr-FR', label: 'French' },
  { value: 'en-US', label: 'English' }
];

const temperatureOptions = [
  { value: 0, label: "Deterministic (0)" },
  { value: 0.1, label: "Very Low (0.1)" },
  { value: 0.2, label: "Low (0.2)" },
  { value: 0.5, label: "Medium (0.5)" },
  { value: 0.8, label: "High (0.8)" },
  { value: 1, label: "Creative (1)" }
];

export default function BotSettings() {
  const { config, setConfig } = useLiveAPIContext();

  if (!config?.generationConfig?.speechConfig) {
    return null;
  }

  // Type assertion since we've checked for these values
  const generationConfig = config.generationConfig!;
  const speechConfig = generationConfig.speechConfig!;
  const voiceConfig = speechConfig.voiceConfig!;
  const prebuiltVoiceConfig = voiceConfig.prebuiltVoiceConfig!;

  const handleVoiceChange = (selectedOption: any) => {
    if (!config?.generationConfig) return;
    
    setConfig({
      ...config,
      generationConfig: {
        ...config.generationConfig,
        speechConfig: {
          ...config.generationConfig.speechConfig,
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: selectedOption.value
            }
          }
        }
      }
    });
  };

  const handleLanguageChange = (selectedOption: any) => {
    if (!config?.generationConfig) return;
    
    setConfig({
      ...config,
      generationConfig: {
        ...config.generationConfig,
        speechConfig: {
          ...config.generationConfig.speechConfig,
          languageCode: selectedOption.value
        }
      }
    });
  };

  const handleTemperatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!config?.generationConfig) return;
    
    setConfig({
      ...config,
      generationConfig: {
        ...config.generationConfig,
        temperature: parseFloat(e.target.value)
      }
    });
  };

  return (
    <div className="bot-settings">
      <h3>Bot Settings</h3>
      <div className="setting-group">
        <label>Voice</label>
        <Select
          options={voiceOptions}
          value={voiceOptions.find(option => 
            option.value === prebuiltVoiceConfig.voiceName
          )}
          onChange={handleVoiceChange}
          className="select"
        />
      </div>
      <div className="setting-group">
        <label>Language</label>
        <Select
          options={languageOptions}
          value={languageOptions.find(option => 
            option.value === speechConfig.languageCode
          )}
          onChange={handleLanguageChange}
          className="select"
        />
      </div>
      <div className="setting-group">
        <label>Temperature: {generationConfig.temperature}</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={generationConfig.temperature}
          onChange={handleTemperatureChange}
        />
      </div>
    </div>
  );
} 