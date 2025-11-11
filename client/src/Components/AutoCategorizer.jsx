import React, { useState, useEffect } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  FormControlLabel,
  Slider,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress
} from '@mui/material';
import {
  Category as CategoryIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  AutoAwesome as AutoAwesomeIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { categorizeContent } from '../Services/api';

const AutoCategorizer = ({ articles = [], categories = {}, onCategorize }) => {

  const [editingCategory, setEditingCategory] = useState(null);
  const [tempCategory, setTempCategory] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [filteredArticles, setFilteredArticles] = useState([]);
  const [filterSettings, setFilterSettings] = useState({
    hasCategory: 'all', // all, with, without, uncertain
    confidence: 0.5,
    categories: []
  });
  const [categoryStats, setCategoryStats] = useState({});

  const predefinedCategories = [
    'Technology', 'Business', 'Politics', 'Health', 'Sports', 'Entertainment',
    'Science', 'World News', 'Economy', 'Environment', 'Education', 'Crime',
    'Weather', 'Travel', 'Food', 'Lifestyle', 'Automotive', 'Real Estate'
  ];

  useEffect(() => {
    // Filter articles based on current settings
    let filtered = articles || [];
    
    // Filter by category status
    if (filterSettings.hasCategory === 'with') {
      filtered = filtered.filter(article => categories[article.id]);
    } else if (filterSettings.hasCategory === 'without') {
      filtered = filtered.filter(article => !categories[article.id]);
    } else if (filterSettings.hasCategory === 'uncertain') {
      filtered = filtered.filter(article => 
        categories[article.id] && categories[article.id].confidence < 0.7
      );
    }
    
    // Filter by confidence
    filtered = filtered.filter(article => {
      const category = categories[article.id];
      return !category || category.confidence >= filterSettings.confidence;
    });
    
    // Filter by specific categories
    if (filterSettings.categories.length > 0) {
      filtered = filtered.filter(article => {
        const category = categories[article.id];
        return category && filterSettings.categories.includes(category.name);
      });
    }
    
    setFilteredArticles(filtered);
  }, [articles, categories, filterSettings]);

  useEffect(() => {
    // Calculate category statistics
    const stats = {};
    Object.values(categories).forEach(category => {
      if (category && category.name) {
        stats[category.name] = (stats[category.name] || 0) + 1;
      }
    });
    setCategoryStats(stats);
  }, [categories]);

  const handleCategorize = async (article) => {
    if (onCategorize) {
      onCategorize.mutate({ 
        articleId: article.id, 
        content: article.content || article.title 
      });
    }
  };

  const handleBatchCategorize = async () => {
    const articlesToCategorize = filteredArticles.filter(article => !categories[article.id]);
    
    if (onCategorize) {
      for (const article of articlesToCategorize) {
        onCategorize.mutate({ 
          articleId: article.id, 
          content: article.content || article.title 
        });
      }
    }
  };

  const handleEditCategory = (articleId, currentCategory) => {
    setEditingCategory(articleId);
    setTempCategory(currentCategory?.name || '');
  };

  const handleSaveCategory = (articleId) => {
    // In a real app, you'd update the category in the backend
    console.log('Saving category:', { articleId, category: tempCategory });
    setEditingCategory(null);
    setTempCategory('');
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setTempCategory('');
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.6) return 'warning';
    return 'error';
  };

  const getConfidenceLabel = (confidence) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
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

  const getCategoryStats = () => {
    const total = articles.length;
    const withCategories = Object.keys(categories).length;
    const withoutCategories = total - withCategories;
    const highConfidence = Object.values(categories).filter(cat => 
      cat && cat.confidence >= 0.8
    ).length;
    
    return { total, withCategories, withoutCategories, highConfidence };
  };

  const stats = getCategoryStats();

  return (
    <Card className="h-full">
      <CardHeader
        title={
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CategoryIcon className="text-green-500" />
              <Typography variant="h6" className="font-bold text-gray-900 dark:text-white">
                Auto Categorizer
              </Typography>
              <Chip 
                label={`${stats.withCategories}/${stats.total}`} 
                size="small" 
                color="primary" 
              />
            </div>
            <div className="flex items-center space-x-2">
              <Tooltip title="Settings">
                <IconButton onClick={() => setSettingsOpen(true)}>
                  <SettingsIcon />
                </IconButton>
              </Tooltip>
              <Button
                variant="contained"
                startIcon={<AutoAwesomeIcon />}
                onClick={handleBatchCategorize}
                disabled={loading || stats.withoutCategories === 0}
                size="small"
              >
                Categorize All ({stats.withoutCategories})
              </Button>
            </div>
          </div>
        }
        subheader="AI-powered automatic content categorization"
      />
      
      <CardContent className="space-y-4">
        {/* Category Statistics */}
        <Paper className="p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20">
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 3 }}>
              <div className="text-center">
                <Typography variant="h4" className="font-bold text-green-600">
                  {stats.withCategories}
                </Typography>
                <Typography variant="body2" className="text-gray-600 dark:text-gray-400">
                  Categorized
                </Typography>
              </div>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <div className="text-center">
                <Typography variant="h4" className="font-bold text-orange-600">
                  {stats.withoutCategories}
                </Typography>
                <Typography variant="body2" className="text-gray-600 dark:text-gray-400">
                  Pending
                </Typography>
              </div>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <div className="text-center">
                <Typography variant="h4" className="font-bold text-blue-600">
                  {stats.highConfidence}
                </Typography>
                <Typography variant="body2" className="text-gray-600 dark:text-gray-400">
                  High Confidence
                </Typography>
              </div>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <div className="text-center">
                <Typography variant="h4" className="font-bold text-purple-600">
                  {Object.keys(categoryStats).length}
                </Typography>
                <Typography variant="body2" className="text-gray-600 dark:text-gray-400">
                  Categories
                </Typography>
              </div>
            </Grid>
          </Grid>
        </Paper>

        {/* Category Distribution */}
        {Object.keys(categoryStats).length > 0 && (
          <Paper className="p-4">
            <Typography variant="subtitle1" className="font-semibold mb-3">
              Category Distribution
            </Typography>
            <div className="space-y-2">
              {Object.entries(categoryStats)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 8)
                .map(([category, count]) => (
                  <div key={category} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Chip label={category} size="small" color="primary" />
                      <Typography variant="body2" className="text-gray-600 dark:text-gray-400">
                        {count} articles
                      </Typography>
                    </div>
                    <div className="w-32">
                      <LinearProgress 
                        variant="determinate" 
                        value={(count / Math.max(...Object.values(categoryStats))) * 100}
                        className="h-2"
                      />
                    </div>
                  </div>
                ))}
            </div>
          </Paper>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <CircularProgress />
            <Typography variant="body2" className="ml-2 text-gray-600 dark:text-gray-400">
              Categorizing articles...
            </Typography>
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="text-center py-8">
            <CategoryIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <Typography variant="body1" className="text-gray-600 dark:text-gray-400">
              No articles available for categorization
            </Typography>
            <Typography variant="body2" className="text-gray-500 dark:text-gray-500">
              Try adjusting your filter settings
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
              {filteredArticles.map((article, index) => {
                const category = categories[article.id];
                const isEditing = editingCategory === article.id;
                
                return (
                  <motion.div
                    key={article.id}
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
                          {article.title}
                        </Typography>
                        
                        <div className="flex items-center space-x-2 mb-2">
                          <Chip 
                            label={article.source} 
                            size="small" 
                            variant="outlined" 
                          />
                          {category && (
                            <Chip 
                              label={category.name} 
                              size="small" 
                              color="primary" 
                            />
                          )}
                          {category && (
                            <Chip 
                              label={`${getConfidenceLabel(category.confidence)} (${Math.round(category.confidence * 100)}%)`}
                              size="small" 
                              color={getConfidenceColor(category.confidence)}
                            />
                          )}
                        </div>
                        
                        <Typography 
                          variant="body2" 
                          className="text-gray-600 dark:text-gray-400 line-clamp-2"
                        >
                          {article.content}
                        </Typography>
                      </div>
                      
                      <div className="flex flex-col items-end space-y-2 ml-4">
                        <div className="flex space-x-1">
                          {!category ? (
                            <Button
                              size="small"
                              variant="contained"
                              startIcon={<CategoryIcon />}
                              onClick={() => handleCategorize(article)}
                              disabled={loading}
                            >
                              Categorize
                            </Button>
                          ) : (
                            <div className="flex space-x-1">
                              <Tooltip title="Edit Category">
                                <IconButton
                                  size="small"
                                  onClick={() => handleEditCategory(article.id, category)}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<CategoryIcon />}
                                onClick={() => handleCategorize(article)}
                                disabled={loading}
                              >
                                Re-categorize
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {isEditing && (
                      <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <FormControl size="small" className="flex-1">
                            <InputLabel>Category</InputLabel>
                            <Select
                              value={tempCategory}
                              onChange={(e) => setTempCategory(e.target.value)}
                              label="Category"
                            >
                              {predefinedCategories.map(cat => (
                                <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleSaveCategory(article.id)}
                          >
                            <SaveIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={handleCancelEdit}
                          >
                            <CancelIcon fontSize="small" />
                          </IconButton>
                        </div>
                      </div>
                    )}
                    
                    {category && category.reasons && (
                      <div className="mt-3">
                        <Typography variant="caption" className="text-gray-500 font-medium">
                          AI Reasoning:
                        </Typography>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {category.reasons.map((reason, idx) => (
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
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </CardContent>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Categorization Settings</DialogTitle>
        <DialogContent>
          <div className="space-y-4">
            <FormControlLabel
              control={
                <Switch
                  checked={curationSettings.autoCategorize}
                  onChange={(e) => dispatch(updateSettings({ autoCategorize: e.target.checked }))}
                />
              }
              label="Auto-categorize new articles"
            />
            
            <div>
              <Typography variant="subtitle2" className="mb-2">
                Minimum Confidence: {Math.round(curationSettings.categoryConfidence * 100)}%
              </Typography>
              <Slider
                value={curationSettings.categoryConfidence}
                onChange={(e, value) => dispatch(updateSettings({ categoryConfidence: value }))}
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
            
            <Alert severity="info">
              <Typography variant="body2">
                Lower confidence thresholds will categorize more articles but may be less accurate.
              </Typography>
            </Alert>
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default AutoCategorizer;
