import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Button,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  Slider,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  AutoAwesome as AutoAwesomeIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Download as DownloadIcon,
  TrendingUp as TrendingUpIcon,
  Compare as CompareIcon,
  Summarize as SummarizeIcon,
  Category as CategoryIcon,
  Analytics as AnalyticsIcon,
  Speed as SpeedIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import SmartRecommendations from '../Components/SmartRecommendations';
import DuplicateDetection from '../Components/DuplicateDetection';
import ContentSummarizer from '../Components/ContentSummarizer';
import AutoCategorizer from '../Components/AutoCategorizer';
import { fetchNews, summarizeContent, categorizeContent, detectDuplicates, processArticles } from '../Services/api';

const ContentCuration = () => {
  const queryClient = useQueryClient();
  const [articles, setArticles] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // Add local state to hold curation results
  const [summaries, setSummaries] = useState({});
  const [categories, setCategories] = useState({});
  const [duplicates, setDuplicates] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [processingStats, setProcessingStats] = useState({
    total: 0,
    processed: 0,
    recommendations: 0,
    duplicates: 0,
    summaries: 0,
    categories: 0
  });

  const [curationSettings, setCurationSettings] = useState({
    autoSummarize: true,
    autoCategorize: true,
    detectDuplicates: true,
    recommendationThreshold: 0.5,
    summaryLength: 'medium',
    categoryConfidence: 0.7,
  });

  const updateSettings = (newSettings) => {
    setCurationSettings(prev => ({ ...prev, ...newSettings }));
  };

  const clearData = () => {
    setSummaries({});
    setCategories({});
    setDuplicates([]);
    setRecommendations([]);
    toast.success('Curation data cleared!');
  };

  // Create mutations for each curation action
  const summarizeMutation = useMutation({
    mutationFn: (data) => summarizeContent(data),
    onSuccess: (data) => {
      if (data.articleId && data.summary) {
        setSummaries(prev => ({ ...prev, [data.articleId]: data.summary }));
        toast.success('Article summarized!');
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to summarize article');
    },
  });

  const categorizeMutation = useMutation({
    mutationFn: (data) => categorizeContent(data),
    onSuccess: (data) => {
      if (data.articleId && data.category) {
        setCategories(prev => ({ ...prev, [data.articleId]: data.category }));
        toast.success(`Article categorized as ${data.category.name || data.category}`);
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to categorize article');
    },
  });

  const detectDuplicatesMutation = useMutation({
    mutationFn: (data) => detectDuplicates(data),
    onSuccess: (data) => {
      if (data.duplicates) {
        setDuplicates(data.duplicates);
        toast.success(`Found ${data.duplicates.length} duplicate(s)`);
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to detect duplicates');
    },
  });

  const processArticlesMutation = useMutation({
    mutationFn: (articles) => processArticles(articles),
    onSuccess: (data) => {
      if (data.summaries) {
        setSummaries(prev => ({ ...prev, ...data.summaries }));
      }
      if (data.categories) {
        setCategories(prev => ({ ...prev, ...data.categories }));
      }
      if (data.duplicates) {
        setDuplicates(data.duplicates);
      }
      toast.success('Articles processed successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to process articles');
    },
  });

  const generateRecommendations = useCallback((articlesList) => {
    if (!Array.isArray(articlesList)) {
      return [];
    }
    return articlesList.slice(0, 20).map((article, index) => ({
      id: `rec-${article.id || index}`,
      article,
      score: Math.min(0.95, 0.6 + Math.random() * 0.4),
      reasons: [
        article.category ? `Matches category ${article.category}` : 'Relevant content',
        article.source ? `Popular from ${article.source}` : 'Trending source'
      ].filter(Boolean)
    }));
  }, []);

  const handleGenerateRecommendations = useCallback((articlesList = articles) => {
    const recs = generateRecommendations(articlesList);
    setRecommendations(recs);
  }, [articles, generateRecommendations]);

  useEffect(() => {
    if (articles.length > 0) {
      handleGenerateRecommendations(articles);
    } else {
      setRecommendations([]);
    }
  }, [articles, handleGenerateRecommendations]);

  useEffect(() => {
    loadArticles();
  }, []);

  useEffect(() => {
    // Update processing stats
    setProcessingStats({
      total: articles.length,
      processed: Object.keys({ ...summaries, ...categories }).length,
      recommendations: recommendations.length,
      duplicates: duplicates.length,
      summaries: Object.keys(summaries).length,
      categories: Object.keys(categories).length
    });
  }, [articles, recommendations, duplicates, summaries, categories]);

  const loadArticles = async () => {
    try {
      const data = await fetchNews();
      setArticles(data.articles || []);
    } catch (error) {
      console.error('Error loading articles:', error);
    }
  };

  const handleProcessAll = async () => {
    if (articles.length === 0) return;
    
    setLoading(true);
    processArticlesMutation.mutate(articles);
    setLoading(false);
  };

  const handleExportData = () => {
    const exportData = {
      articles: articles.length,
      recommendations: recommendations.length,
      duplicates: duplicates.length,
      summaries: Object.keys(summaries).length,
      categories: Object.keys(categories).length,
      settings: curationSettings,
      timestamp: new Date().toISOString()
    };

    const element = document.createElement('a');
    const file = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    element.href = URL.createObjectURL(file);
    element.download = `content_curation_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const getProcessingProgress = () => {
    if (processingStats.total === 0) return 0;
    return Math.round((processingStats.processed / processingStats.total) * 100);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5
      }
    }
  };

  const tabs = [
    { label: 'Smart Recommendations', icon: <TrendingUpIcon />, component: <SmartRecommendations articles={articles} recommendations={recommendations} onGenerateRecommendations={handleGenerateRecommendations} loading={articles.length > 0 && recommendations.length === 0} /> },
    { label: 'Duplicate Detection', icon: <CompareIcon />, component: <DuplicateDetection articles={articles} duplicates={duplicates} onDetectDuplicates={detectDuplicatesMutation} loading={detectDuplicatesMutation.isPending} /> },
    { label: 'Content Summarizer', icon: <SummarizeIcon />, component: <ContentSummarizer articles={articles} summaries={summaries} onSummarize={summarizeMutation} /> },
    { label: 'Auto Categorizer', icon: <CategoryIcon />, component: <AutoCategorizer articles={articles} categories={categories} onCategorize={categorizeMutation} /> }
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <Typography variant="h4" className="font-bold text-gray-900 dark:text-white mb-2">
              AI Content Curation
            </Typography>
            <Typography variant="body1" className="text-gray-600 dark:text-gray-400">
              Intelligent content processing, recommendations, and organization
            </Typography>
          </div>
          <div className="flex items-center space-x-2">
            <Tooltip title="Settings">
              <IconButton onClick={() => setSettingsOpen(true)}>
                <SettingsIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Refresh Data">
              <IconButton onClick={loadArticles}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<AutoAwesomeIcon />}
              onClick={handleProcessAll}
              disabled={loading || articles.length === 0}
            >
              Process All Articles
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleExportData}
            >
              Export Data
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Processing Overview */}
      <motion.div variants={itemVariants}>
        <Paper className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <Typography variant="h6" className="font-semibold text-gray-900 dark:text-white">
              Processing Overview
            </Typography>
            <Chip 
              label={`${getProcessingProgress()}% Complete`} 
              color={getProcessingProgress() === 100 ? 'success' : 'primary'} 
            />
          </div>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={2}>
              <Card className="text-center">
                <CardContent>
                  <Typography variant="h4" className="font-bold text-blue-600">
                    {processingStats.total}
                  </Typography>
                  <Typography variant="body2" className="text-gray-600 dark:text-gray-400">
                    Total Articles
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <Card className="text-center">
                <CardContent>
                  <Typography variant="h4" className="font-bold text-green-600">
                    {processingStats.recommendations}
                  </Typography>
                  <Typography variant="body2" className="text-gray-600 dark:text-gray-400">
                    Recommendations
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <Card className="text-center">
                <CardContent>
                  <Typography variant="h4" className="font-bold text-orange-600">
                    {processingStats.duplicates}
                  </Typography>
                  <Typography variant="body2" className="text-gray-600 dark:text-gray-400">
                    Duplicate Groups
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <Card className="text-center">
                <CardContent>
                  <Typography variant="h4" className="font-bold text-purple-600">
                    {processingStats.summaries}
                  </Typography>
                  <Typography variant="body2" className="text-gray-600 dark:text-gray-400">
                    Summaries
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <Card className="text-center">
                <CardContent>
                  <Typography variant="h4" className="font-bold text-indigo-600">
                    {processingStats.categories}
                  </Typography>
                  <Typography variant="body2" className="text-gray-600 dark:text-gray-400">
                    Categorized
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <Card className="text-center">
                <CardContent>
                  <Typography variant="h4" className="font-bold text-teal-600">
                    {Math.round((processingStats.processed / Math.max(processingStats.total, 1)) * 100)}%
                  </Typography>
                  <Typography variant="body2" className="text-gray-600 dark:text-gray-400">
                    Processed
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          {loading && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <Typography variant="body2" className="text-gray-600 dark:text-gray-400">
                  Processing articles...
                </Typography>
                <Typography variant="body2" className="text-gray-600 dark:text-gray-400">
                  {processingStats.processed} / {processingStats.total}
                </Typography>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${getProcessingProgress()}%` }}
                />
              </div>
            </div>
          )}
        </Paper>
      </motion.div>

      {/* Main Content */}
      <motion.div variants={itemVariants}>
        <Paper className="overflow-hidden">
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            className="border-b border-gray-200 dark:border-gray-700"
          >
            {tabs.map((tab, index) => (
              <Tab
                key={index}
                label={tab.label}
                icon={tab.icon}
                iconPosition="start"
                className="min-w-0"
              />
            ))}
          </Tabs>
          
          <div className="p-6">
            {tabs[tabValue]?.component}
          </div>
        </Paper>
      </motion.div>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Content Curation Settings</DialogTitle>
        <DialogContent>
          <div className="space-y-6">
            <div>
              <Typography variant="h6" className="font-semibold mb-4">
                General Settings
              </Typography>
              
              <div className="space-y-4">
                <FormControlLabel
                  control={
                    <Switch
                      checked={curationSettings.autoSummarize}
                      onChange={(e) => updateSettings({ autoSummarize: e.target.checked })}
                    />
                  }
                  label="Auto-summarize new articles"
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={curationSettings.autoCategorize}
                      onChange={(e) => updateSettings({ autoCategorize: e.target.checked })}
                    />
                  }
                  label="Auto-categorize new articles"
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={curationSettings.detectDuplicates}
                      onChange={(e) => updateSettings({ detectDuplicates: e.target.checked })}
                    />
                  }
                  label="Auto-detect duplicates"
                />
              </div>
            </div>
            
            <Divider />
            
            <div>
              <Typography variant="h6" className="font-semibold mb-4">
                Recommendation Settings
              </Typography>
              
              <div className="space-y-4">
                <div>
                  <Typography variant="subtitle2" className="mb-2">
                    Recommendation Threshold: {Math.round(curationSettings.recommendationThreshold * 100)}%
                  </Typography>
                  <Slider
                    value={curationSettings.recommendationThreshold}
                    onChange={(e, value) => updateSettings({ recommendationThreshold: value })}
                    min={0.1}
                    max={1}
                    step={0.1}
                    marks={[
                      { value: 0.1, label: '10%' },
                      { value: 0.5, label: '50%' },
                      { value: 1, label: '100%' }
                    ]}
                  />
                </div>
              </div>
            </div>
            
            <Divider />
            
            <div>
              <Typography variant="h6" className="font-semibold mb-4">
                Summary Settings
              </Typography>
              
              <div className="space-y-4">
                <div>
                  <Typography variant="subtitle2" className="mb-2">
                    Default Summary Length: {curationSettings.summaryLength}
                  </Typography>
                  <Slider
                    value={curationSettings.summaryLength === 'short' ? 1 : 
                           curationSettings.summaryLength === 'medium' ? 2 : 3}
                    onChange={(e, value) => {
                      const lengths = ['short', 'medium', 'long'];
                      updateSettings({ summaryLength: lengths[value - 1] });
                    }}
                    min={1}
                    max={3}
                    step={1}
                    marks={[
                      { value: 1, label: 'Short' },
                      { value: 2, label: 'Medium' },
                      { value: 3, label: 'Long' }
                    ]}
                  />
                </div>
              </div>
            </div>
            
            <Divider />
            
            <div>
              <Typography variant="h6" className="font-semibold mb-4">
                Category Settings
              </Typography>
              
              <div className="space-y-4">
                <div>
                  <Typography variant="subtitle2" className="mb-2">
                    Category Confidence: {Math.round(curationSettings.categoryConfidence * 100)}%
                  </Typography>
                  <Slider
                    value={curationSettings.categoryConfidence}
                    onChange={(e, value) => updateSettings({ categoryConfidence: value })}
                    min={0.5}
                    max={1}
                    step={0.1}
                    marks={[
                      { value: 0.5, label: '50%' },
                      { value: 0.7, label: '70%' },
                      { value: 1, label: '100%' }
                    ]}
                  />
                </div>
              </div>
            </div>
            
            <Alert severity="warning">
              <Typography variant="body2">
                These settings will apply to all future content processing. 
                Existing processed content will not be affected.
              </Typography>
            </Alert>
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Close</Button>
          <Button 
            onClick={() => {
              clearData();
              setSettingsOpen(false);
            }}
            color="error"
          >
            Clear All Data
          </Button>
        </DialogActions>
      </Dialog>
    </motion.div>
  );
};

export default ContentCuration;
