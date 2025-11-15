import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useSelector, useDispatch } from 'react-redux';
import { fetchNews, getRecommendations } from '../Services/api.js';
import { checkSentimentSpike, checkBreakingNews, checkCriticalEvents } from '../store/slices/notificationSlice';
import SentimentChart from '../Components/SentimentChart.jsx';
import SentimentPieChart from '../Components/SentimentPieChart.jsx';
import Trends from '../Components/Trends.jsx';
import TrendingTopics from '../Components/TrendingTopics.jsx';
import NewsList from '../Components/NewsList.jsx';
import { Card as UICard, CardContent as UICardContent, CardHeader as UICardHeader, CardTitle, CardDescription } from '../components/ui/card.jsx';
import { NewspaperIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useDashboardFilters } from '../hooks/useDashboardFilters.js';
import {
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Typography,
  Grid,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Divider,
  Card,
  CardContent,
  CardHeader,
  Modal,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Clear as ClearIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Newspaper as NewspaperIconMUI,
  Public as PublicIcon,
  Close as CloseIcon,
  CalendarToday as CalendarIcon,
  Source as SourceIcon,
  Visibility as VisibilityIcon,
  Launch as LaunchIcon,
  OpenInNew as OpenInNewIcon
} from '@mui/icons-material';

const containerVariant = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.1
    }
  }
};

const itemVariant = {
  hidden: { 
    opacity: 0, 
    y: 20 
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut"
    }
  }
};
const COLORS = {
  Positive: '#4CAF50',
  Negative: '#F44336',
  Neutral: '#FFC107'
};

const calculateOverallSentiment = (newsData) => {
  if (!newsData || newsData.length === 0) return 0.5;
  
  const sentimentScores = newsData.map(article => {
    switch (article.sentiment) {
      case 'Positive': return 1;
      case 'Negative': return 0;
      case 'Neutral': return 0.5;
      default: return 0.5;
    }
  });
  
  return sentimentScores.reduce((sum, score) => sum + score, 0) / sentimentScores.length;
};

const Dashboard = () => {
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [pakistaniNews, setPakistaniNews] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [previousSentiment, setPreviousSentiment] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const navigate = useNavigate();

  // Use React Query for data fetching
  const { 
    data: newsData, 
    isLoading: loading, 
    error, 
    refetch: refetchNews 
  } = useQuery({
    queryKey: ['news'],
    queryFn: fetchNews,
    enabled: !!user, // Only fetch when user is logged in
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  // Transform news data
  const news = useMemo(() => {
    // If newsData is not ready or has no articles, return an empty array.
    if (!newsData || !newsData.articles) {
      return []; 
    }
    
    // If we have articles, map them
    return newsData.articles.map((article, index) => ({
      id: article.id || index + 1, // Use the real article ID from the DB
      title: article.title,
      url: article.url,
      category: article.category || 'General',
      sentiment: article.sentiment?.label || 'Neutral',
      content: article.content || '', // Make sure content exists
      date: article.date || new Date().toISOString().split('T')[0],
      source: article.source || 'Unknown',
      views: Math.floor(Math.random() * 50000) + 1000 // You can keep mock views
    }));
  }, [newsData]);

  const {
    searchTerm,
    setSearchTerm,
    sentimentFilter,
    setSentimentFilter,
    categoryFilter,
    setCategoryFilter,
    dateRange,
    setDateRange,
    filteredNews,
    resetFilters,
    isLoading: searchLoading, // Get loading state from our hook
  } = useDashboardFilters(news);

  // Transform trends data
  const trends = useMemo(() => {
    return newsData?.trends || [];
  }, [newsData]);

  // Handle notifications when news data changes
  React.useEffect(() => {
    if (news.length > 0) {
      news.forEach(article => {
        dispatch(checkBreakingNews(article));
        dispatch(checkCriticalEvents(article));
      });
      
      const currentSentiment = calculateOverallSentiment(news);
      if (previousSentiment !== null) {
        dispatch(checkSentimentSpike({
          current: currentSentiment,
          previous: previousSentiment,
          threshold: 0.3
        }));
      }
      setPreviousSentiment(currentSentiment);
    }
  }, [news, dispatch, previousSentiment]);

  // Handle authentication
  React.useEffect(() => {
    if (!user) {
      toast.error("You must be logged in to access Dashboard");
      navigate("/login");
    }
  }, [user, navigate]);

  // Handle React Query errors
  React.useEffect(() => {
    if (error) {
      console.error('Error fetching news:', error);
      toast.error('Failed to load news data');
    }
  }, [error]);

  // filteredNews now comes from the hook

  const sentimentData = [
    { name: 'Positive', value: news.filter(n => n.sentiment === 'Positive').length },
    { name: 'Negative', value: news.filter(n => n.sentiment === 'Negative').length },
    { name: 'Neutral', value: news.filter(n => n.sentiment === 'Neutral').length }
  ];

  const categoryData = [...new Set(news.map(n => n.category))].map(category => ({
    name: category,
    Positive: news.filter(n => n.category === category && n.sentiment === 'Positive').length,
    Negative: news.filter(n => n.category === category && n.sentiment === 'Negative').length,
    Neutral: news.filter(n => n.category === category && n.sentiment === 'Neutral').length
  }));

  const trendData = [...new Set(news.map(n => n.date))]
    .sort()
    .map(date => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      Positive: news.filter(n => n.date === date && n.sentiment === 'Positive').length,
      Negative: news.filter(n => n.date === date && n.sentiment === 'Negative').length,
      Neutral: news.filter(n => n.date === date && n.sentiment === 'Neutral').length
    }));

  const categories = ['All', ...new Set(news.map(n => n.category))];
  const sentiments = ['All', 'Positive', 'Negative', 'Neutral'];

  const stats = useMemo(() => {
    const total = filteredNews.length;
    if (total === 0) {
      return { 
        total: 0, 
        positive: 0, 
        negative: 0, 
        neutral: 0,
        positivePercentage: 0, 
        negativePercentage: 0, 
        neutralPercentage: 0,
        topSource: 'N/A' 
      };
    }

    const positiveCount = filteredNews.filter(n => n.sentiment === 'Positive').length;
    const negativeCount = filteredNews.filter(n => n.sentiment === 'Negative').length;
    const neutralCount = filteredNews.filter(n => n.sentiment === 'Neutral').length;

    const sourceCounts = filteredNews.reduce((acc, curr) => {
      acc[curr.source] = (acc[curr.source] || 0) + 1;
      return acc;
    }, {});

    const topSource = Object.keys(sourceCounts).length > 0
      ? Object.keys(sourceCounts).reduce((a, b) => sourceCounts[a] > sourceCounts[b] ? a : b)
      : 'N/A';

    return {
      total,
      positive: positiveCount,
      negative: negativeCount,
      neutral: neutralCount,
      positivePercentage: Math.round((positiveCount / total) * 100),
      negativePercentage: Math.round((negativeCount / total) * 100),
      neutralPercentage: Math.round((neutralCount / total) * 100),
      topSource,
    };
  }, [filteredNews]);

  const handleCategoryChartClick = (data) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const categoryName = data.activePayload[0].payload.name;
      setCategoryFilter(categoryName);
      toast.success(`Filtered by category: ${categoryName}`);
    }
  };

  const handleResetFilters = () => {
    resetFilters();
    toast.success('Filters reset successfully');
  };

  const handleRefreshData = async () => {
    try {
      await refetchNews();
      toast.success('Data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh data');
    }
  };

  const handleArticleSelect = async (article) => {
    setSelectedArticle(article);
    setModalOpen(true);
    setRecommendations([]); // Clear old recommendations
    try {
      const recs = await getRecommendations(article.id);
      setRecommendations(recs);
    } catch (error) {
      console.error("Failed to load recommendations for article:", article.id);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedArticle(null);
    setRecommendations([]); // Clear recommendations when modal closes
  };

  const handleArticleClick = async (article) => {
    setSelectedArticle(article);
    setModalOpen(true);
    setRecommendations([]); // Clear old recommendations
    try {
      // Make sure you have imported getRecommendations from your api.js file
      const recs = await getRecommendations(article.id);
      setRecommendations(recs);
    } catch (error) {
      console.error("Failed to load recommendations for article:", article.id);
      toast.error("Could not load related articles.");
    }
  };


  return (
    <motion.div
      variants={containerVariant}
      initial="hidden"
      animate="visible"
      className="max-w-7xl mx-auto"
    >
          <motion.div variants={itemVariant} className="mb-8">
            <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    News Analytics Dashboard
                  </h1>
                  <p className="text-gray-600 mt-2">
                    Real-time sentiment analysis and trending topics monitoring
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Last Updated</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {new Date().toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div variants={itemVariant} className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* ADD THIS CODE BACK START */}
              <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                      Total Articles
                    </p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {(loading || searchLoading) ? <CircularProgress size={28} /> : stats.total}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Processed today
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <NewspaperIconMUI className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                      Positive Sentiment
                    </p>
                    <p className="text-3xl font-bold text-green-600 mt-2">
                      {(loading || searchLoading) ? <CircularProgress size={28} /> : stats.positive}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Favorable outlook
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <TrendingUpIcon className="h-8 w-8 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                      Negative Sentiment
                    </p>
                    <p className="text-3xl font-bold text-red-600 mt-2">
                      {(loading || searchLoading) ? <CircularProgress size={28} /> : stats.negative}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Areas of concern
                    </p>
                  </div>
                  <div className="p-3 bg-red-100 rounded-lg">
                    <TrendingDownIcon className="h-8 w-8 text-red-600" />
                  </div>
                </div>
              </div>
              {/* ADD THIS CODE BACK END */}

              {/* PASTE THIS CODE IN PLACE OF THE PIE CHART */}
              <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow duration-200">
                 <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                        Sentiment Distribution
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Visual breakdown
                      </p>
                    </div>
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <PublicIcon className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col justify-center space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                         <span className="text-sm font-medium text-gray-700">Positive</span>
                      </div>
                      <span className="text-sm font-bold text-green-600">
                        {(loading || searchLoading) ? '...' : `${stats.positivePercentage}%`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="text-sm font-medium text-gray-700">Negative</span>
                      </div>
                       <span className="text-sm font-bold text-red-600">
                        {(loading || searchLoading) ? '...' : `${stats.negativePercentage}%`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                       <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <span className="text-sm font-medium text-gray-700">Neutral</span>
                      </div>
                      <span className="text-sm font-bold text-yellow-600">
                        {(loading || searchLoading) ? '...' : `${stats.neutralPercentage}%`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div variants={itemVariant} className="mb-8">
            <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Filter & Search Controls
                </h3>
                <div className="text-sm text-gray-500">
                  Refine your analysis
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                <TextField
                  label="Search News"
                  placeholder="Enter keywords..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                  variant="outlined"
                  fullWidth
                  size="small"
                />
                
                <FormControl fullWidth size="small">
                  <InputLabel>Sentiment</InputLabel>
                  <Select
                    value={sentimentFilter}
                    label="Sentiment"
                    onChange={(e) => setSentimentFilter(e.target.value)}
                  >
                    {sentiments.map(s => (
                      <MenuItem key={s} value={s}>{s}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                <FormControl fullWidth size="small">
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={categoryFilter}
                    label="Category"
                    onChange={(e) => setCategoryFilter(e.target.value)}
                  >
                    {categories.map(c => (
                      <MenuItem key={c} value={c}>{c}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                <TextField
                  label="Start Date"
                  type="date"
                  value={dateRange.start || ''}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  variant="outlined"
                  fullWidth
                  size="small"
                />
                
                <TextField
                  label="End Date"
                  type="date"
                  value={dateRange.end || ''}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  variant="outlined"
                  fullWidth
                  size="small"
                />
                
                <Button
                  variant="outlined"
                  startIcon={<ClearIcon />}
                  onClick={handleResetFilters}
                  fullWidth
                  size="small"
                  sx={{ height: '40px' }}
                >
                  Reset
                </Button>
              </div>
            </div>
          </motion.div>

          <div className="mb-8">
            <motion.div variants={itemVariant} className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Analytics Dashboard
              </h2>
              <p className="text-gray-600">
                Comprehensive analysis of news sentiment and trending topics
              </p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* REPLACEMENT START */}
              <motion.div variants={itemVariant}>
                <div className="bg-white shadow-lg border border-gray-200 rounded-xl p-8 h-full">
                  {/* Card Header */}
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 bg-purple-100 rounded-lg">
                        <PublicIcon className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">
                          Sentiment Distribution
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Overall sentiment analysis of news articles
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Card Content (The Pie Chart) */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <SentimentPieChart data={sentimentData} loading={loading} />
                  </div>
                </div>
              </motion.div>
              {/* REPLACEMENT END */}

              <div>
                <motion.div variants={itemVariant}>
                  <div className="bg-white shadow-lg border border-gray-200 rounded-xl p-8 h-full">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-3">
                        <div className="p-3 bg-green-100 rounded-lg">
                          <PublicIcon className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">
                            Trending Topics
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            Most discussed topics in current news cycle
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-green-600 font-medium">Live</span>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4">
                      <TrendingTopics trends={trends} loading={loading} />
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>

          {/* REPLACEMENT START */}
          <motion.div variants={itemVariant} className="mt-8">
            <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Latest News Headlines
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {(loading || searchLoading) ? 'Loading articles...' : `${filteredNews.length} articles found`}
                  </p>
                </div>
                {(loading || searchLoading) && <CircularProgress size={24} color="primary" />}
              </div>
              
              {/* This is the new component you are adding */}
              <div className="max-h-[700px] overflow-y-auto pr-2">
                <NewsList
                  news={filteredNews}
                  loading={loading || searchLoading}
                  onArticleSelect={handleArticleClick}
                />
              </div>
              
            </div>
          </motion.div>
          {/* REPLACEMENT END */}

          {/* Pakistani News Section */}
          {pakistaniNews.length > 0 && (
            <motion.div variants={itemVariant} className="mb-8">
              <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <GlobeAltIcon className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">
                        🇵🇰 Pakistani News
                      </h2>
                      <p className="text-gray-600">
                        Latest news from Pakistani sources
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Articles</p>
                    <p className="text-lg font-semibold text-green-600">
                      {pakistaniNews.length}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pakistaniNews.slice(0, 6).map((article, index) => (
                    <div
                      key={index}
                      className="group cursor-pointer p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all duration-200 hover:border-green-300"
                      onClick={() => handleArticleClick(article)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 hover:text-green-600 transition-colors duration-200 line-clamp-2">
                            {article.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                            <span className="font-medium text-green-600">
                              🇵🇰 {article.source}
                            </span>
                            <span>•</span>
                            <span>{new Date(article.date).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                article.sentiment === 'Positive'
                                  ? 'bg-green-100 text-green-800'
                                  : article.sentiment === 'Negative'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {article.sentiment}
                            </span>
                            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                              Pakistan News
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {pakistaniNews.length > 6 && (
                  <div className="mt-4 text-center">
                    <button
                      onClick={() => navigate('/archive')}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-200"
                    >
                      View All Pakistani News ({pakistaniNews.length})
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

      <Dialog
        open={modalOpen}
        onClose={handleCloseModal}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            maxHeight: '90vh'
          }
        }}
      >
        {selectedArticle && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Typography variant="h5" component="div" sx={{ fontWeight: 'bold', pr: 2 }}>
                  {selectedArticle.title}
                </Typography>
                <IconButton
                  onClick={handleCloseModal}
                  sx={{ color: 'text.secondary' }}
                >
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            
            <DialogContent dividers>
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SourceIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {selectedArticle.source}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body1" color="text.secondary">
                      {new Date(selectedArticle.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <VisibilityIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body1" color="text.secondary">
                      {selectedArticle.views?.toLocaleString()} views
                    </Typography>
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                  <Chip 
                    label={selectedArticle.category} 
                    variant="outlined"
                    color="primary"
                  />
                  <Chip
                    label={`${selectedArticle.sentiment} Sentiment`}
                    sx={{
                      backgroundColor: selectedArticle.sentiment === 'Positive' ? '#4CAF50' :
                                      selectedArticle.sentiment === 'Negative' ? '#F44336' : '#FFC107',
                      color: 'white',
                      fontWeight: 500
                    }}
                  />
                </Box>
              </Box>
              
              <Divider sx={{ mb: 3 }} />
              
              <Box>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Article Content
                </Typography>
                <Typography variant="body1" sx={{ lineHeight: 1.8, color: 'text.primary' }}>
                  {selectedArticle.content}
                </Typography>
              </Box>
              
              {/* Recommendations Section */}
              {recommendations.length > 0 && (
                <>
                  <Divider sx={{ my: 3 }} />
                  <Box>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                      Related Articles
                    </Typography>
                    <SmartRecommendations articles={recommendations.map(rec => rec.article)} />
                  </Box>
                </>
              )}
            </DialogContent>
            
            <DialogActions sx={{ p: 2 }}>
              <Button 
                onClick={handleCloseModal} 
                variant="outlined"
                startIcon={<CloseIcon />}
              >
                Close
              </Button>
              <Button 
                variant="contained" 
                color="primary"
                startIcon={<OpenInNewIcon />}
                onClick={() => {
                  if (selectedArticle.url) {
                    window.open(selectedArticle.url, '_blank', 'noopener,noreferrer');
                    toast.success('Opening original article...');
                  } else {
                    toast.error('No URL available for this article');
                  }
                }}
              >
                View Original
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </motion.div>
  );
};

export default Dashboard;