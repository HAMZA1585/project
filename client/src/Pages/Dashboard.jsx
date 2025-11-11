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
import StatCard from '../Components/StatCard.jsx';
import SmartRecommendations from '../Components/SmartRecommendations.jsx';
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
const mockNews = [
  { 
    id: 1, 
    title: 'Stock Market Reaches All-Time High', 
    url: 'https://www.ft.com/content/stock-market-all-time-high',
    category: 'Business', 
    sentiment: 'Positive', 
    date: '2024-05-01', 
    source: 'Financial Times', 
    views: 15432,
    content: 'The stock market has reached unprecedented heights today, with major indices posting record gains. Analysts attribute this surge to strong corporate earnings, positive economic indicators, and investor confidence in the current administration\'s economic policies. The Dow Jones Industrial Average closed at 35,000 points, while the S&P 500 and NASDAQ also posted significant gains. Market experts suggest this trend may continue in the coming weeks as more companies report their quarterly earnings.'
  },
  { 
    id: 2, 
    title: 'Earthquake Hits Northern Regions', 
    url: 'https://www.bbc.com/news/earthquake-northern-regions',
    category: 'Disaster', 
    sentiment: 'Negative', 
    date: '2024-05-10', 
    source: 'BBC News', 
    views: 28765,
    content: 'A powerful earthquake measuring 7.2 on the Richter scale struck northern regions early this morning, causing widespread damage and casualties. Emergency services are working around the clock to rescue survivors and provide medical assistance. The quake\'s epicenter was located 50 kilometers north of the capital, affecting several major cities and rural areas. Government officials have declared a state of emergency and are coordinating international aid efforts. The death toll currently stands at 150, with over 1,000 injured and thousands displaced from their homes.'
  },
  { 
    id: 3, 
    title: 'PM Announces New Education Policy', 
    url: 'https://www.dawn.com/news/education-policy-2024',
    category: 'Politics', 
    sentiment: 'Neutral', 
    date: '2024-05-15', 
    source: 'Dawn News', 
    views: 12345,
    content: 'The Prime Minister unveiled a comprehensive new education policy today, focusing on digital learning and skill development. The policy aims to modernize the education system and prepare students for the digital economy. Key initiatives include increased funding for technology in schools, teacher training programs, and partnerships with private sector companies. The policy also addresses issues of access to education in rural areas through online learning platforms. Critics have raised concerns about implementation challenges, while supporters praise the forward-thinking approach.'
  },
  { 
    id: 4, 
    title: 'Pakistan Wins Cricket Series', 
    url: 'https://www.espn.com/cricket/pakistan-wins-series',
    category: 'Sports', 
    sentiment: 'Positive', 
    date: '2024-05-20', 
    source: 'ESPN', 
    views: 34567,
    content: 'Pakistan\'s cricket team secured a thrilling victory in the final match of the series, defeating their opponents by 5 wickets. The match went down to the wire, with the winning runs scored in the final over. Captain Babar Azam led from the front with a brilliant century, while the bowling attack restricted the opposition to a manageable total. This victory marks Pakistan\'s first series win in two years and has sparked celebrations across the country. The team\'s performance has renewed hopes for the upcoming World Cup tournament.'
  },
  { 
    id: 5, 
    title: 'Inflation Rate Rises to 30%', 
    url: 'https://www.reuters.com/business/inflation-rate-rises-30-percent',
    category: 'Economy', 
    sentiment: 'Negative', 
    date: '2024-05-25', 
    source: 'Reuters', 
    views: 23456,
    content: 'The inflation rate has reached a new high of 30% this month, putting additional pressure on household budgets and business operations. Rising food prices, energy costs, and supply chain disruptions are the primary drivers of this increase. The central bank has announced emergency measures to curb inflation, including interest rate hikes and currency stabilization efforts. Economists warn that sustained high inflation could lead to economic instability and social unrest. The government is considering additional fiscal measures to support vulnerable populations.'
  },
  { 
    id: 6, 
    title: 'Tech Giant Launches New Smartphone', 
    url: 'https://techcrunch.com/2024/05/05/tech-giant-launches-new-smartphone',
    category: 'Technology', 
    sentiment: 'Positive', 
    date: '2024-05-05', 
    source: 'TechCrunch', 
    views: 18976,
    content: 'The latest smartphone from the tech giant features groundbreaking AI capabilities and an innovative camera system. The device boasts a 6.7-inch OLED display, 5G connectivity, and a battery that lasts up to 48 hours on a single charge. The AI assistant can now perform complex tasks like photo editing and language translation in real-time. Early reviews praise the device\'s performance and user experience. The company expects strong sales based on pre-order numbers, which have already exceeded expectations.'
  },
  { 
    id: 7, 
    title: 'Climate Change Conference Concludes', 
    url: 'https://www.theguardian.com/environment/climate-conference-2024',
    category: 'Environment', 
    sentiment: 'Neutral', 
    date: '2024-05-18', 
    source: 'The Guardian', 
    views: 15678,
    content: 'The international climate change conference concluded with mixed results, as world leaders agreed on some measures while failing to reach consensus on others. Key agreements include increased funding for renewable energy projects and stricter emissions targets for developed nations. However, disagreements over carbon pricing and financial assistance for developing countries remain unresolved. Environmental groups have expressed cautious optimism about the progress made, while calling for more ambitious action. The next conference is scheduled for next year in a different host country.'
  },
  { 
    id: 8, 
    title: 'New Medical Breakthrough Announced', 
    url: 'https://www.medicalnews.com/breakthrough-cancer-treatment-2024',
    category: 'Health', 
    sentiment: 'Positive', 
    date: '2024-05-22', 
    source: 'Medical News', 
    views: 20987,
    content: 'Scientists have announced a major breakthrough in cancer treatment, with a new therapy showing promising results in clinical trials. The treatment uses a combination of immunotherapy and targeted drug delivery to attack cancer cells while sparing healthy tissue. Early trials show a 70% success rate in patients with previously untreatable forms of cancer. The therapy is expected to be available for widespread use within two years, pending regulatory approval. This development represents a significant step forward in the fight against cancer and offers hope to millions of patients worldwide.'
  }
];
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
    if (!newsData) return mockNews;
    
    if (newsData.articles) {
      return newsData.articles.map((article, index) => ({
        id: index + 1,
        title: article.title,
        url: article.url,
        category: article.category || 'General',
        sentiment: article.sentiment?.label || 'Neutral',
        date: article.date || new Date().toISOString().split('T')[0],
        source: article.source || 'Unknown',
        views: Math.floor(Math.random() * 50000) + 1000
      }));
    }
    
    return mockNews;
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
    resetFilters
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
            <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    News Analytics Dashboard
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Real-time sentiment analysis and trending topics monitoring
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Last Updated</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {new Date().toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div variants={itemVariant} className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* REPLACEMENT START */}
              <StatCard
                title="TOTAL ARTICLES"
                value={loading ? <CircularProgress size={28} /> : stats.total}
                icon={<NewspaperIcon />}
                color="#3b82f6"
              />
              <StatCard
                title="POSITIVE SENTIMENT"
                value={loading ? <CircularProgress size={28} /> : stats.positive}
                icon={<ArrowTrendingUpIcon />}
                color="#10b981"
              />
              <StatCard
                title="NEGATIVE SENTIMENT"
                value={loading ? <CircularProgress size={28} /> : stats.negative}
                icon={<ArrowTrendingDownIcon />}
                color="#ef4444"
              />
              {/* REPLACEMENT END */}

              <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow duration-200">
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                        Sentiment Distribution
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Visual breakdown
                      </p>
                    </div>
                    <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                      <PublicIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                  
                  <div className="flex-1 flex flex-col justify-center space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Positive</span>
                      </div>
                      <span className="text-sm font-bold text-green-600 dark:text-green-400">
                        {loading ? '...' : `${stats.positivePercentage}%`}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Negative</span>
                      </div>
                      <span className="text-sm font-bold text-red-600 dark:text-red-400">
                        {loading ? '...' : `${stats.negativePercentage}%`}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Neutral</span>
                      </div>
                      <span className="text-sm font-bold text-yellow-600 dark:text-yellow-400">
                        {loading ? '...' : `${stats.neutralPercentage}%`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div variants={itemVariant} className="mb-8">
            <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Filter & Search Controls
                </h3>
                <div className="text-sm text-gray-500 dark:text-gray-400">
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
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Analytics Dashboard
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Comprehensive analysis of news sentiment and trending topics
              </p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <motion.div variants={itemVariant}>
                  <div className="bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 rounded-xl p-8 h-full">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center space-x-3">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                          <TrendingUpIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                            Sentiment Trends Analysis
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Historical sentiment data and trend analysis over time
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500 dark:text-gray-400">Last Updated</div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          {new Date().toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <Trends data={trendData} loading={loading} />
                    </div>
                  </div>
                </motion.div>
              </div>

              <div>
                <motion.div variants={itemVariant}>
                  <div className="bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 rounded-xl p-8 h-full">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-3">
                        <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                          <PublicIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                            Trending Topics
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Most discussed topics in current news cycle
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-green-600 dark:text-green-400 font-medium">Live</span>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <TrendingTopics trends={trends} loading={loading} />
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>

          <motion.div variants={itemVariant} className="mt-8">
            <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Latest News Headlines
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Breaking news and latest updates
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {loading ? 'Loading articles...' : `${filteredNews.length} articles found`}
                  </div>
                  {loading && <CircularProgress size={16} color="primary" />}
                </div>
              </div>
              
              <div className="space-y-3">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <CircularProgress size={24} color="primary" />
                    <span className="ml-3 text-gray-600 dark:text-gray-400">Loading headlines...</span>
                  </div>
                ) : filteredNews.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No news articles found matching your filters
                  </div>
                ) : (
                  filteredNews.map((article, index) => (
                    <div
                      key={article.id}
                      className="group border-l-4 border-gray-200 dark:border-gray-600 pl-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 cursor-pointer"
                      onClick={() => handleArticleClick(article)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-base font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 line-clamp-2">
                            {article.title}
                          </h4>
                          <div className="flex items-center gap-3 mt-2 text-sm text-gray-500 dark:text-gray-400">
                            <span className="font-medium">{article.source}</span>
                            <span>•</span>
                            <span>{new Date(article.date).toLocaleDateString()}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <VisibilityIcon sx={{ fontSize: 14 }} />
                              {article.views?.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                article.sentiment === 'Positive'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : article.sentiment === 'Negative'
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              }`}
                            >
                              {article.sentiment}
                            </span>
                            <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded-full">
                              {article.category}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4 flex-shrink-0">
                          <LaunchIcon 
                            sx={{ 
                              fontSize: 16, 
                              color: 'text.secondary',
                              opacity: 0.6,
                              transition: 'opacity 0.2s ease'
                            }} 
                            className="group-hover:opacity-100"
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>

          {/* Pakistani News Section */}
          {pakistaniNews.length > 0 && (
            <motion.div variants={itemVariant} className="mb-8">
              <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                      <GlobeAltIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        🇵🇰 Pakistani News
                      </h2>
                      <p className="text-gray-600 dark:text-gray-400">
                        Latest news from Pakistani sources
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Articles</p>
                    <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                      {pakistaniNews.length}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pakistaniNews.slice(0, 6).map((article, index) => (
                    <div
                      key={index}
                      className="group cursor-pointer p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-all duration-200 hover:border-green-300 dark:hover:border-green-600"
                      onClick={() => handleArticleClick(article)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white hover:text-green-600 dark:hover:text-green-400 transition-colors duration-200 line-clamp-2">
                            {article.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
                            <span className="font-medium text-green-600 dark:text-green-400">
                              🇵🇰 {article.source}
                            </span>
                            <span>•</span>
                            <span>{new Date(article.date).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                article.sentiment === 'Positive'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : article.sentiment === 'Negative'
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              }`}
                            >
                              {article.sentiment}
                            </span>
                            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full">
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