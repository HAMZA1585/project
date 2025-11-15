import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Button,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Grid,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert
} from '@mui/material';
import {
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  BarChart as BarChartIcon,
  Map as MapIcon,
  Timeline as TimelineIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';

// Import components
import InteractiveDrillDownChart from '../Components/InteractiveDrillDownChart';

// Import API
import { fetchNews } from '../Services/api';

const DataVisualization = () => {
  const [activeTab, setActiveTab] = useState(0);
  // React Query provides data and loading; remove local duplicates
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    format: 'excel',
    includeCharts: true,
    timeRange: 'all'
  });

  // Tab configuration
  const tabs = [
    { 
      id: 'drill-down', 
      label: 'Interactive Charts', 
      icon: <BarChartIcon />,
      component: InteractiveDrillDownChart,
      description: 'Drill-down analysis with interactive charts'
    }
  ];

  // Use React Query for data fetching
  const { 
    data: newsData, 
    isLoading: vizLoading, 
    error,
    refetch: refetchData 
  } = useQuery({
    queryKey: ['visualizationData'],
    queryFn: fetchNews,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
  });

  // Helper function to determine region from source
  const getRegionFromSource = (source) => {
    const regionMap = {
      'BBC': 'UK',
      'CNN': 'US',
      'Reuters': 'Global',
      'Al Jazeera': 'Middle East',
      'The Guardian': 'UK',
      'New York Times': 'US',
      'Washington Post': 'US',
      'Fox News': 'US'
    };
    return regionMap[source] || 'Global';
  };

  // Generate mock data for demonstration
  const generateMockData = () => {
    const sources = ['BBC', 'CNN', 'Reuters', 'Al Jazeera', 'The Guardian', 'New York Times', 'Washington Post', 'Fox News'];
    const categories = ['Politics', 'Technology', 'Business', 'Health', 'Sports', 'Entertainment', 'Science', 'World'];
    const regions = ['US', 'UK', 'Global', 'Middle East', 'Europe', 'Asia', 'Africa', 'Australia'];
    const sentiments = ['Positive', 'Negative', 'Neutral'];
    
    const mockData = [];
    const now = new Date();
    
    for (let i = 0; i < 200; i++) {
      const date = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
      const sentimentScore = sentiment === 'Positive' ? 0.7 + Math.random() * 0.3 :
                           sentiment === 'Negative' ? Math.random() * 0.3 :
                           0.4 + Math.random() * 0.2;
      
      mockData.push({
        id: i + 1,
        title: `Sample News Article ${i + 1} - ${categories[Math.floor(Math.random() * categories.length)]}`,
        content: `This is sample content for article ${i + 1}. It contains various topics and keywords that will be used for analysis.`,
        source: sources[Math.floor(Math.random() * sources.length)],
        category: categories[Math.floor(Math.random() * categories.length)],
        region: regions[Math.floor(Math.random() * regions.length)],
        date: date.toISOString(),
        timestamp: date.toISOString(),
        sentiment_score: sentimentScore,
        sentiment_label: sentiment,
        positive: sentiment === 'Positive' ? 1 : 0,
        negative: sentiment === 'Negative' ? 1 : 0,
        neutral: sentiment === 'Neutral' ? 1 : 0,
        volume: 1,
        url: `https://example.com/article-${i + 1}`
      });
    }
    
    return mockData.sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  // Transform data
  const data = useMemo(() => {
    if (newsData && newsData.articles) {
      return newsData.articles.map((article, index) => ({
        id: index + 1,
        title: article.title,
        content: article.content,
        source: article.source,
        category: article.category || 'General',
        region: article.location || 'Global', // <-- This line was Step 1
        date: article.date || new Date().toISOString(),
        timestamp: article.date || new Date().toISOString(),
        sentiment_score: article.sentiment?.score || 0.5,
        sentiment_label: article.sentiment?.label || 'Neutral',
        positive: article.sentiment?.label === 'Positive' ? 1 : 0,
        negative: article.sentiment?.label === 'Negative' ? 1 : 0,
        neutral: article.sentiment?.label === 'Neutral' ? 1 : 0,
        volume: 1,
        url: article.url
      })).filter(article => article.region !== 'Global'); // <-- ADD THIS FILTER
    }
    return generateMockData();
  }, [newsData]);

  // Handle React Query errors
  React.useEffect(() => {
    if (error) {
      console.error('Error loading visualization data:', error);
      toast.error('Failed to load visualization data, using mock data');
    }
  }, [error]);

  // Calculate visualization summary
  const visualizationSummary = useMemo(() => {
    if (data.length === 0) return null;

    const totalArticles = data.length;
    const sources = [...new Set(data.map(d => d.source))].length;
    const categories = [...new Set(data.map(d => d.category))].length;
    const regions = [...new Set(data.map(d => d.region))].length;
    
    const avgSentiment = data.reduce((sum, d) => sum + d.sentiment_score, 0) / data.length;
    const positiveCount = data.filter(d => d.sentiment_label === 'Positive').length;
    const negativeCount = data.filter(d => d.sentiment_label === 'Negative').length;
    const neutralCount = data.filter(d => d.sentiment_label === 'Neutral').length;

    return {
      totalArticles,
      sources,
      categories,
      regions,
      avgSentiment,
      positiveCount,
      negativeCount,
      neutralCount,
      positivePercentage: (positiveCount / totalArticles) * 100,
      negativePercentage: (negativeCount / totalArticles) * 100,
      neutralPercentage: (neutralCount / totalArticles) * 100
    };
  }, [data]);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Handle export
  const handleExport = async (exportData, metric) => {
    try {
      // Simple export functionality - download as JSON
      const exportObj = {
        timestamp: new Date().toISOString(),
        type: activeTab === 0 ? 'interactive_charts' : 'geographic_sentiment',
        data: exportData,
        metric: metric
      };
      
      const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `data_visualization_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Data exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    }
  };

  // Handle dashboard export
  const handleDashboardExport = async () => {
    try {
      // Simple dashboard export - download as JSON
      const exportObj = {
        timestamp: new Date().toISOString(),
        title: 'Interactive Data Visualization Report',
        filename: 'data_visualization_dashboard',
        data: data,
        exportOptions: exportOptions
      };
      
      const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `data_visualization_dashboard_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Visualization dashboard exported successfully');
    } catch (error) {
      console.error('Dashboard export error:', error);
      toast.error('Failed to export visualization dashboard');
    }
  };

  // Render active component
  const renderActiveComponent = () => {
    const TabComponent = tabs[activeTab].component;
    return (
      <TabComponent
        data={data}
        loading={vizLoading}
        onExport={handleExport}
        title={tabs[activeTab].label}
      />
    );
  };

  if (vizLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading visualization data...</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="max-w-7xl mx-auto p-6"
    >
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <Typography variant="h4" className="font-bold text-gray-900text-white mb-2">
              Interactive Data Visualization
            </Typography>
            <Typography variant="body1" className="text-gray-600text-gray-400">
              Advanced visualizations with drill-down capabilities, word clouds, network graphs, and geographic mapping
            </Typography>
          </div>
          
          <div className="flex items-center space-x-2">
            <Tooltip title="Export Dashboard">
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleDashboardExport}
              >
                Export Dashboard
              </Button>
            </Tooltip>
            <Tooltip title="Settings">
              <IconButton onClick={() => setExportDialogOpen(true)}>
                <SettingsIcon />
              </IconButton>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Visualization Summary */}
      {visualizationSummary && (
        <Grid container spacing={3} className="mb-8">
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <Typography variant="h6" className="font-bold text-gray-900text-white">
                      {visualizationSummary.totalArticles}
                    </Typography>
                    <Typography variant="body2" className="text-gray-600text-gray-400">
                      Total Articles
                    </Typography>
                  </div>
                  <BarChartIcon className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <Typography variant="h6" className="font-bold text-gray-900text-white">
                      {visualizationSummary.sources}
                    </Typography>
                    <Typography variant="body2" className="text-gray-600text-gray-400">
                      Sources
                    </Typography>
                  </div>
                  <BarChartIcon className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <Typography variant="h6" className="font-bold text-gray-900text-white">
                      {visualizationSummary.categories}
                    </Typography>
                    <Typography variant="body2" className="text-gray-600text-gray-400">
                      Categories
                    </Typography>
                  </div>
                  <MapIcon className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <Typography variant="h6" className="font-bold text-gray-900text-white">
                      {visualizationSummary.regions}
                    </Typography>
                    <Typography variant="body2" className="text-gray-600text-gray-400">
                      Regions
                    </Typography>
                  </div>
                  <MapIcon className="w-8 h-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Sentiment Distribution */}
      {visualizationSummary && (
        <Paper className="p-6 mb-8">
          <Typography variant="h6" className="font-semibold text-gray-900text-white mb-4">
            Sentiment Distribution
          </Typography>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100bg-green-900 rounded-full flex items-center justify-center mx-auto mb-2">
                <Typography variant="h6" className="font-bold text-green-600text-green-400">
                  {visualizationSummary.positivePercentage?.toFixed(1)}%
                </Typography>
              </div>
              <Typography variant="body2" className="text-gray-600text-gray-400">
                Positive
              </Typography>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100bg-red-900 rounded-full flex items-center justify-center mx-auto mb-2">
                <Typography variant="h6" className="font-bold text-red-600text-red-400">
                  {visualizationSummary.negativePercentage?.toFixed(1)}%
                </Typography>
              </div>
              <Typography variant="body2" className="text-gray-600text-gray-400">
                Negative
              </Typography>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100bg-yellow-900 rounded-full flex items-center justify-center mx-auto mb-2">
                <Typography variant="h6" className="font-bold text-yellow-600text-yellow-400">
                  {visualizationSummary.neutralPercentage?.toFixed(1)}%
                </Typography>
              </div>
              <Typography variant="body2" className="text-gray-600text-gray-400">
                Neutral
              </Typography>
            </div>
          </div>
        </Paper>
      )}

      {/* Tabs */}
      <Paper className="mb-6">
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
        >
          {tabs.map((tab, index) => (
            <Tab
              key={tab.id}
              label={tab.label}
              icon={tab.icon}
              iconPosition="start"
            />
          ))}
        </Tabs>
      </Paper>

      {/* Active Component */}
      {renderActiveComponent()}

      {/* Export Settings Dialog */}
      <Dialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Export Settings</DialogTitle>
        <DialogContent>
          <div className="space-y-4 mt-4">
            <FormControl fullWidth>
              <InputLabel>Export Format</InputLabel>
              <Select
                value={exportOptions.format}
                label="Export Format"
                onChange={(e) => setExportOptions(prev => ({ ...prev, format: e.target.value }))}
              >
                <MenuItem value="excel">Excel (.xlsx)</MenuItem>
                <MenuItem value="pdf">PDF (.pdf)</MenuItem>
                <MenuItem value="csv">CSV (.csv)</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl fullWidth>
              <InputLabel>Time Range</InputLabel>
              <Select
                value={exportOptions.timeRange}
                label="Time Range"
                onChange={(e) => setExportOptions(prev => ({ ...prev, timeRange: e.target.value }))}
              >
                <MenuItem value="all">All Time</MenuItem>
                <MenuItem value="last7days">Last 7 Days</MenuItem>
                <MenuItem value="last30days">Last 30 Days</MenuItem>
                <MenuItem value="last90days">Last 90 Days</MenuItem>
              </Select>
            </FormControl>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="includeCharts"
                checked={exportOptions.includeCharts}
                onChange={(e) => setExportOptions(prev => ({ ...prev, includeCharts: e.target.checked }))}
              />
              <label htmlFor="includeCharts" className="text-sm text-gray-700text-gray-300">
                Include charts in export
              </label>
            </div>
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDashboardExport} variant="contained">
            Export
          </Button>
        </DialogActions>
      </Dialog>
    </motion.div>
  );
};

export default DataVisualization;
