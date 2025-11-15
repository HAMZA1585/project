import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import api from '../Services/api';
import toast from 'react-hot-toast';

const Admin = () => {
  const user = useSelector(state => state.auth.user);
  const queryClient = useQueryClient();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user'
  });

  // Fetch users with React Query
  const { 
    data: usersData, 
    isLoading: loading, 
    error 
  } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get('/api/v1/admin/users');
      return response.data;
    },
    enabled: !!user && user.role === 'admin',
  });

  const users = usersData?.users || [];

  // Fetch worker status with React Query (refetch every 5 seconds)
  const { data: workerData } = useQuery({
    queryKey: ['workerStatus'],
    queryFn: async () => {
      const response = await api.get('/api/v1/admin/worker-status');
      return response.data;
    },
    refetchInterval: 5000, // Refetch every 5 seconds
    enabled: !!user && user.role === 'admin',
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData) => {
      const response = await api.post('/api/v1/admin/users', userData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      toast.success('User created successfully');
      setShowCreateModal(false);
      setFormData({ username: '', email: '', password: '', role: 'user' });
    },
    onError: (error) => {
      console.error('Error creating user:', error);
      toast.error(error.response?.data?.error || 'Failed to create user');
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, userData }) => {
      const response = await api.put(`/api/v1/admin/users/${userId}`, userData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      toast.success('User updated successfully');
      setShowEditModal(false);
      setEditingUser(null);
      setFormData({ username: '', email: '', password: '', role: 'user' });
    },
    onError: (error) => {
      console.error('Error updating user:', error);
      toast.error(error.response?.data?.error || 'Failed to update user');
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId) => {
      const response = await api.delete(`/api/v1/admin/users/${userId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      toast.success('User deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting user:', error);
      toast.error(error.response?.data?.error || 'Failed to delete user');
    },
  });

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Create new user
  const handleCreateUser = async (e) => {
    e.preventDefault();
    createUserMutation.mutate(formData);
  };

  // Update user
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    const updateData = { ...formData };
    if (!updateData.password) {
      delete updateData.password; // Don't update password if empty
    }
    
    updateUserMutation.mutate({ 
      userId: editingUser.id, 
      userData: updateData 
    });
  };

  // Delete user
  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      deleteUserMutation.mutate(userId);
    }
  };

  // Open edit modal
  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      role: user.role
    });
    setShowEditModal(true);
  };

  // Close modals
  const closeModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setEditingUser(null);
    setFormData({ username: '', email: '', password: '', role: 'user' });
  };

  // Handle React Query errors
  React.useEffect(() => {
    if (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users data');
    }
  }, [error]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-whitebg-gray-800 shadow rounded-lg p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900text-white">Admin Panel</h1>
            <p className="text-gray-600text-gray-400 mt-2">Manage users and system settings</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add User
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-whitebg-gray-800 shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100bg-blue-900">
              <svg className="w-6 h-6 text-blue-600text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600text-gray-400">Total Users</p>
              <p className="text-2xl font-semibold text-gray-900text-white">{users.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-whitebg-gray-800 shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100bg-green-900">
              <svg className="w-6 h-6 text-green-600text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600text-gray-400">Regular Users</p>
              <p className="text-2xl font-semibold text-gray-900text-white">
                {users.filter(u => u.role === 'user').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-whitebg-gray-800 shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100bg-purple-900">
              <svg className="w-6 h-6 text-purple-600text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600text-gray-400">Admin Users</p>
              <p className="text-2xl font-semibold text-gray-900text-white">
                {users.filter(u => u.role === 'admin').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Worker Status Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div className="bg-whitebg-gray-800 shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200border-gray-700">
            <h3 className="text-lg font-medium text-gray-900text-white">Active Queues</h3>
          </div>
          <div className="divide-y divide-gray-200divide-gray-700">
            {workerData?.queues && workerData.queues.length > 0 ? (
              workerData.queues.map(queue => (
                <div key={queue.name} className="px-6 py-4 grid grid-cols-3 gap-4">
                  <span className="font-medium text-gray-800text-gray-200 capitalize">{queue.name}</span>
                  <span className="text-sm text-gray-600text-gray-400">
                    Pending: <span className="font-bold text-gray-900text-white">{queue.job_count}</span>
                  </span>
                  <span className={`text-sm ${queue.failed_jobs > 0 ? 'text-red-500' : 'text-gray-600text-gray-400'}`}>
                    Failed: <span className="font-bold">{queue.failed_jobs}</span>
                  </span>
                </div>
              ))
            ) : (
              <p className="px-6 py-4 text-gray-500text-gray-400">No queue data available.</p>
            )}
          </div>
        </div>
        <div className="bg-whitebg-gray-800 shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200border-gray-700">
            <h3 className="text-lg font-medium text-gray-900text-white">Active Workers</h3>
          </div>
          <div className="divide-y divide-gray-200divide-gray-700">
            {workerData?.workers && workerData.workers.length > 0 ? (
              workerData.workers.map(worker => (
                <div key={worker.name} className="px-6 py-4">
                  <p className="font-medium text-gray-800text-gray-200">{worker.name}</p>
                  <p className="text-sm text-gray-600text-gray-400">
                    State: <span className={worker.state === 'idle' ? 'text-green-500 font-semibold' : 'text-yellow-500 font-semibold'}>{worker.state}</span>
                  </p>
                  <p className="text-sm text-gray-600text-gray-400">Listening to: {worker.queues}</p>
                </div>
              ))
            ) : (
              <p className="px-6 py-4 text-gray-500text-gray-400">No active workers found.</p>
            )}
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-whitebg-gray-800 shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200border-gray-700">
          <h3 className="text-lg font-medium text-gray-900text-white">Users Management</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200divide-gray-700">
            <thead className="bg-gray-50bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500text-gray-300 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500text-gray-300 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500text-gray-300 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-whitebg-gray-800 divide-y divide-gray-200divide-gray-700">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-indigo-100bg-indigo-900 flex items-center justify-center">
                          <span className="text-sm font-medium text-indigo-600text-indigo-400">
                            {user.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900text-white">
                          {user.username}
                        </div>
                        <div className="text-sm text-gray-500text-gray-400">
                          ID: {user.id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900text-white">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.role === 'admin' 
                        ? 'bg-purple-100 text-purple-800bg-purple-900text-purple-200' 
                        : 'bg-green-100 text-green-800bg-green-900text-green-200'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openEditModal(user)}
                        className="text-indigo-600 hover:text-indigo-900text-indigo-400hover:text-indigo-300"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-red-600 hover:text-red-900text-red-400hover:text-red-300"
                        disabled={user.id === parseInt(localStorage.getItem('user_id'))}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-whitebg-gray-800">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900text-white mb-4">Create New User</h3>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700text-gray-300">Username</label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500bg-gray-700text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700text-gray-300">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500bg-gray-700text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700text-gray-300">Password</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500bg-gray-700text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700text-gray-300">Role</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500bg-gray-700text-white"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModals}
                    className="px-4 py-2 text-sm font-medium text-gray-700text-gray-300 bg-gray-100bg-gray-600 hover:bg-gray-200hover:bg-gray-500 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
                  >
                    Create User
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-whitebg-gray-800">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900text-white mb-4">Edit User</h3>
              <form onSubmit={handleUpdateUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700text-gray-300">Username</label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500bg-gray-700text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700text-gray-300">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500bg-gray-700text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700text-gray-300">Password (leave empty to keep current)</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500bg-gray-700text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700text-gray-300">Role</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500bg-gray-700text-white"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModals}
                    className="px-4 py-2 text-sm font-medium text-gray-700text-gray-300 bg-gray-100bg-gray-600 hover:bg-gray-200hover:bg-gray-500 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
                  >
                    Update User
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
