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
  CompareArrows as CompareIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  ExpandMore as ExpandMoreIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

const DuplicateDetection = ({ articles = [], duplicates = [], onDetectDuplicates, loading = false }) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [filteredDuplicates, setFilteredDuplicates] = useState([]);
  const [filterSettings, setFilterSettings] = useState({
    confidence: 0.8,
    showReviewed: false,
    sources: []
  });
  const [selection, setSelection] = useState({});
  const [selectedDuplicates, setSelectedDuplicates] = useState([]);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [mergePreview, setMergePreview] = useState(null);
  const [analysisStats, setAnalysisStats] = useState({
    totalDuplicates: 0,
    highConfidencePairs: 0,
    crossSourcePairs: 0,
    potentialOriginals: 0
  });

  useEffect(() => {
    if (!duplicates || duplicates.length === 0) {
      setFilteredDuplicates([]);
      setSelection({});
      return;
    }

    let filtered = duplicates;
    if (!filterSettings.showReviewed) {
      filtered = filtered.filter(dup => !dup.reviewed);
    }
    filtered = filtered.filter(dup => dup.confidence >= filterSettings.confidence);
    if (filterSettings.sources.length > 0) {
      filtered = filtered.filter(dup =>
        filterSettings.sources.includes(dup.original.source) ||
        filterSettings.sources.includes(dup.duplicate.source)
      );
    }
    setFilteredDuplicates(filtered);

    const newSelection = {};
    filtered.forEach(dup => {
      newSelection[dup.id] = selection[dup.id] || false;
    });
    setSelection(newSelection);
  }, [duplicates, filterSettings]);

  useEffect(() => {
    if (!duplicates || duplicates.length === 0) {
      setAnalysisStats({
        totalDuplicates: 0,
        highConfidencePairs: 0,
        crossSourcePairs: 0,
        potentialOriginals: 0
      });
      return;
    }

    const stats = {
      totalDuplicates: duplicates.length,
      highConfidencePairs: duplicates.filter(dup => dup.confidence >= 0.9).length,
      crossSourcePairs: duplicates.filter(dup => dup.original.source !== dup.duplicate.source).length,
      potentialOriginals: duplicates.filter(dup => dup.isOriginalCandidate).length
    };

    setAnalysisStats(stats);
  }, [duplicates]);

  const toggleSelection = (id) => {
    setSelection(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const selectAll = (value) => {
    const newSelection = {};
    filteredDuplicates.forEach(dup => {
      newSelection[dup.id] = value;
    });
    setSelection(newSelection);
  };

  const handleApplyFilters = (newFilters) => {
    setFilterSettings(newFilters);
    setSettingsOpen(false);
  };

  const handleMergeSelection = () => {
    const selectedPairs = filteredDuplicates.filter(dup => selection[dup.id]);
    if (selectedPairs.length === 0) {
      setMergePreview(null);
      return;
    }

    const mergedTitles = selectedPairs.map(dup => (
      `${dup.original.title} \n⬇\n${dup.duplicate.title}`
    )).join('\n\n');

    setMergePreview({
      mergedTitles,
      count: selectedPairs.length
    });
    setSelectedDuplicates(selectedPairs);
    setMergeDialogOpen(true);
  };

  const handleConfirmMerge = () => {
    // Placeholder for merge logic
    setMergeDialogOpen(false);
  };

  const exportDuplicates = () => {
    const data = filteredDuplicates.map(dup => ({
      original: dup.original,
      duplicate: dup.duplicate,
      confidence: dup.confidence,
      detected_at: dup.detected_at
    }));

    const element = document.createElement('a');
    const file = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    element.href = URL.createObjectURL(file);
    element.download = `duplicate_report_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const uniqueSources = Array.from(new Set((duplicates || []).flatMap(dup => [
    dup.original.source,
    dup.duplicate.source
  ]))).filter(Boolean);

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
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <motion.div variants={itemVariants}>
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <Typography variant="h5" className="font-semibold text-gray-900 dark:text-white">
                Duplicate Detection
              </Typography>
              <Typography variant="body2" className="text-gray-600 dark:text-gray-400 mt-1">
                Identify similar and duplicate articles across sources
              </Typography>
            </div>
            <div className="flex items-center space-x-2">
              <Tooltip title="Refresh Detection">
                <IconButton onClick={() => onDetectDuplicates?.mutate(articles)} disabled={loading}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Detection Settings">
                <IconButton onClick={() => setSettingsOpen(true)}>
                  <SettingsIcon />
                </IconButton>
              </Tooltip>
            </div>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <CircularProgress />
                <Typography variant="body2" className="ml-2 text-gray-600 dark:text-gray-400">
                  Detecting duplicates...
                </Typography>
              </div>
            ) : duplicates.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <Typography variant="body1" className="text-gray-600 dark:text-gray-400">
                  No duplicates found
                </Typography>
                <Typography variant="body2" className="text-gray-500 dark:text-gray-500">
                  All articles appear to be unique
                </Typography>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <FormControlLabel
                    control={
                      <Switch
                        checked={Object.values(selection).every(Boolean)}
                        indeterminate={Object.values(selection).some(Boolean) && !Object.values(selection).every(Boolean)}
                        onChange={(e) => selectAll(e.target.checked)}
                      />
                    }
                    label="Select All"
                  />
                  <Typography variant="body2" className="text-gray-600 dark:text-gray-400">
                    {Object.values(selection).filter(Boolean).length} of {filteredDuplicates.length} groups selected
                  </Typography>
                </div>

                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="space-y-4"
                >
                  <AnimatePresence>
                    {filteredDuplicates.map((group, index) => (
                      <motion.div
                        key={group.id}
                        variants={itemVariants}
                        layout
                      >
                        <Accordion className="border border-gray-200 dark:border-gray-700">
                          <AccordionSummary
                            expandIcon={<ExpandMoreIcon />}
                            className="bg-gray-50 dark:bg-gray-800"
                          >
                            <div className="flex items-center justify-between w-full mr-4">
                              <div className="flex items-center space-x-3">
                                <FormControlLabel
                                  control={
                                    <Switch
                                      checked={selection[group.id]}
                                      onChange={() => toggleSelection(group.id)}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  }
                                  label=""
                                />
                                <div>
                                  <Typography variant="subtitle1" className="font-semibold">
                                    Duplicate Group #{index + 1}
                                  </Typography>
                                  <Typography variant="body2" className="text-gray-600 dark:text-gray-400">
                                    {group.articles.length} similar articles
                                  </Typography>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Chip
                                  label={`${group.confidence}% similar`}
                                  size="small"
                                  color={group.confidence >= 80 ? 'error' : group.confidence >= 60 ? 'warning' : 'info'}
                                />
                                <Button
                                  size="small"
                                  startIcon={<ExpandMoreIcon />}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // handleMergeGroup(group); // This function is removed
                                  }}
                                >
                                  Merge
                                </Button>
                              </div>
                            </div>
                          </AccordionSummary>
                          
                          <AccordionDetails>
                            <div className="space-y-3">
                              {group.articles.map((article, articleIndex) => (
                                <Paper
                                  key={article.id}
                                  className="p-3 border border-gray-200 dark:border-gray-700"
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <Typography 
                                        variant="h6" 
                                        className="font-semibold text-gray-900 dark:text-white mb-2"
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
                                        <Typography variant="caption" className="text-gray-500">
                                          {new Date(article.publishedAt).toLocaleDateString()}
                                        </Typography>
                                      </div>
                                      
                                      <Typography 
                                        variant="body2" 
                                        className="text-gray-600 dark:text-gray-400 line-clamp-2"
                                      >
                                        {article.content}
                                      </Typography>
                                    </div>
                                    
                                    <div className="flex flex-col items-end space-y-2 ml-4">
                                      {articleIndex > 0 && (
                                        <Chip
                                          label={`${group.articles[0].confidence}% similar`}
                                          size="small"
                                          color={group.articles[0].confidence >= 80 ? 'error' : group.articles[0].confidence >= 60 ? 'warning' : 'info'}
                                        />
                                      )}
                                      <div className="flex space-x-1">
                                        <Tooltip title="View Original">
                                          <IconButton size="small">
                                            {/* ContentCopyIcon */}
                                          </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Delete">
                                          <IconButton size="small" color="error">
                                            {/* DeleteIcon */}
                                          </IconButton>
                                        </Tooltip>
                                      </div>
                                    </div>
                                  </div>
                                </Paper>
                              ))}
                            </div>
                          </AccordionDetails>
                        </Accordion>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              </>
            )}
          </CardContent>

          {/* Merge Dialog */}
          <Dialog open={mergeDialogOpen} onClose={() => setMergeDialogOpen(false)} maxWidth="md" fullWidth>
            <DialogTitle>Merge Duplicate Articles</DialogTitle>
            <DialogContent>
              {selectedDuplicates.length > 0 && (
                <div className="space-y-4">
                  <Alert severity="warning" className="mb-4">
                    <Typography variant="body2">
                      You are about to merge {selectedDuplicates.length} duplicate articles. 
                      This action cannot be undone.
                    </Typography>
                  </Alert>
                  
                  <Typography variant="subtitle1" className="font-semibold mb-2">
                    Merge Preview:
                  </Typography>
                  <Paper className="p-3 border border-gray-200 dark:border-gray-700">
                    <Typography variant="body2" className="text-gray-600 dark:text-gray-400">
                      {mergePreview?.mergedTitles}
                    </Typography>
                    <Typography variant="body2" className="text-gray-500 dark:text-gray-500 mt-2">
                      ({mergePreview?.count} articles)
                    </Typography>
                  </Paper>

                  <Typography variant="subtitle1" className="font-semibold mb-2">
                    Merge Strategy:
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <Paper 
                        className={`p-3 cursor-pointer border-2 ${
                          // mergeStrategy === 'best' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                          'border-gray-200' // Placeholder for strategy selection
                        }`}
                        // onClick={() => setMergeStrategy('best')}
                      >
                        <Typography variant="subtitle2" className="font-semibold">
                          Best Quality
                        </Typography>
                        <Typography variant="body2" className="text-gray-600">
                          Keep the article with highest quality score
                        </Typography>
                      </Paper>
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <Paper 
                        className={`p-3 cursor-pointer border-2 ${
                          // mergeStrategy === 'latest' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                          'border-gray-200' // Placeholder for strategy selection
                        }`}
                        // onClick={() => setMergeStrategy('latest')}
                      >
                        <Typography variant="subtitle2" className="font-semibold">
                          Latest
                        </Typography>
                        <Typography variant="body2" className="text-gray-600">
                          Keep the most recently published article
                        </Typography>
                      </Paper>
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <Paper 
                        className={`p-3 cursor-pointer border-2 ${
                          // mergeStrategy === 'custom' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                          'border-gray-200' // Placeholder for strategy selection
                        }`}
                        // onClick={() => setMergeStrategy('custom')}
                      >
                        <Typography variant="subtitle2" className="font-semibold">
                          Custom
                        </Typography>
                        <Typography variant="body2" className="text-gray-600">
                          Manually select which article to keep
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </div>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setMergeDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleConfirmMerge} 
                variant="contained"
                color="primary"
              >
                Merge Articles
              </Button>
            </DialogActions>
          </Dialog>

          {/* Settings Dialog */}
          <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle>Detection Settings</DialogTitle>
            <DialogContent>
              <Grid container spacing={2} className="mb-4">
                <Grid item xs={12}>
                  <Typography variant="subtitle1" className="font-semibold">
                    Confidence Threshold: {filterSettings.confidence * 100}%
                  </Typography>
                  <Slider
                    value={filterSettings.confidence}
                    onChange={(event, newValue) => setFilterSettings(prev => ({ ...prev, confidence: newValue / 100 }))}
                    valueLabelDisplay="auto"
                    min={0}
                    max={1}
                    step={0.01}
                    marks={[
                      { value: 0, label: '0%' },
                      { value: 1, label: '100%' },
                    ]}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={filterSettings.showReviewed}
                        onChange={(e) => setFilterSettings(prev => ({ ...prev, showReviewed: e.target.checked }))}
                      />
                    }
                    label="Show only reviewed duplicates"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle1" className="font-semibold">
                    Sources to Include:
                  </Typography>
                  <Select
                    multiple
                    value={filterSettings.sources}
                    onChange={(e) => setFilterSettings(prev => ({ ...prev, sources: e.target.value }))}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} />
                        ))}
                      </Box>
                    )}
                    MenuProps={{
                      PaperProps: {
                        style: {
                          maxHeight: 200,
                          width: 250,
                        },
                      },
                    }}
                  >
                    {uniqueSources.map((source) => (
                      <MenuItem key={source} value={source}>
                        {source}
                      </MenuItem>
                    ))}
                  </Select>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSettingsOpen(false)}>Cancel</Button>
              <Button onClick={() => handleApplyFilters(filterSettings)} variant="contained">
                Apply Filters
              </Button>
            </DialogActions>
          </Dialog>

          {/* Analysis Stats */}
          <Paper className="p-4 border border-gray-200 dark:border-gray-700">
            <Typography variant="h6" className="font-semibold text-gray-900 dark:text-white mb-2">
              Analysis Stats
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText primary="Total Duplicates" secondary={analysisStats.totalDuplicates} />
              </ListItem>
              <ListItem>
                <ListItemText primary="High Confidence Pairs" secondary={analysisStats.highConfidencePairs} />
              </ListItem>
              <ListItem>
                <ListItemText primary="Cross-Source Pairs" secondary={analysisStats.crossSourcePairs} />
              </ListItem>
              <ListItem>
                <ListItemText primary="Potential Originals" secondary={analysisStats.potentialOriginals} />
              </ListItem>
            </List>
            <LinearProgress variant="determinate" value={analysisStats.totalDuplicates > 0 ? (analysisStats.highConfidencePairs / analysisStats.totalDuplicates) * 100 : 0} />
          </Paper>

          {/* Export Button */}
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={exportDuplicates}
            disabled={filteredDuplicates.length === 0}
          >
            Export Duplicates
          </Button>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default DuplicateDetection;
