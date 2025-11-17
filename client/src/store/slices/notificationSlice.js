import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  notifications: [],
  unreadCount: 0,
  settings: {
    enableBreakingNews: true,
    enableSentimentAlerts: true,
    enableCriticalEvents: true,
    soundEnabled: true,
  },
};

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification: (state, action) => {
      const notification = {
        id:
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        timestamp: new Date().toISOString(),
        read: false,
        ...action.payload,
      };
      state.notifications.unshift(notification);
      state.unreadCount += 1;
    },
    markAsRead: (state, action) => {
      const notification = state.notifications.find(n => n.id === action.payload);
      if (notification && !notification.read) {
        notification.read = true;
        state.unreadCount -= 1;
      }
    },
    markAllAsRead: (state) => {
      state.notifications.forEach(notification => {
        notification.read = true;
      });
      state.unreadCount = 0;
    },
    clearNotifications: (state) => {
      state.notifications = [];
      state.unreadCount = 0;
    },
    updateSettings: (state, action) => {
      state.settings = { ...state.settings, ...action.payload };
    },
    checkSentimentSpike: (state, action) => {
      const { current, previous, threshold } = action.payload;
      const spike = Math.abs(current - previous);
      
      if (spike >= threshold) {
        const direction = current > previous ? 'positive' : 'negative';
        state.notifications.unshift({
          id:
            typeof crypto !== 'undefined' && crypto.randomUUID
              ? crypto.randomUUID()
              : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          type: 'sentiment_spike',
          title: `Sentiment ${direction} spike detected`,
          message: `Sentiment changed by ${(spike * 100).toFixed(1)}%`,
          timestamp: new Date().toISOString(),
          read: false,
        });
        state.unreadCount += 1;
      }
    },
    checkBreakingNews: (state, action) => {
      const article = action.payload;
      const keywords = ['breaking', 'urgent', 'emergency', 'alert', 'crisis'];
      const isBreaking = keywords.some(keyword => 
        article.title?.toLowerCase().includes(keyword)
      );
      
      if (isBreaking) {
        state.notifications.unshift({
          id:
            typeof crypto !== 'undefined' && crypto.randomUUID
              ? crypto.randomUUID()
              : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          type: 'breaking_news',
          title: 'Breaking News Alert',
          message: article.title,
          timestamp: new Date().toISOString(),
          read: false,
        });
        state.unreadCount += 1;
      }
    },
    checkCriticalEvents: (state, action) => {
      const article = action.payload;
      const criticalKeywords = ['earthquake', 'flood', 'fire', 'attack', 'crash', 'disaster'];
      const isCritical = criticalKeywords.some(keyword => 
        article.title?.toLowerCase().includes(keyword) || 
        article.content?.toLowerCase().includes(keyword)
      );
      
      if (isCritical) {
        state.notifications.unshift({
          id:
            typeof crypto !== 'undefined' && crypto.randomUUID
              ? crypto.randomUUID()
              : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          type: 'critical_event',
          title: 'Critical Event Detected',
          message: article.title,
          timestamp: new Date().toISOString(),
          read: false,
        });
        state.unreadCount += 1;
      }
    },
  },
});

export const {
  addNotification,
  markAsRead,
  markAllAsRead,
  clearNotifications,
  updateSettings,
  checkSentimentSpike,
  checkBreakingNews,
  checkCriticalEvents,
} = notificationSlice.actions;

export default notificationSlice.reducer;
