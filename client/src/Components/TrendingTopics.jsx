import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card.jsx';
import { HashtagIcon } from '@heroicons/react/24/solid';
import { LinearProgress, Box, Typography } from '@mui/material';

const TrendingTopics = ({ trends, loading }) => {
  if (loading) {
    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Trending Topics</CardTitle>
            <CardDescription>Identifying key topics from the news...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900text-white">Trending Topics</CardTitle>
          <CardDescription className="text-gray-600text-gray-300">Top keywords identified from recent news articles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 space-y-3 overflow-y-auto">
            {trends && trends.length > 0 ? (
              trends.map((trend, index) => {
                // Calculate progress value (0-100) from trend score
                const progressValue = trend.score ? Math.min(trend.score * 100, 100) : 0;
                
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <HashtagIcon className="w-5 h-5 text-blue-500text-blue-400 mr-3" />
                        <span className="font-semibold text-gray-900text-white capitalize text-base">
                          {trend.keyword}
                        </span>
                      </div>
                      <Typography 
                        variant="body2" 
                        className="text-sm font-bold text-blue-600text-blue-400"
                      >
                        {progressValue.toFixed(1)}%
                      </Typography>
                    </div>
                    <LinearProgress 
                      variant="determinate" 
                      value={progressValue}
                      color="primary"
                      sx={{ 
                        height: 8, 
                        borderRadius: 4,
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 4,
                          backgroundColor: '#3b82f6',
                        }
                      }}
                    />
                  </div>
                );
              })
            ) : (
              <div className="text-center text-gray-600text-gray-300 pt-16 font-medium">
                No trend data available.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default TrendingTopics;
