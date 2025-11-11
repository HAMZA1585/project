import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  Chip,
  Box,
  IconButton,
  Tooltip,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  FormControlLabel,
  Slider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid
} from '@mui/material';
import {
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  TrendingUp as TrendingUpIcon,
  Star as StarIcon,
  Bookmark as BookmarkIcon,
  Share as ShareIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

const SmartRecommendations = ({ articles = [], recommendations = [], onGenerateRecommendations, loading = false }) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userFeedback, setUserFeedback] = useState({});
  const [filteredRecommendations, setFilteredRecommendations] = useState(recommendations || []);
  const [filterSettings, setFilterSettings] = useState({
    minScore: 0.5,
    categories: [],
    sources: [],
    timeRange: 'all'
  });

  useEffect(() => {
    if ((!recommendations || recommendations.length === 0) && typeof onGenerateRecommendations === 'function' && articles.length > 0) {
      onGenerateRecommendations(articles);
    }
  }, [articles, recommendations, onGenerateRecommendations]);

  useEffect(() => {
    let filtered = recommendations || [];
    filtered = filtered.filter(rec => rec.score >= filterSettings.minScore);
    if (filterSettings.categories.length > 0) {
      filtered = filtered.filter(rec => filterSettings.categories.includes(rec.article?.category));
    }
    if (filterSettings.sources.length > 0) {
      filtered = filtered.filter(rec => filterSettings.sources.includes(rec.article?.source));
    }
    if (filterSettings.timeRange !== 'all') {
      const now = new Date();
      const timeRanges = {
        '1h': 1 * 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000
      };
      if (timeRanges[filterSettings.timeRange]) {
        const cutoff = new Date(now.getTime() - timeRanges[filterSettings.timeRange]);
        filtered = filtered.filter(rec => rec.article?.date ? new Date(rec.article.date) >= cutoff : true);
      }
    }
    setFilteredRecommendations(filtered);
  }, [recommendations, filterSettings]);

  const handleFeedback = (recommendationId, feedback) => {
    setUserFeedback(prev => ({
      ...prev,
      [recommendationId]: feedback
    }));
  };

  const uniqueSources = useMemo(() => (
    Array.from(new Set((recommendations || []).map(rec => rec.article?.source).filter(Boolean)))
  ), [recommendations]);

  const getScoreColor = (score) => {
    if (score >= 0.8) return 'success';
    if (score >= 0.6) return 'warning';
    return 'error';
  };

  const getScoreLabel = (score) => {
    if (score >= 0.8) return 'Excellent';
    if (score >= 0.6) return 'Good';
    if (score >= 0.4) return 'Fair';
    return 'Poor';
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

  return (
    <Card className="h-full">
      <CardHeader
        title={
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingUpIcon className="text-blue-500" />
              <Typography variant="h6" className="font-bold text-gray-900 dark:text-white">
                Smart Recommendations
              </Typography>
              <Chip 
                label={`${filteredRecommendations.length} items`} 
                size="small" 
                color="primary" 
              />
            </div>
            <div className="flex items-center space-x-2">
              <Tooltip title="Filter Recommendations">
                <IconButton onClick={() => setSettingsOpen(true)}>
                  <FilterIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Refresh Recommendations">
                <IconButton onClick={() => onGenerateRecommendations?.(articles)}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </div>
          </div>
        }
        subheader="AI-powered content recommendations based on your preferences"
      />
      
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <CircularProgress />
            <Typography variant="body2" className="ml-2 text-gray-600 dark:text-gray-400">
              Generating recommendations...
            </Typography>
          </div>
        ) : filteredRecommendations.length === 0 ? (
          <div className="text-center py-8">
            <StarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <Typography variant="body1" className="text-gray-600 dark:text-gray-400">
              No recommendations available
            </Typography>
            <Typography variant="body2" className="text-gray-500 dark:text-gray-500">
              Try adjusting your filter settings or refresh the data
            </Typography>
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            <AnimatePresence>
              {filteredRecommendations.map((recommendation, index) => (
                <motion.div
                  key={recommendation.id || index}
                  variants={itemVariants}
                  layout
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <Typography 
                        variant="h6" 
                        className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2"
                      >
                        {recommendation.article?.title}
                      </Typography>
                      
                      <div className="flex items-center space-x-2 mb-2">
                        {recommendation.article?.source && (
                          <Chip 
                            label={recommendation.article.source} 
                            size="small" 
                            variant="outlined" 
                          />
                        )}
                        {recommendation.article?.category && (
                          <Chip 
                            label={recommendation.article.category} 
                            size="small" 
                            color="primary" 
                          />
                        )}
                        <Chip 
                          label={getScoreLabel(recommendation.score)} 
                          size="small" 
                          color={getScoreColor(recommendation.score)}
                        />
                      </div>
                      
                      <Typography 
                        variant="body2" 
                        className="text-gray-600 dark:text-gray-400 line-clamp-2"
                      >
                        {recommendation.article?.content}
                      </Typography>
                    </div>
                    
                    <div className="flex flex-col items-end space-y-2 ml-4">
                      <div className="text-right">
                        <Typography variant="h6" className="font-bold text-blue-600">
                          {(recommendation.score * 100).toFixed(0)}%
                        </Typography>
                        <Typography variant="caption" className="text-gray-500">
                          Match Score
                        </Typography>
                      </div>
                      
                      <div className="flex space-x-1">
                        <Tooltip title="Like">
                          <IconButton
                            size="small"
                            color={userFeedback[recommendation.id] === 'like' ? 'primary' : 'default'}
                            onClick={() => handleFeedback(recommendation.id, 'like')}
                          >
                            <ThumbUpIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Dislike">
                          <IconButton
                            size="small"
                            color={userFeedback[recommendation.id] === 'dislike' ? 'error' : 'default'}
                            onClick={() => handleFeedback(recommendation.id, 'dislike')}
                          >
                            <ThumbDownIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Bookmark">
                          <IconButton size="small">
                            <BookmarkIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Share">
                          <IconButton size="small">
                            <ShareIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                  
                  {recommendation.reasons && recommendation.reasons.length > 0 && (
                    <div className="mt-3">
                      <Typography variant="caption" className="text-gray-500 font-medium">
                        Why recommended:
                      </Typography>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {recommendation.reasons.map((reason, idx) => (
                          <Chip
                            key={idx}
                            label={reason}
                            size="small"
                            variant="outlined"
                            className="text-xs"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </CardContent>

      {/* Filter Settings Dialog */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Filter Recommendations</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} className="mt-2">
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" className="mb-2">
                Minimum Score: {(filterSettings.minScore * 100).toFixed(0)}%
              </Typography>
              <Slider
                value={filterSettings.minScore}
                onChange={(e, value) => setFilterSettings(prev => ({ ...prev, minScore: value }))}
                min={0}
                max={1}
                step={0.1}
                marks={[
                  { value: 0, label: '0%' },
                  { value: 0.5, label: '50%' },
                  { value: 1, label: '100%' }
                ]}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="Time Range"
                value={filterSettings.timeRange}
                onChange={(e) => setFilterSettings(prev => ({ ...prev, timeRange: e.target.value }))}
                SelectProps={{ native: true }}
              >
                <option value="all">All Time</option>
                <option value="1h">Last Hour</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Close</Button>
          <Button 
            onClick={() => setSettingsOpen(false)} 
            variant="contained"
          >
            Apply Filters
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default SmartRecommendations;
