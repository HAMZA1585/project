import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Switch,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Divider,
  Alert
} from '@mui/material';
import { BellIcon, EnvelopeIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline';
import { useSelector, useDispatch } from 'react-redux';
import { updateSettings } from '../store/slices/notificationSlice';

const NotificationSettings = ({ open, onClose }) => {
  const dispatch = useDispatch();
  const { settings } = useSelector(state => state.notifications);
  const [localSettings, setLocalSettings] = useState(settings);
  const [isTesting, setIsTesting] = useState(false);

  const handleSettingChange = (key, value) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    dispatch(updateSettings(localSettings));
    onClose();
  };

  const handleTestNotification = async () => {
    setIsTesting(true);
    
    // Request permission if not granted
    const hasPermission = await requestPermission();
    
    if (hasPermission) {
      // Test push notification
      if (localSettings.pushNotifications) {
        new Notification('Test Notification', {
          body: 'This is a test notification from NewsDesk',
          icon: '/vite.svg'
        });
      }
      
      // Test toast notification
      setTimeout(() => {
        setIsTesting(false);
      }, 2000);
    } else {
      setIsTesting(false);
    }
  };

  const handleReset = () => {
    setLocalSettings(settings);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <div className="flex items-center space-x-3">
          <BellIcon className="w-6 h-6 text-blue-600" />
          <span className="text-xl font-semibold">Notification Settings</span>
        </div>
      </DialogTitle>
      
      <DialogContent dividers>
        <div className="space-y-6">
          {/* Permission Status */}
          <Alert severity="info" className="mb-4">
            Configure your notification preferences to stay updated with breaking news and important alerts.
          </Alert>

          {/* Push Notifications */}
          <Box>
            <Typography variant="h6" gutterBottom className="flex items-center space-x-2">
              <BellIcon className="w-5 h-5" />
              <span>Push Notifications</span>
            </Typography>
            <div className="space-y-4 pl-7">
              <FormControlLabel
                control={
                  <Switch
                    checked={localSettings.pushNotifications}
                    onChange={(e) => handleSettingChange('pushNotifications', e.target.checked)}
                  />
                }
                label="Enable browser push notifications"
              />
              <Button
                variant="outlined"
                size="small"
                onClick={handleTestNotification}
                disabled={isTesting}
                className="ml-4"
              >
                {isTesting ? 'Testing...' : 'Test Notification'}
              </Button>
            </div>
          </Box>

          <Divider />

          {/* Email Notifications */}
          <Box>
            <Typography variant="h6" gutterBottom className="flex items-center space-x-2">
              <EnvelopeIcon className="w-5 h-5" />
              <span>Email Notifications</span>
            </Typography>
            <div className="space-y-4 pl-7">
              <FormControlLabel
                control={
                  <Switch
                    checked={localSettings.emailNotifications}
                    onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)}
                  />
                }
                label="Enable email notifications"
              />
              <TextField
                label="Email Address"
                type="email"
                value={localSettings.email}
                onChange={(e) => handleSettingChange('email', e.target.value)}
                fullWidth
                size="small"
                disabled={!localSettings.emailNotifications}
                placeholder="your@email.com"
              />
            </div>
          </Box>

          <Divider />

          {/* SMS Notifications */}
          <Box>
            <Typography variant="h6" gutterBottom className="flex items-center space-x-2">
              <DevicePhoneMobileIcon className="w-5 h-5" />
              <span>SMS Notifications</span>
            </Typography>
            <div className="space-y-4 pl-7">
              <FormControlLabel
                control={
                  <Switch
                    checked={localSettings.smsNotifications}
                    onChange={(e) => handleSettingChange('smsNotifications', e.target.checked)}
                  />
                }
                label="Enable SMS notifications"
              />
              <TextField
                label="Phone Number"
                type="tel"
                value={localSettings.phone}
                onChange={(e) => handleSettingChange('phone', e.target.value)}
                fullWidth
                size="small"
                disabled={!localSettings.smsNotifications}
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </Box>

          <Divider />

          {/* Notification Types */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Notification Types
            </Typography>
            <div className="space-y-4 pl-7">
              <FormControlLabel
                control={
                  <Switch
                    checked={localSettings.breakingNews}
                    onChange={(e) => handleSettingChange('breakingNews', e.target.checked)}
                  />
                }
                label="Breaking News Alerts"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={localSettings.sentimentSpikes}
                    onChange={(e) => handleSettingChange('sentimentSpikes', e.target.checked)}
                  />
                }
                label="Sentiment Spike Alerts"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={localSettings.criticalEvents}
                    onChange={(e) => handleSettingChange('criticalEvents', e.target.checked)}
                  />
                }
                label="Critical Event Alerts"
              />
            </div>
          </Box>

          <Divider />

          {/* Advanced Settings */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Advanced Settings
            </Typography>
            <div className="space-y-4 pl-7">
              <FormControl fullWidth size="small">
                <InputLabel>Sentiment Threshold</InputLabel>
                <Select
                  value={localSettings.sentimentThreshold}
                  label="Sentiment Threshold"
                  onChange={(e) => handleSettingChange('sentimentThreshold', e.target.value)}
                >
                  <MenuItem value={0.5}>Low (0.5)</MenuItem>
                  <MenuItem value={0.7}>Medium (0.7)</MenuItem>
                  <MenuItem value={0.8}>High (0.8)</MenuItem>
                  <MenuItem value={0.9}>Very High (0.9)</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth size="small">
                <InputLabel>Notification Frequency</InputLabel>
                <Select
                  value={localSettings.frequency}
                  label="Notification Frequency"
                  onChange={(e) => handleSettingChange('frequency', e.target.value)}
                >
                  <MenuItem value="realtime">Real-time</MenuItem>
                  <MenuItem value="hourly">Hourly Digest</MenuItem>
                  <MenuItem value="daily">Daily Digest</MenuItem>
                </Select>
              </FormControl>
            </div>
          </Box>
        </div>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleReset} color="secondary">
          Reset
        </Button>
        <Button onClick={onClose} color="primary">
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          Save Settings
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NotificationSettings;
