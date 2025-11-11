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
  Alert
} from '@mui/material';
import {
  Summarize as SummarizeIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
  ContentCopy as ContentCopyIcon,
  AutoAwesome as AutoAwesomeIcon,
  Speed as SpeedIcon,
  Article as ArticleIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { summarizeContent } from '../Services/api';

const ContentSummarizer = ({ articles = [], summaries = {}, onSummarize }) => {

  const [selectedArticle, setSelectedArticle] = useState(null);
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [summaryLength, setSummaryLength] = useState('medium');
  const [customLength, setCustomLength] = useState(150);
  const [summaryMode, setSummaryMode] = useState('auto'); // auto, extractive, abstractive
  const [filteredArticles, setFilteredArticles] = useState([]);
  const [filterSettings, setFilterSettings] = useState({
    hasSummary: 'all', // all, with, without
    minLength: 100,
    categories: []
  });

  useEffect(() => {
    if (!Array.isArray(articles)) {
      console.warn('ContentSummarizer: articles is not an array:', articles);
      setFilteredArticles([]);
      return;
    }

    let filtered = articles || [];
    
    if (filterSettings.hasSummary === 'with') {
      filtered = filtered.filter(article => summaries[article.id]);
    } else if (filterSettings.hasSummary === 'without') {
      filtered = filtered.filter(article => !summaries[article.id]);
    }
    
    filtered = filtered.filter(article => 
      (article.content || '').length >= filterSettings.minLength
    );
    
    if (filterSettings.categories.length > 0) {
      filtered = filtered.filter(article => 
        filterSettings.categories.includes(article.category)
      );
    }
    
    setFilteredArticles(filtered);
  }, [articles, summaries, filterSettings]);

  const handleSummarize = async (article) => {
    setSelectedArticle(article);
    setSummaryDialogOpen(true);
    
    if (!summaries[article.id] && onSummarize) {
      onSummarize.mutate({
        articleId: article.id,
        content: article.content || article.title,
        length: summaryLength
      });
    }
  };

  const handleBatchSummarize = async () => {
    const articlesToSummarize = filteredArticles.filter(article => !summaries[article.id]);
    
    if (onSummarize) {
      for (const article of articlesToSummarize) {
        onSummarize.mutate({
          articleId: article.id,
          content: article.content || article.title,
          length: summaryLength
        });
      }
    }
  };

  const handleCopySummary = (summary) => {
    navigator.clipboard.writeText(summary);
  };

  const handleDownloadSummary = (article, summary) => {
    const element = document.createElement('a');
    const file = new Blob([`${article.title}\n\n${summary}`], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${article.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_summary.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const getSummaryStats = () => {
    const total = Array.isArray(articles) ? articles.length : 0;
    const withSummaries = Object.keys(summaries).length;
    const withoutSummaries = total - withSummaries;
    
    return { total, withSummaries, withoutSummaries };
  };

  const getLengthLabel = (length) => {
    const labels = {
      'short': 'Short (1-2 sentences)',
      'medium': 'Medium (2-3 sentences)',
      'long': 'Long (3-5 sentences)',
      'custom': `Custom (${customLength} words)`
    };
    return labels[length] || length;
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

  const stats = getSummaryStats();

  return (
    <Card className="h-full">
      <CardHeader
        title={
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <SummarizeIcon className="text-purple-500" />
              <Typography variant="h6" className="font-bold text-gray-900 dark:text-white">
                AI Content Summarizer
              </Typography>
              <Chip 
                label={`${stats.withSummaries}/${stats.total}`} 
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
                onClick={handleBatchSummarize}
                disabled={loading || stats.withoutSummaries === 0}
                size="small"
              >
                Summarize All ({stats.withoutSummaries})
              </Button>
            </div>
          </div>
        }
        subheader="AI-powered content summarization and extraction"
      />
      
      <CardContent className="space-y-4">
        <Paper className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <div className="text-center">
                <Typography variant="h4" className="font-bold text-purple-600">
                  {stats.withSummaries}
                </Typography>
                <Typography variant="body2" className="text-gray-600 dark:text-gray-400">
                  Summarized
                </Typography>
              </div>
            </Grid>
            <Grid item xs={12} md={4}>
              <div className="text-center">
                <Typography variant="h4" className="font-bold text-orange-600">
                  {stats.withoutSummaries}
                </Typography>
                <Typography variant="body2" className="text-gray-600 dark:text-gray-400">
                  Pending
                </Typography>
              </div>
            </Grid>
            <Grid item xs={12} md={4}>
              <div className="text-center">
                <Typography variant="h4" className="font-bold text-green-600">
                  {Math.round((stats.withSummaries / stats.total) * 100)}%
                </Typography>
                <Typography variant="body2" className="text-gray-600 dark:text-gray-400">
                  Complete
                </Typography>
              </div>
            </Grid>
          </Grid>
        </Paper>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <CircularProgress />
            <Typography variant="body2" className="ml-2 text-gray-600 dark:text-gray-400">
              Generating summaries...
            </Typography>
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="text-center py-8">
            <ArticleIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <Typography variant="body1" className="text-gray-600 dark:text-gray-400">
              No articles available for summarization
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
              {filteredArticles.map((article, index) => (
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
                        <Chip 
                          label={article.category} 
                          size="small" 
                          color="primary" 
                        />
                        <Chip 
                          label={`${(article.content || '').length} chars`} 
                          size="small" 
                          color="info" 
                        />
                        {summaries[article.id] && (
                          <Chip 
                            label="Summarized" 
                            size="small" 
                            color="success" 
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
                        <Tooltip title="Summarize">
                          <Button
                            size="small"
                            variant={summaries[article.id] ? "outlined" : "contained"}
                            startIcon={<SummarizeIcon />}
                            onClick={() => handleSummarize(article)}
                            disabled={loading}
                          >
                            {summaries[article.id] ? 'View' : 'Summarize'}
                          </Button>
                        </Tooltip>
                        {summaries[article.id] && (
                          <>
                            <Tooltip title="Copy Summary">
                              <IconButton
                                size="small"
                                onClick={() => handleCopySummary(summaries[article.id])}
                              >
                                <ContentCopyIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Download Summary">
                              <IconButton
                                size="small"
                                onClick={() => handleDownloadSummary(article, summaries[article.id])}
                              >
                                <DownloadIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {summaries[article.id] && (
                    <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <Typography variant="subtitle2" className="font-semibold mb-2 text-gray-900 dark:text-white">
                        AI Summary:
                      </Typography>
                      <Typography variant="body2" className="text-gray-700 dark:text-gray-300">
                        {summaries[article.id]}
                      </Typography>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </CardContent>

      <Dialog open={summaryDialogOpen} onClose={() => setSummaryDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Content Summary</DialogTitle>
        <DialogContent>
          {selectedArticle && (
            <div className="space-y-4">
              <Typography variant="h6" className="font-semibold">
                {selectedArticle.title}
              </Typography>
              
              <Divider />
              
              <div className="space-y-3">
                <Typography variant="subtitle2" className="font-semibold">
                  Summary Settings:
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Summary Length</InputLabel>
                      <Select
                        value={summaryLength}
                        onChange={(e) => setSummaryLength(e.target.value)}
                      >
                        <MenuItem value="short">Short (1-2 sentences)</MenuItem>
                        <MenuItem value="medium">Medium (2-3 sentences)</MenuItem>
                        <MenuItem value="long">Long (3-5 sentences)</MenuItem>
                        <MenuItem value="custom">Custom</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Summary Mode</InputLabel>
                      <Select
                        value={summaryMode}
                        onChange={(e) => setSummaryMode(e.target.value)}
                      >
                        <MenuItem value="auto">Auto (AI decides)</MenuItem>
                        <MenuItem value="extractive">Extractive (Key phrases)</MenuItem>
                        <MenuItem value="abstractive">Abstractive (New text)</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
                
                {summaryLength === 'custom' && (
                  <div className="mt-4">
                    <Typography variant="body2" className="mb-2">
                      Target Word Count: {customLength}
                    </Typography>
                    <Slider
                      value={customLength}
                      onChange={(e, value) => setCustomLength(value)}
                      min={50}
                      max={500}
                      step={10}
                      marks={[
                        { value: 50, label: '50' },
                        { value: 250, label: '250' },
                        { value: 500, label: '500' }
                      ]}
                    />
                  </div>
                )}
              </div>
              
              {summaries[selectedArticle.id] && (
                <div className="mt-4">
                  <Typography variant="subtitle2" className="font-semibold mb-2">
                    Generated Summary:
                  </Typography>
                  <Paper className="p-3 bg-gray-50 dark:bg-gray-800">
                    <Typography variant="body1" className="text-gray-800 dark:text-gray-200">
                      {summaries[selectedArticle.id]}
                    </Typography>
                  </Paper>
                </div>
              )}
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSummaryDialogOpen(false)}>Close</Button>
          <Button 
            onClick={() => {
              if (selectedArticle) {
                handleSummarize(selectedArticle);
              }
            }}
            variant="contained"
            disabled={loading}
          >
            {summaries[selectedArticle?.id] ? 'Regenerate' : 'Generate'} Summary
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Summarization Settings</DialogTitle>
        <DialogContent>
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
            
            <div>
              <Typography variant="subtitle2" className="mb-2">
                Default Summary Length: {getLengthLabel(curationSettings.summaryLength)}
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default ContentSummarizer;
