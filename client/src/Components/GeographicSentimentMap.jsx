import React, { useRef, useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  CenterFocusStrong as CenterIcon,
  Map as MapIcon,
  LocationOn as LocationIcon
} from '@mui/icons-material';
import * as d3 from 'd3';

const GeographicSentimentMap = ({ 
  data = [], 
  loading = false, 
  title = "Geographic Sentiment Mapping",
  height = 500,
  onExport = null
}) => {
  const svgRef = useRef();
  const containerRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 0, height });
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [hoveredRegion, setHoveredRegion] = useState(null);
  const [sentimentMetric, setSentimentMetric] = useState('average');
  const [showLabels, setShowLabels] = useState(true);
  const [colorScheme, setColorScheme] = useState('RdYlBu');
  const [minData, setMinData] = useState(1);
  const [maxData, setMaxData] = useState(100);

  // NEW SPREAD-OUT COORDINATES
  const regionCoordinates = {
    // North
    'Peshawar': { x: 330, y: 130, name: 'Peshawar' },
    'Islamabad': { x: 380, y: 150, name: 'Islamabad' },
    'Rawalpindi': { x: 375, y: 170, name: 'Rawalpindi' },
    
    // Punjab (Plains)
    'Sialkot': { x: 420, y: 210, name: 'Sialkot' },
    'Gujranwala': { x: 390, y: 220, name: 'Gujranwala' },
    'Lahore': { x: 400, y: 240, name: 'Lahore' },
    'Faisalabad': { x: 350, y: 260, name: 'Faisalabad' },
    'Multan': { x: 340, y: 300, name: 'Multan' },
    // Balochistan
    'Quetta': { x: 240, y: 290, name: 'Quetta' },
    // Sindh
    'Hyderabad': { x: 300, y: 370, name: 'Hyderabad' },
    'Karachi': { x: 280, y: 400, name: 'Karachi' },
    
    // Fallback (moved to top-left corner)
    'Global': { x: 50, y: 50, name: 'Global' }
  };

  // Color schemes
  const colorSchemes = {
    RdYlBu: d3.interpolateRdYlBu,
    RdYlGn: d3.interpolateRdYlGn,
    Spectral: d3.interpolateSpectral,
    Viridis: d3.interpolateViridis,
    Plasma: d3.interpolatePlasma,
    Inferno: d3.interpolateInferno,
    Magma: d3.interpolateMagma,
    Blues: d3.interpolateBlues,
    Greens: d3.interpolateGreens,
    Reds: d3.interpolateReds
  };

  // Process data for geographic mapping
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return {};

    const regionData = {};
    
    data.forEach(article => {
      const region = article.region || 'Global';
      if (!regionData[region]) {
        regionData[region] = {
          region: region,
          articles: [],
          totalCount: 0,
          positiveCount: 0,
          negativeCount: 0,
          neutralCount: 0,
          sentimentScores: []
        };
      }
      
      regionData[region].articles.push(article);
      regionData[region].totalCount += 1;
      
      if (article.sentiment_label === 'Positive') {
        regionData[region].positiveCount += 1;
      } else if (article.sentiment_label === 'Negative') {
        regionData[region].negativeCount += 1;
      } else {
        regionData[region].neutralCount += 1;
      }
      
      regionData[region].sentimentScores.push(article.sentiment_score || 0.5);
    });

    // Calculate metrics for each region
    Object.values(regionData).forEach(region => {
      region.averageSentiment = region.sentimentScores.reduce((sum, score) => sum + score, 0) / region.sentimentScores.length;
      region.positivePercentage = (region.positiveCount / region.totalCount) * 100;
      region.negativePercentage = (region.negativeCount / region.totalCount) * 100;
      region.neutralPercentage = (region.neutralCount / region.totalCount) * 100;
      region.sentimentVariance = d3.variance(region.sentimentScores) || 0;
    });

    return regionData;
  }, [data]);

  // Get color for region based on selected metric
  const getRegionColor = (regionData) => {
    if (!regionData) return '#e5e7eb';
    
    let value;
    switch (sentimentMetric) {
      case 'average':
        value = regionData.averageSentiment;
        break;
      case 'positive':
        value = regionData.positivePercentage / 100;
        break;
      case 'negative':
        value = regionData.negativePercentage / 100;
        break;
      case 'neutral':
        value = regionData.neutralPercentage / 100;
        break;
      case 'variance':
        value = regionData.sentimentVariance;
        break;
      default:
        value = regionData.averageSentiment;
    }
    
    const colorScale = d3.scaleSequential(colorSchemes[colorScheme])
      .domain([0, 1]);
    
    return colorScale(value);
  };

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect();
        setDimensions({ width: width - 40, height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [height]);

  // Create geographic map
  useEffect(() => {
    if (!svgRef.current || Object.keys(processedData).length === 0 || dimensions.width === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const innerWidth = dimensions.width - margin.left - margin.right;
    const innerHeight = dimensions.height - margin.top - margin.bottom;

    const g = svg
      .attr("width", dimensions.width)
      .attr("height", dimensions.height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Scale coordinates to fit container
    const scaleX = d3.scaleLinear()
      .domain([0, 600])
      .range([0, innerWidth]);
    
    const scaleY = d3.scaleLinear()
      .domain([0, 400])
      .range([0, innerHeight]);

    // Create region circles
    const regions = Object.entries(processedData).map(([region, data]) => ({
      ...data,
      ...regionCoordinates[region],
      x: scaleX(regionCoordinates[region]?.x || 300),
      y: scaleY(regionCoordinates[region]?.y || 200)
    }));

    // Size scale based on article count
    const sizeScale = d3.scaleSqrt()
      .domain(d3.extent(regions, d => d.totalCount))
      .range([20, 80]);

    // Create circles
    const circles = g.selectAll(".region")
      .data(regions)
      .enter()
      .append("circle")
      .attr("class", "region")
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("r", d => sizeScale(d.totalCount))
      .attr("fill", d => getRegionColor(d))
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .on("mouseover", function(event, d) {
        setHoveredRegion(d);
        d3.select(this)
          .attr("stroke", "#ff6b6b")
          .attr("stroke-width", 4);
      })
      .on("mouseout", function() {
        setHoveredRegion(null);
        d3.select(this)
          .attr("stroke", "#fff")
          .attr("stroke-width", 2);
      })
      .on("click", (event, d) => {
        setSelectedRegion(d);
      });

    // Add labels
    if (showLabels) {
      g.selectAll(".region-label")
        .data(regions)
        .enter()
        .append("text")
        .attr("class", "region-label")
        .attr("x", d => d.x)
        .attr("y", d => d.y + 5)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .style("font-size", "10px")
        .style("font-weight", "bold")
        .style("fill", "#333")
        .style("pointer-events", "none")
        .text(d => d.region);
    }

    // Add zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.5, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

  }, [processedData, dimensions, sentimentMetric, colorScheme, showLabels]);

  const handleReset = () => {
    if (svgRef.current) {
      const svg = d3.select(svgRef.current);
      svg.transition().duration(750).call(
        d3.zoom().transform,
        d3.zoomIdentity
      );
    }
  };

  const handleCenter = () => {
    if (svgRef.current) {
      const svg = d3.select(svgRef.current);
      svg.transition().duration(750).call(
        d3.zoom().transform,
        d3.zoomIdentity.translate(0, 0).scale(1)
      );
    }
  };

  const handleExport = () => {
    if (onExport) {
      onExport(processedData, 'geographic_sentiment');
    }
  };

  if (loading) {
    return (
      <Paper className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading geographic map...</span>
        </div>
      </Paper>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <Paper className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Typography variant="h6" className="font-semibold text-gray-900text-white">
              {title}
            </Typography>
            <Typography variant="body2" className="text-gray-600text-gray-400">
              Click on regions to explore sentiment data
            </Typography>
          </div>
          
          <div className="flex items-center space-x-2">
            <Tooltip title="Reset View">
              <IconButton onClick={handleReset} size="small">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Center View">
              <IconButton onClick={handleCenter} size="small">
                <CenterIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Export Data">
              <IconButton onClick={handleExport} size="small">
                <DownloadIcon />
              </IconButton>
            </Tooltip>
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <FormControl size="small">
            <InputLabel>Sentiment Metric</InputLabel>
            <Select
              value={sentimentMetric}
              label="Sentiment Metric"
              onChange={(e) => setSentimentMetric(e.target.value)}
            >
              <MenuItem value="average">Average Sentiment</MenuItem>
              <MenuItem value="positive">Positive Percentage</MenuItem>
              <MenuItem value="negative">Negative Percentage</MenuItem>
              <MenuItem value="neutral">Neutral Percentage</MenuItem>
              <MenuItem value="variance">Sentiment Variance</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small">
            <InputLabel>Color Scheme</InputLabel>
            <Select
              value={colorScheme}
              label="Color Scheme"
              onChange={(e) => setColorScheme(e.target.value)}
            >
              {Object.keys(colorSchemes).map(scheme => (
                <MenuItem key={scheme} value={scheme}>
                  {scheme}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Switch
                checked={showLabels}
                onChange={(e) => setShowLabels(e.target.checked)}
              />
            }
            label="Show Labels"
          />

          <div>
            <Typography variant="body2" className="text-gray-600text-gray-400 mb-2">
              Data Range: {minData} - {maxData}
            </Typography>
            <Slider
              value={[minData, maxData]}
              onChange={(e, newValue) => {
                setMinData(newValue[0]);
                setMaxData(newValue[1]);
              }}
              min={0}
              max={200}
              step={1}
              valueLabelDisplay="auto"
            />
          </div>
        </div>

        {/* Geographic Map */}
        <div ref={containerRef} className="w-full">
          <svg ref={svgRef} className="w-full" />
        </div>

        {/* Hover Tooltip */}
        <AnimatePresence>
          {hoveredRegion && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute bg-whitebg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200border-gray-700 pointer-events-none z-10"
            >
              <Typography variant="body2" className="font-semibold text-gray-900text-white">
                <LocationIcon className="w-4 h-4 inline mr-1" />
                {hoveredRegion.region}
              </Typography>
              <Typography variant="body2" className="text-gray-600text-gray-400">
                Articles: {hoveredRegion.totalCount}
              </Typography>
              <Typography variant="body2" className="text-gray-600text-gray-400">
                Avg Sentiment: {hoveredRegion.averageSentiment?.toFixed(3)}
              </Typography>
              <Typography variant="body2" className="text-gray-600text-gray-400">
                Positive: {hoveredRegion.positivePercentage?.toFixed(1)}%
              </Typography>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Selected Region Details */}
        {selectedRegion && (
          <Card className="mt-6">
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <Typography variant="h6" className="font-semibold text-gray-900text-white">
                  <MapIcon className="w-5 h-5 inline mr-2" />
                  {selectedRegion.region}
                </Typography>
                <Button
                  size="small"
                  onClick={() => setSelectedRegion(null)}
                >
                  Close
                </Button>
              </div>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <Typography variant="body2" className="text-gray-600text-gray-400">
                    <strong>Total Articles:</strong> {selectedRegion.totalCount}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Typography variant="body2" className="text-gray-600text-gray-400">
                    <strong>Average Sentiment:</strong> {selectedRegion.averageSentiment?.toFixed(3)}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Typography variant="body2" className="text-gray-600text-gray-400">
                    <strong>Sentiment Variance:</strong> {selectedRegion.sentimentVariance?.toFixed(3)}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Typography variant="body2" className="text-gray-600text-gray-400">
                    <strong>Positive:</strong> {selectedRegion.positivePercentage?.toFixed(1)}%
                  </Typography>
                </Grid>
              </Grid>
              
              {/* Sentiment Distribution */}
              <div className="mt-4">
                <Typography variant="subtitle2" className="font-semibold text-gray-900text-white mb-2">
                  Sentiment Distribution
                </Typography>
                <div className="flex space-x-4">
                  <Chip
                    label={`Positive: ${selectedRegion.positivePercentage?.toFixed(1)}%`}
                    color="success"
                    size="small"
                  />
                  <Chip
                    label={`Neutral: ${selectedRegion.neutralPercentage?.toFixed(1)}%`}
                    color="warning"
                    size="small"
                  />
                  <Chip
                    label={`Negative: ${selectedRegion.negativePercentage?.toFixed(1)}%`}
                    color="error"
                    size="small"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Statistics */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-50bg-gray-800 rounded-lg">
            <Typography variant="h6" className="font-bold text-gray-900text-white">
              {Object.keys(processedData).length}
            </Typography>
            <Typography variant="caption" className="text-gray-600text-gray-400">
              Regions
            </Typography>
          </div>
          <div className="text-center p-3 bg-gray-50bg-gray-800 rounded-lg">
            <Typography variant="h6" className="font-bold text-gray-900text-white">
              {Object.values(processedData).reduce((sum, region) => sum + region.totalCount, 0)}
            </Typography>
            <Typography variant="caption" className="text-gray-600text-gray-400">
              Total Articles
            </Typography>
          </div>
          <div className="text-center p-3 bg-gray-50bg-gray-800 rounded-lg">
            <Typography variant="h6" className="font-bold text-gray-900text-white">
              {Object.values(processedData).length > 0 ? 
                (Object.values(processedData).reduce((sum, region) => sum + region.averageSentiment, 0) / Object.values(processedData).length).toFixed(3) : 0}
            </Typography>
            <Typography variant="caption" className="text-gray-600text-gray-400">
              Global Avg Sentiment
            </Typography>
          </div>
          <div className="text-center p-3 bg-gray-50bg-gray-800 rounded-lg">
            <Typography variant="h6" className="font-bold text-gray-900text-white">
              {Object.values(processedData).length > 0 ? 
                Math.max(...Object.values(processedData).map(region => region.totalCount)) : 0}
            </Typography>
            <Typography variant="caption" className="text-gray-600text-gray-400">
              Max Articles
            </Typography>
          </div>
        </div>
      </Paper>
    </motion.div>
  );
};

export default GeographicSentimentMap;
