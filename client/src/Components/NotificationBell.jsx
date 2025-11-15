import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BellIcon, XMarkIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { useSelector, useDispatch } from 'react-redux';
import { markAsRead, markAllAsRead, clearNotifications } from '../store/slices/notificationSlice';

const NotificationBell = () => {
  const dispatch = useDispatch();
  const { notifications, unreadCount } = useSelector(state => state.notifications);

  const [isOpen, setIsOpen] = useState(false);

  const formatTime = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'breaking':
        return '🔴';
      case 'sentiment':
        return '📊';
      case 'critical':
        return '⚠️';
      default:
        return '📢';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'breaking':
        return 'border-red-200 bg-red-50bg-red-900/20border-red-800';
      case 'sentiment':
        return 'border-yellow-200 bg-yellow-50bg-yellow-900/20border-yellow-800';
      case 'critical':
        return 'border-orange-200 bg-orange-50bg-orange-900/20border-orange-800';
      default:
        return 'border-blue-200 bg-blue-50bg-blue-900/20border-blue-800';
    }
  };

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100hover:bg-gray-700text-gray-300hover:text-gray-100 transition-all duration-200 hover:scale-105"
        title="Notifications"
      >
        <BellIcon className="w-6 h-6" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Notification Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-96 bg-whitebg-gray-800 rounded-xl shadow-lg border border-gray-200border-gray-700 z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900text-white">
                Notifications
              </h3>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={() => dispatch(markAllAsRead())}
                    className="text-sm text-blue-600text-blue-400 hover:underline"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg hover:bg-gray-100hover:bg-gray-700"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500text-gray-400">
                  <BellIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200divide-gray-700">
                  {notifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className={`p-4 hover:bg-gray-50hover:bg-gray-700/50 transition-colors duration-200 ${
                        !notification.read ? 'bg-blue-50/50bg-blue-900/10' : ''
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 text-2xl">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className={`text-sm font-medium ${
                              !notification.read 
                                ? 'text-gray-900text-white' 
                                : 'text-gray-700text-gray-300'
                            }`}>
                              {notification.title}
                            </h4>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-500text-gray-400">
                                {formatTime(notification.timestamp)}
                              </span>
                              <button
                                onClick={() => dispatch(markAsRead(notification.id))}
                                className="p-1 rounded hover:bg-gray-200hover:bg-gray-600"
                              >
                                <XMarkIcon className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600text-gray-400 mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          {notification.actionUrl && (
                            <a
                              href={notification.actionUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600text-blue-400 hover:underline mt-1 inline-block"
                            >
                              View Details →
                            </a>
                          )}
                        </div>
                        {!notification.read && (
                          <div className="flex-shrink-0">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-4 border-t border-gray-200border-gray-700">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => dispatch(clearNotifications())}
                    className="text-sm text-red-600text-red-400 hover:underline"
                  >
                    Clear all
                  </button>
                  <button className="flex items-center space-x-1 text-sm text-gray-600text-gray-400 hover:text-gray-900hover:text-white">
                    <Cog6ToothIcon className="w-4 h-4" />
                    <span>Settings</span>
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
