import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Box,
  Typography,
  Grid,
  Slider,
  Switch,
  FormControlLabel,
  Autocomplete,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tooltip,
  Paper
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Clear as ClearIcon,
  FilterList as FilterIcon,
  DateRange as DateRangeIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Star as StarIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

const AdvancedFilters = ({ open, onClose, onApplyFilters, initialFilters = {} }) => {
  const [filters, setFilters] = useState({
    // Text filters
    title: '',
    content: '',
    author: '',
    
    // Source filters
    sources: [],
    categories: [],
    languages: [],
    
    // Date filters
    dateRange: {
      start: null,
      end: null
    },
    publishedAfter: null,
    publishedBefore: null,
    
    // Credibility filters
    minCredibility: 0,
    maxCredibility: 10,
    verifiedSources: false,
    
    // Content filters
    minWordCount: 0,
    maxWordCount: 10000,
    hasImages: null, // null, true, false
    hasVideos: null,
    
    // Sentiment filters
    sentimentRange: [-1, 1],
    positiveSentiment: false,
    negativeSentiment: false,
    neutralSentiment: false,
    
    // Engagement filters
    minLikes: 0,
    minShares: 0,
    minComments: 0,
    
    // Custom filters
    customFilters: [],
    
    // Boolean operators
    booleanOperators: {
      title: 'AND',
      content: 'AND',
      author: 'AND'
    }
  });

  const [customFilterInput, setCustomFilterInput] = useState('');
  const [customFilterValue, setCustomFilterValue] = useState('');

  useEffect(() => {
    if (open) {
      setFilters({ ...filters, ...initialFilters });
    }
  }, [open, initialFilters]);

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const handleNestedFilterChange = (parentName, childName, value) => {
    setFilters(prev => ({
      ...prev,
      [parentName]: {
        ...prev[parentName],
        [childName]: value
      }
    }));
  };

  const handleArrayFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const addCustomFilter = () => {
    if (customFilterInput && customFilterValue) {
      const newFilter = {
        id: Date.now(),
        field: customFilterInput,
        operator: 'contains',
        value: customFilterValue
      };
      
      setFilters(prev => ({
        ...prev,
        customFilters: [...prev.customFilters, newFilter]
      }));
      
      setCustomFilterInput('');
      setCustomFilterValue('');
    }
  };

  const removeCustomFilter = (filterId) => {
    setFilters(prev => ({
      ...prev,
      customFilters: prev.customFilters.filter(f => f.id !== filterId)
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      title: '',
      content: '',
      author: '',
      sources: [],
      categories: [],
      languages: [],
      dateRange: { start: null, end: null },
      publishedAfter: null,
      publishedBefore: null,
      minCredibility: 0,
      maxCredibility: 10,
      verifiedSources: false,
      minWordCount: 0,
      maxWordCount: 10000,
      hasImages: null,
      hasVideos: null,
      sentimentRange: [-1, 1],
      positiveSentiment: false,
      negativeSentiment: false,
      neutralSentiment: false,
      minLikes: 0,
      minShares: 0,
      minComments: 0,
      customFilters: [],
      booleanOperators: {
        title: 'AND',
        content: 'AND',
        author: 'AND'
      }
    });
  };

  const applyFilters = () => {
    onApplyFilters(filters);
    onClose();
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    
    if (filters.title) count++;
    if (filters.content) count++;
    if (filters.author) count++;
    if (filters.sources.length > 0) count++;
    if (filters.categories.length > 0) count++;
    if (filters.languages.length > 0) count++;
    if (filters.dateRange.start || filters.dateRange.end) count++;
    if (filters.publishedAfter || filters.publishedBefore) count++;
    if (filters.minCredibility > 0 || filters.maxCredibility < 10) count++;
    if (filters.verifiedSources) count++;
    if (filters.minWordCount > 0 || filters.maxWordCount < 10000) count++;
    if (filters.hasImages !== null || filters.hasVideos !== null) count++;
    if (filters.sentimentRange[0] > -1 || filters.sentimentRange[1] < 1) count++;
    if (filters.positiveSentiment || filters.negativeSentiment || filters.neutralSentiment) count++;
    if (filters.minLikes > 0 || filters.minShares > 0 || filters.minComments > 0) count++;
    if (filters.customFilters.length > 0) count++;
    
    return count;
  };

  const mockSources = [
    'BBC News', 'CNN', 'Reuters', 'Associated Press', 'The New York Times',
    'The Washington Post', 'The Guardian', 'NPR', 'PBS', 'Al Jazeera'
  ];

  const mockCategories = [
    'Politics', 'Business', 'Technology', 'Health', 'Sports',
    'Entertainment', 'Science', 'World News', 'Economy', 'Environment'
  ];

  const mockLanguages = [
    'English', 'Spanish', 'French', 'German', 'Italian',
    'Portuguese', 'Chinese', 'Japanese', 'Korean', 'Arabic'
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FilterIcon className="text-blue-500" />
            <Typography variant="h6" className="font-semibold">
              Advanced Filters
            </Typography>
            {getActiveFiltersCount() > 0 && (
              <Chip 
                label={`${getActiveFiltersCount()} active`} 
                size="small" 
                color="primary" 
              />
            )}
          </div>
          <Button
            startIcon={<ClearIcon />}
            onClick={clearAllFilters}
            size="small"
            color="error"
          >
            Clear All
          </Button>
        </div>
      </DialogTitle>
      
      <DialogContent className="space-y-4">
        {/* Text Search Filters */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1" className="font-semibold">
              Text Search
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Title"
                  value={filters.title}
                  onChange={(e) => handleFilterChange('title', e.target.value)}
                  placeholder="Search in article titles"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Content"
                  value={filters.content}
                  onChange={(e) => handleFilterChange('content', e.target.value)}
                  placeholder="Search in article content"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Author"
                  value={filters.author}
                  onChange={(e) => handleFilterChange('author', e.target.value)}
                  placeholder="Search by author name"
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Source & Category Filters */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1" className="font-semibold">
              Sources & Categories
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Autocomplete
                  multiple
                  options={mockSources}
                  value={filters.sources}
                  onChange={(e, value) => handleArrayFilterChange('sources', value)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Sources"
                      placeholder="Select sources"
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        key={option}
                        label={option}
                        {...getTagProps({ index })}
                        size="small"
                      />
                    ))
                  }
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Autocomplete
                  multiple
                  options={mockCategories}
                  value={filters.categories}
                  onChange={(e, value) => handleArrayFilterChange('categories', value)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Categories"
                      placeholder="Select categories"
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        key={option}
                        label={option}
                        {...getTagProps({ index })}
                        size="small"
                      />
                    ))
                  }
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Autocomplete
                  multiple
                  options={mockLanguages}
                  value={filters.languages}
                  onChange={(e, value) => handleArrayFilterChange('languages', value)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Languages"
                      placeholder="Select languages"
                    />
                  )}
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Date Filters */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1" className="font-semibold">
              Date Range
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Published After"
                  type="date"
                  value={filters.publishedAfter || ''}
                  onChange={(e) => handleFilterChange('publishedAfter', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Published Before"
                  type="date"
                  value={filters.publishedBefore || ''}
                  onChange={(e) => handleFilterChange('publishedBefore', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Credibility Filters */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1" className="font-semibold">
              Source Credibility
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="body2" className="mb-2">
                  Credibility Score: {filters.minCredibility} - {filters.maxCredibility}
                </Typography>
                <Box className="px-2">
                  <Slider
                    value={[filters.minCredibility, filters.maxCredibility]}
                    onChange={(e, value) => {
                      handleFilterChange('minCredibility', value[0]);
                      handleFilterChange('maxCredibility', value[1]);
                    }}
                    min={0}
                    max={10}
                    step={0.1}
                    marks={[
                      { value: 0, label: '0' },
                      { value: 5, label: '5' },
                      { value: 10, label: '10' }
                    ]}
                  />
                </Box>
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={filters.verifiedSources}
                      onChange={(e) => handleFilterChange('verifiedSources', e.target.checked)}
                    />
                  }
                  label="Verified Sources Only"
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Content Filters */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1" className="font-semibold">
              Content Properties
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" className="mb-2">
                  Word Count: {filters.minWordCount} - {filters.maxWordCount}
                </Typography>
                <Box className="px-2">
                  <Slider
                    value={[filters.minWordCount, filters.maxWordCount]}
                    onChange={(e, value) => {
                      handleFilterChange('minWordCount', value[0]);
                      handleFilterChange('maxWordCount', value[1]);
                    }}
                    min={0}
                    max={10000}
                    step={100}
                    marks={[
                      { value: 0, label: '0' },
                      { value: 5000, label: '5K' },
                      { value: 10000, label: '10K' }
                    ]}
                  />
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Has Images</InputLabel>
                  <Select
                    value={filters.hasImages === null ? '' : filters.hasImages}
                    onChange={(e) => handleFilterChange('hasImages', e.target.value === '' ? null : e.target.value)}
                    label="Has Images"
                  >
                    <MenuItem value="">Any</MenuItem>
                    <MenuItem value={true}>Yes</MenuItem>
                    <MenuItem value={false}>No</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Has Videos</InputLabel>
                  <Select
                    value={filters.hasVideos === null ? '' : filters.hasVideos}
                    onChange={(e) => handleFilterChange('hasVideos', e.target.value === '' ? null : e.target.value)}
                    label="Has Videos"
                  >
                    <MenuItem value="">Any</MenuItem>
                    <MenuItem value={true}>Yes</MenuItem>
                    <MenuItem value={false}>No</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Sentiment Filters */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1" className="font-semibold">
              Sentiment Analysis
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="body2" className="mb-2">
                  Sentiment Range: {filters.sentimentRange[0].toFixed(2)} - {filters.sentimentRange[1].toFixed(2)}
                </Typography>
                <Box className="px-2">
                  <Slider
                    value={filters.sentimentRange}
                    onChange={(e, value) => handleArrayFilterChange('sentimentRange', value)}
                    min={-1}
                    max={1}
                    step={0.1}
                    marks={[
                      { value: -1, label: 'Negative' },
                      { value: 0, label: 'Neutral' },
                      { value: 1, label: 'Positive' }
                    ]}
                  />
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Box className="flex space-x-4">
                  <FormControlLabel
                    control={
                      <Switch
                        checked={filters.positiveSentiment}
                        onChange={(e) => handleFilterChange('positiveSentiment', e.target.checked)}
                      />
                    }
                    label="Positive"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={filters.neutralSentiment}
                        onChange={(e) => handleFilterChange('neutralSentiment', e.target.checked)}
                      />
                    }
                    label="Neutral"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={filters.negativeSentiment}
                        onChange={(e) => handleFilterChange('negativeSentiment', e.target.checked)}
                      />
                    }
                    label="Negative"
                  />
                </Box>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Custom Filters */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1" className="font-semibold">
              Custom Filters
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box className="space-y-4">
              <Box className="flex space-x-2">
                <TextField
                  label="Field"
                  value={customFilterInput}
                  onChange={(e) => setCustomFilterInput(e.target.value)}
                  placeholder="e.g., tags, keywords"
                  size="small"
                />
                <TextField
                  label="Value"
                  value={customFilterValue}
                  onChange={(e) => setCustomFilterValue(e.target.value)}
                  placeholder="e.g., breaking, urgent"
                  size="small"
                />
                <Button
                  startIcon={<AddIcon />}
                  onClick={addCustomFilter}
                  variant="outlined"
                  size="small"
                >
                  Add
                </Button>
              </Box>
              
              {filters.customFilters.length > 0 && (
                <List dense>
                  {filters.customFilters.map((filter) => (
                    <ListItem key={filter.id}>
                      <ListItemText
                        primary={`${filter.field} contains "${filter.value}"`}
                        secondary={`Operator: ${filter.operator}`}
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          onClick={() => removeCustomFilter(filter.id)}
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          </AccordionDetails>
        </Accordion>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={clearAllFilters} color="error">
          Clear All
        </Button>
        <Button onClick={applyFilters} variant="contained">
          Apply Filters ({getActiveFiltersCount()})
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AdvancedFilters;
