import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { logoutUser } from '../store/slices/authSlice';
import NotificationBell from './NotificationBell';
import NotificationSettings from './NotificationSettings';
import { toast } from 'react-toastify';
import { 
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const Header = ({ darkMode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);

  const handleLogout = async () => {
    try {
      dispatch(logoutUser());
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const dismissAllNotifications = () => {
    toast.dismiss(); // Dismiss all toast notifications
  };

  return (
    <header className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              NewsDesk
            </h1>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {/* Dismiss All Notifications Button */}
            <button 
              onClick={dismissAllNotifications}
              className="p-2 rounded-xl text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all duration-200 hover:scale-105"
              title="Dismiss all notifications"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>


            {/* Notifications */}
            <NotificationBell />

            {/* Settings */}
            <button 
              onClick={() => setSettingsOpen(true)}
              className="p-2 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200 hover:scale-105"
              title="Notification Settings"
            >
              <Cog6ToothIcon className="w-6 h-6" />
            </button>

            {/* User Menu */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setIsOpen(!isOpen)}
                  className="flex items-center space-x-3 p-2 rounded-xl hover:bg-gray-100 transition-all duration-200 group"
                >
                  <UserCircleIcon className="w-8 h-8 text-gray-500 group-hover:text-gray-700" />
                  <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                    {user.username}
                  </span>
                </button>

                {/* Dropdown */}
                {isOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50">
                    <div className="px-4 py-2 text-sm text-gray-500 border-b border-gray-100">
                      {user.email}
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors duration-200 flex items-center space-x-2"
                    >
                      <ArrowRightOnRectangleIcon className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <a
                href="/login"
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 hover:scale-105 font-medium"
              >
                Login
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Notification Settings Dialog */}
      <NotificationSettings 
        open={settingsOpen} 
        onClose={() => setSettingsOpen(false)} 
      />
    </header>
  );
};

export default Header;
