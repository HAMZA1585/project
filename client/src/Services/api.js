import axios from "axios";
import { logout } from "./auth";
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // This is the magic line - sends cookies with every request
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    // No need to manually add tokens - cookies are sent automatically with withCredentials: true
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const url = originalRequest.url;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !url.endsWith('/auth/login') &&
      !url.endsWith('/auth/refresh') &&
      !url.endsWith('/auth/logout')
    ) {
      originalRequest._retry = true;
      try {
        // Try to refresh the token using cookies
        await api.post('/api/v1/auth/refresh');
        // If refresh succeeds, retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        // If refresh fails, redirect to login
        logout();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const fetchNews = async () => {
    try {
        const response = await api.get('/api/v1/news');
        console.log("fetchNews response: ", response);
        console.log("fetchNews response: ", response.data);

        return response.data || { articles: [], trends: [] };
    } catch (error) {
        console.error("Error fetching news: ", error);
        toast.error(error.response?.data?.error || 'Failed to fetch news');
        throw error;
    }
};

export const fetchSentiment = async () => {
    try {
        const response = await api.get('/api/v1/sentiment');
        console.log("fetchSentiment response: ", response);

        return response.data;
    } catch (error) {
        console.error("Error fetching sentiment: ", error);
        toast.error(error.response?.data?.error || 'Failed to fetch sentiment data');
        throw error;
    }
};

export const fetchTrends = async () => {
    try {
        const response = await api.get('/api/v1/trends/generate');
        console.log("fetchTrends response: ", response);
        return response.data;
    } catch (error) {
        console.error("Error fetching trends: ", error);
        toast.error(error.response?.data?.error || 'Failed to fetch trends');
        throw error;
    }
};

export const analyzeSentiment = async (text) => {
    try {
        const response = await api.post('/api/v1/sentiment', { text });
        return response.data;
    } catch (error) {
        console.error("Error analyzing sentiment: ", error);
        toast.error(error.response?.data?.error || 'Failed to analyze sentiment');
        throw error;
    }
};

export const generateReport = async (reportData) => {
    try {
        const response = await api.post('/api/v1/report/generate', reportData);
        return response.data;
    } catch (error) {
        console.error("Error generating report: ", error);
        toast.error(error.response?.data?.error || 'Failed to generate report');
        throw error;
    }
};

export const fetchAllUsers = async () => {
    try {
        const response = await api.get('/api/v1/admin/users');
        return response.data;
    } catch (error) {
        console.error("Error fetching users: ", error);
        toast.error(error.response?.data?.error || 'Failed to fetch users');
        throw error;
    }
};

export const createUser = async (userData) => {
    try {
        const response = await api.post('/api/v1/admin/users', userData);
        return response.data;
    } catch (error) {
        console.error("Error creating user: ", error);
        toast.error(error.response?.data?.error || 'Failed to create user');
        throw error;
    }
};

export const updateUser = async (userId, userData) => {
    try {
        const response = await api.put(`/api/v1/admin/users/${userId}`, userData);
        return response.data;
    } catch (error) {
        console.error("Error updating user: ", error);
        toast.error(error.response?.data?.error || 'Failed to update user');
        throw error;
    }
};

export const deleteUser = async (userId) => {
    try {
        const response = await api.delete(`/api/v1/admin/users/${userId}`);
        return response.data;
    } catch (error) {
        console.error("Error deleting user: ", error);
        toast.error(error.response?.data?.error || 'Failed to delete user');
        throw error;
    }
};

export const getUserById = async (userId) => {
    try {
        const response = await api.get(`/api/v1/admin/users/${userId}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching user: ", error);
        toast.error(error.response?.data?.error || 'Failed to fetch user');
        throw error;
    }
};

// Archive API functions
export const fetchArchiveByRange = async (startDate, endDate, options = {}) => {
    try {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        if (options.page) params.append('page', options.page);
        if (options.per_page) params.append('per_page', options.per_page);
        if (options.source) params.append('source', options.source);
        if (options.category) params.append('category', options.category);
        if (options.sentiment) params.append('sentiment', options.sentiment);
        if (options.location) params.append('location', options.location);

        const response = await api.get(`/api/v1/archive/range?${params.toString()}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching archive by range: ", error);
        toast.error(error.response?.data?.error || 'Failed to fetch archive data');
        throw error;
    }
};

export const fetchArchiveByMonth = async (year, month, options = {}) => {
    try {
        const params = new URLSearchParams();
        params.append('year', year);
        params.append('month', month);
        if (options.page) params.append('page', options.page);
        if (options.per_page) params.append('per_page', options.per_page);
        if (options.location) params.append('location', options.location);

        const response = await api.get(`/api/v1/archive/month?${params.toString()}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching archive by month: ", error);
        toast.error(error.response?.data?.error || 'Failed to fetch monthly archive data');
        throw error;
    }
};

export const fetchArchiveByPeriod = async (period, options = {}) => {
    try {
        const params = new URLSearchParams();
        params.append('period', period);
        if (options.page) params.append('page', options.page);
        if (options.per_page) params.append('per_page', options.per_page);
        if (options.location) params.append('location', options.location);

        const response = await api.get(`/api/v1/archive/period?${params.toString()}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching archive by period: ", error);
        toast.error(error.response?.data?.error || 'Failed to fetch period archive data');
        throw error;
    }
};

export const fetchArchiveStats = async (startDate, endDate) => {
    try {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);

        const response = await api.get(`/api/v1/archive/stats?${params.toString()}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching archive stats: ", error);
        toast.error(error.response?.data?.error || 'Failed to fetch archive statistics');
        throw error;
    }
};

export const fetchAvailableDates = async () => {
    try {
        const response = await api.get('/api/v1/archive/available-dates');
        return response.data;
    } catch (error) {
        console.error("Error fetching available dates: ", error);
        toast.error(error.response?.data?.error || 'Failed to fetch available dates');
        throw error;
    }
};

// Advanced Search API functions
export const advancedSearch = async (searchParams) => {
    try {
        const params = new URLSearchParams();
        Object.entries(searchParams).forEach(([key, value]) => {
            if (value && value.trim()) {
                params.append(key, value.trim());
            }
        });
        
        const response = await api.get(`/api/v1/advanced-search/search?${params.toString()}`);
        return response.data;
    } catch (error) {
        console.error("Error performing advanced search: ", error);
        toast.error(error.response?.data?.error || 'Failed to perform search');
        throw error;
    }
};

export const fetchLocations = async () => {
    try {
        const response = await api.get('/api/v1/advanced-search/locations');
        return response.data;
    } catch (error) {
        console.error("Error fetching locations: ", error);
        toast.error(error.response?.data?.error || 'Failed to fetch locations');
        throw error;
    }
};

export const fetchCategories = async () => {
    try {
        const response = await api.get('/api/v1/advanced-search/categories');
        return response.data;
    } catch (error) {
        console.error("Error fetching categories: ", error);
        toast.error(error.response?.data?.error || 'Failed to fetch categories');
        throw error;
    }
};

export const fetchSources = async () => {
    try {
        const response = await api.get('/api/v1/advanced-search/sources');
        return response.data;
    } catch (error) {
        console.error("Error fetching sources: ", error);
        toast.error(error.response?.data?.error || 'Failed to fetch sources');
        throw error;
    }
};

export const fetchSearchStats = async (location = '') => {
    try {
        const params = location ? `?location=${encodeURIComponent(location)}` : '';
        const response = await api.get(`/api/v1/advanced-search/stats${params}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching search stats: ", error);
        toast.error(error.response?.data?.error || 'Failed to fetch search statistics');
        throw error;
    }
};

// AI Curation API functions
export const getRecommendations = async (articleId) => {
    try {
        const response = await api.post('/api/v1/curation/recommendations', { article_id: articleId });
        return response.data.recommendations;
    } catch (error) {
        console.error("Error fetching recommendations: ", error);
        toast.error(error.response?.data?.error || 'Failed to fetch recommendations');
        throw error;
    }
};

export const summarizeContent = async (data) => {
    try {
        const response = await api.post('/api/v1/curation/summarize', data);
        return response.data;
    } catch (error) {
        console.error("Error summarizing content: ", error);
        toast.error(error.response?.data?.error || 'Failed to summarize content');
        throw error;
    }
};

export const categorizeContent = async (data) => {
    try {
        const response = await api.post('/api/v1/curation/categorize', data);
        return response.data;
    } catch (error) {
        console.error("Error categorizing content: ", error);
        toast.error(error.response?.data?.error || 'Failed to categorize content');
        throw error;
    }
};

export const detectDuplicates = async (data) => {
    try {
        const response = await api.post('/api/v1/curation/detect-duplicates', data);
        return response.data;
    } catch (error) {
        console.error("Error detecting duplicates: ", error);
        toast.error(error.response?.data?.error || 'Failed to detect duplicates');
        throw error;
    }
};

export const processArticles = async (articles) => {
    try {
        const response = await api.post('/api/v1/curation/process-batch', { articles });
        return response.data;
    } catch (error) {
        console.error("Error processing articles: ", error);
        toast.error(error.response?.data?.error || 'Failed to process articles');
        throw error;
    }
};

// ==========================
// Saved Queries & Alerts API
// ==========================
export const saveQuery = async ({ name, description, query, filters }) => {
  const response = await api.post('/api/v1/advanced-search/saved-queries', {
    name,
    description,
    query,
    filters,
  });
  return response.data;
};

export const deleteSavedQuery = async (id) => {
  const response = await api.delete(`/api/v1/advanced-search/saved-queries/${id}`);
  return response.data;
};

export const createAlert = async ({ name, query, filters, frequency = 'daily', is_active = true }) => {
  const response = await api.post('/api/v1/advanced-search/alerts', {
    name,
    query,
    filters,
    frequency,
    is_active,
  });
  return response.data;
};

export const deleteAlert = async (id) => {
  const response = await api.delete(`/api/v1/advanced-search/alerts/${id}`);
  return response.data;
};

export const updateAlert = async (id, payload) => {
  const response = await api.patch(`/api/v1/advanced-search/alerts/${id}`, payload);
  return response.data;
};

export default api;


