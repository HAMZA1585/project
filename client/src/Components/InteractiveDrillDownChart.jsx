import React, { useRef, useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Tooltip,
  Chip,
  Button,
  Breadcrumbs,
  Link,
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Refresh as RefreshIcon,
  ArrowBack as ArrowBackIcon,
  Home as HomeIcon,
  TrendingUp as TrendingUpIcon,
  BarChart as BarChartIcon
} from '@mui/icons-material';
import * as d3 from 'd3';

const InteractiveDrillDownChart = ({ 
  data = [], 
  loading = false, 
  title = "Interactive Drill-Down Analysis",
  height = 500,
  onExport = null
}) => {
  const svgRef = useRef();
  const containerRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 0, height });
  const [drillLevel, setDrillLevel] = useState(0);
  const [drillPath, setDrillPath] = useState([]);
  const [selectedData, setSelectedData] = useState(null);
  const [chartType, setChartType] = useState('bar');
  const [hoveredItem, setHoveredItem] = useState(null);

  // Chart types
  const chartTypes = [
    { value: 'bar', label: 'Bar Chart', icon: <BarChartIcon /> },
    { value: 'pie', label: 'Pie Chart', icon: <TrendingUpIcon /> },
    { value: 'treemap', label: 'Treemap', icon: <ZoomInIcon /> }
  ];

  // Process data for drill-down
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return { levels: [], currentLevel: 0 };

    // Level 0: By Category
    const level0 = d3.group(data, d => d.category || 'General');
    const level0Data = Array.from(level0, ([key, value]) => ({
      name: key,
      value: value.length,
      children: value,
      level: 0,
      path: [key]
    }));

    // Level 1: By Source within Category
    const level1 = {};
    level0Data.forEach(category => {
      const sourceGroup = d3.group(category.children, d => d.source || 'Unknown');
      level1[category.name] = Array.from(sourceGroup, ([key, value]) => ({
        name: key,
        value: value.length,
        children: value,
        level: 1,
        path: [category.name, key]
      }));
    });

    // Level 2: By Date within Source
    const level2 = {};
    level0Data.forEach(category => {
      level1[category.name]?.forEach(source => {
        const dateGroup = d3.group(source.children, d => {
          const date = new Date(d.date || d.timestamp);
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });
        level2[`${category.name}-${source.name}`] = Array.from(dateGroup, ([key, value]) => ({
          name: key,
          value: value.length,
          children: value,
          level: 2,
          path: [category.name, source.name, key]
        }));
      });
    });

    return {
      levels: [level0Data, level1, level2],
      currentLevel: drillLevel
    };
  }, [data, drillLevel]);

  // Get current level data
  const currentData = useMemo(() => {
    if (drillLevel === 0) {
      return processedData.levels[0] || [];
    } else if (drillLevel === 1) {
      const parentPath = drillPath[0];
      return processedData.levels[1]?.[parentPath] || [];
    } else if (drillLevel === 2) {
      const parentPath = `${drillPath[0]}-${drillPath[1]}`;
      return processedData.levels[2]?.[parentPath] || [];
    }
    return [];
  }, [processedData, drillLevel, drillPath]);

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

  // Create the chart
  useEffect(() => {
    if (!svgRef.current || currentData.length === 0 || dimensions.width === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 80, bottom: 60, left: 60 };
    const innerWidth = dimensions.width - margin.left - margin.right;
    const innerHeight = dimensions.height - margin.top - margin.bottom;

    const g = svg
      .attr("width", dimensions.width)
      .attr("height", dimensions.height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    if (chartType === 'bar') {
      createBarChart(g, currentData, innerWidth, innerHeight);
    } else if (chartType === 'pie') {
      createPieChart(g, currentData, innerWidth, innerHeight);
    } else if (chartType === 'treemap') {
      createTreemap(g, currentData, innerWidth, innerHeight);
    }

  }, [currentData, dimensions, chartType]);

  // Create bar chart
  const createBarChart = (g, data, width, height) => {
    const xScale = d3.scaleBand()
      .domain(data.map(d => d.name))
      .range([0, width])
      .padding(0.1);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.value)])
      .nice()
      .range([height, 0]);

    // Bars
    g.selectAll(".bar")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", d => xScale(d.name))
      .attr("y", d => yScale(d.value))
      .attr("width", xScale.bandwidth())
      .attr("height", d => height - yScale(d.value))
      .attr("fill", d => d3.interpolateBlues(d.value / d3.max(data, d => d.value)))
      .attr("stroke", "white")
      .attr("stroke-width", 1)
      .style("cursor", "pointer")
      .on("mouseover", function(event, d) {
        setHoveredItem(d);
        d3.select(this)
          .attr("stroke", "#374151")
          .attr("stroke-width", 2);
      })
      .on("mouseout", function() {
        setHoveredItem(null);
        d3.select(this)
          .attr("stroke", "white")
          .attr("stroke-width", 1);
      })
      .on("click", (event, d) => handleDrillDown(d));

    // X-axis
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .style("font-size", "12px")
      .style("fill", "#6b7280")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end");

    // Y-axis
    g.append("g")
      .call(d3.axisLeft(yScale))
      .selectAll("text")
      .style("font-size", "12px")
      .style("fill", "#6b7280");

    // Value labels on bars
    g.selectAll(".bar-label")
      .data(data)
      .enter()
      .append("text")
      .attr("class", "bar-label")
      .attr("x", d => xScale(d.name) + xScale.bandwidth() / 2)
      .attr("y", d => yScale(d.value) - 5)
      .attr("text-anchor", "middle")
      .style("font-size", "10px")
      .style("fill", "#374151")
      .text(d => d.value);
  };

  // Create pie chart
  const createPieChart = (g, data, width, height) => {
    const radius = Math.min(width, height) / 2;
    const pie = d3.pie()
      .value(d => d.value)
      .sort(null);

    const arc = d3.arc()
      .innerRadius(0)
      .outerRadius(radius);

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    const arcs = g.append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    arcs.selectAll("path")
      .data(pie(data))
      .enter()
      .append("path")
      .attr("d", arc)
      .attr("fill", (d, i) => color(i))
      .attr("stroke", "white")
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .on("mouseover", function(event, d) {
        setHoveredItem(d.data);
        d3.select(this)
          .attr("stroke", "#374151")
          .attr("stroke-width", 3);
      })
      .on("mouseout", function() {
        setHoveredItem(null);
        d3.select(this)
          .attr("stroke", "white")
          .attr("stroke-width", 2);
      })
      .on("click", (event, d) => handleDrillDown(d.data));

    // Labels
    arcs.selectAll("text")
      .data(pie(data))
      .enter()
      .append("text")
      .attr("transform", d => `translate(${arc.centroid(d)})`)
      .attr("text-anchor", "middle")
      .style("font-size", "10px")
      .style("fill", "white")
      .text(d => d.data.name);
  };

  // Create treemap
  const createTreemap = (g, data, width, height) => {
    const treemap = d3.treemap()
      .size([width, height])
      .padding(2);

    const root = d3.hierarchy({ children: data })
      .sum(d => d.value);

    treemap(root);

    const cells = g.selectAll(".cell")
      .data(root.leaves())
      .enter()
      .append("g")
      .attr("class", "cell")
      .attr("transform", d => `translate(${d.x0},${d.y0})`);

    cells.append("rect")
      .attr("width", d => d.x1 - d.x0)
      .attr("height", d => d.y1 - d.y0)
      .attr("fill", d => d3.interpolateBlues(d.data.value / d3.max(data, d => d.value)))
      .attr("stroke", "white")
      .attr("stroke-width", 1)
      .style("cursor", "pointer")
      .on("mouseover", function(event, d) {
        setHoveredItem(d.data);
        d3.select(this)
          .attr("stroke", "#374151")
          .attr("stroke-width", 2);
      })
      .on("mouseout", function() {
        setHoveredItem(null);
        d3.select(this)
          .attr("stroke", "white")
          .attr("stroke-width", 1);
      })
      .on("click", (event, d) => handleDrillDown(d.data));

    cells.append("text")
      .attr("x", d => (d.x1 - d.x0) / 2)
      .attr("y", d => (d.y1 - d.y0) / 2)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .style("font-size", "10px")
      .style("fill", "white")
      .text(d => d.data.name);
  };

  // Handle drill-down
  const handleDrillDown = (item) => {
    if (drillLevel < 2) {
      setDrillLevel(prev => prev + 1);
      setDrillPath(prev => [...prev, item.name]);
      setSelectedData(item);
    }
  };

  // Handle drill-up
  const handleDrillUp = () => {
    if (drillLevel > 0) {
      setDrillLevel(prev => prev - 1);
      setDrillPath(prev => prev.slice(0, -1));
      setSelectedData(null);
    }
  };

  // Handle home
  const handleHome = () => {
    setDrillLevel(0);
    setDrillPath([]);
    setSelectedData(null);
  };

  // Get breadcrumb path
  const getBreadcrumbPath = () => {
    const path = ['Home'];
    drillPath.forEach((segment, index) => {
      path.push(segment);
    });
    return path;
  };

  if (loading) {
    return (
      <Paper className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading interactive chart...</span>
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
            <Typography variant="h6" className="font-semibold text-gray-900 dark:text-white">
              {title}
            </Typography>
            <Typography variant="body2" className="text-gray-600 dark:text-gray-400">
              Click on any element to drill down for detailed analysis
            </Typography>
          </div>
          
          <div className="flex items-center space-x-2">
            <FormControl size="small" className="min-w-32">
              <InputLabel>Chart Type</InputLabel>
              <Select
                value={chartType}
                label="Chart Type"
                onChange={(e) => setChartType(e.target.value)}
              >
                {chartTypes.map(type => (
                  <MenuItem key={type.value} value={type.value}>
                    <div className="flex items-center space-x-2">
                      {type.icon}
                      <span>{type.label}</span>
                    </div>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>
        </div>

        {/* Breadcrumbs */}
        <div className="mb-6">
          <Breadcrumbs>
            {getBreadcrumbPath().map((segment, index) => (
              <Link
                key={index}
                onClick={() => {
                  if (index === 0) {
                    handleHome();
                  } else if (index < drillLevel) {
                    setDrillLevel(index);
                    setDrillPath(drillPath.slice(0, index));
                  }
                }}
                className="cursor-pointer hover:text-blue-600"
              >
                {index === 0 ? <HomeIcon className="w-4 h-4 mr-1" /> : null}
                {segment}
              </Link>
            ))}
          </Breadcrumbs>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Tooltip title="Go Back">
              <span>
                <IconButton 
                  onClick={handleDrillUp} 
                  disabled={drillLevel === 0}
                  size="small"
                >
                  <ArrowBackIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Go to Top Level">
              <span>
                <IconButton 
                  onClick={handleHome} 
                  disabled={drillLevel === 0}
                  size="small"
                >
                  <HomeIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Chip 
              label={`Level ${drillLevel + 1}`} 
              color="primary" 
              size="small" 
            />
          </div>
          
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {currentData.length} items • Total: {currentData.reduce((sum, d) => sum + d.value, 0)} articles
          </div>
        </div>

        {/* Chart */}
        <div ref={containerRef} className="w-full">
          <svg ref={svgRef} className="w-full" />
        </div>

        {/* Hover Tooltip */}
        <AnimatePresence>
          {hoveredItem && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 pointer-events-none z-10"
              style={{
                left: hoveredItem.x || 0,
                top: hoveredItem.y || 0
              }}
            >
              <Typography variant="body2" className="font-semibold text-gray-900 dark:text-white">
                {hoveredItem.name}
              </Typography>
              <Typography variant="body2" className="text-gray-600 dark:text-gray-400">
                Articles: {hoveredItem.value}
              </Typography>
              <Typography variant="body2" className="text-gray-600 dark:text-gray-400">
                Click to drill down
              </Typography>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Selected Data Details */}
        {selectedData && (
          <Card className="mt-6">
            <CardContent>
              <Typography variant="h6" className="font-semibold text-gray-900 dark:text-white mb-4">
                Selected: {selectedData.name}
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" className="text-gray-600 dark:text-gray-400">
                    Total Articles: {selectedData.value}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" className="text-gray-600 dark:text-gray-400">
                    Drill Path: {selectedData.path.join(' → ')}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}
      </Paper>
    </motion.div>
  );
};

export default InteractiveDrillDownChart;
