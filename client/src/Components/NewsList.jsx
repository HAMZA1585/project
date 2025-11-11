import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card.jsx';
import { Button, Chip, Box, Typography } from '@mui/material';
import { Visibility as VisibilityIcon, OpenInNew as OpenInNewIcon } from '@mui/icons-material';

const NewsList = ({ news, loading, searchTerm, sentimentFilter, categoryFilter, dateRange, onArticleSelect }) => {
  const COLORS = {
    Positive: '#4CAF50',
    Negative: '#F44336',
    Neutral: '#FFC107'
  };

  const getSentimentIcon = (sentiment) => {
    switch (sentiment) {
      case 'Positive':
        return '↗️';
      case 'Negative':
        return '↘️';
      case 'Neutral':
        return '→';
      default:
        return '→';
    }
  };

  const getSentimentColor = (sentiment) => {
    return COLORS[sentiment] || COLORS.Neutral;
  };

  if (loading) {
    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">News Articles</CardTitle>
            <CardDescription>Loading latest news articles...</CardDescription>
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
    <div className="space-y-4">
      {news.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No news articles found matching your filters
        </div>
      ) : (
        news.map((article) => (
          <motion.div
            key={article.id}
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow duration-200"
            onClick={() => onArticleSelect && onArticleSelect(article)}
          >
            <div className="flex p-4">
              {/* News Thumbnail */}
              <div className="flex-shrink-0 mr-4">
                <img
                  src="https://placehold.co/100x100/e2e8f0/334155?text=News"
                  alt="News thumbnail"
                  className="w-24 h-24 object-cover rounded-lg"
                />
              </div>
              
              {/* Article Content */}
              <div className="flex-1 min-w-0">
                {/* Title */}
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-2">
                  {article.title}
                </h3>
                
                {/* Metadata */}
                <div className="flex items-center gap-2 mb-2 text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-medium">{article.source}</span>
                  <span>•</span>
                  <span>{new Date(article.date).toLocaleDateString()}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <VisibilityIcon sx={{ fontSize: 14 }} />
                    {article.views?.toLocaleString()}
                  </span>
                </div>
                
                {/* Category and Sentiment */}
                <div className="flex items-center gap-2 mb-3">
                  <Chip 
                    label={article.category} 
                    size="small" 
                    variant="outlined"
                    sx={{ fontSize: '0.75rem' }}
                  />
                  <Chip
                    label={`${getSentimentIcon(article.sentiment)} ${article.sentiment}`}
                    size="small"
                    sx={{
                      backgroundColor: getSentimentColor(article.sentiment),
                      color: 'white',
                      fontWeight: 500,
                      fontSize: '0.75rem'
                    }}
                  />
                </div>
                
                {/* Content Preview */}
                {article.content && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
                    {article.content.length > 120 
                      ? `${article.content.substring(0, 120)}...` 
                      : article.content
                    }
                  </p>
                )}
                
                {/* Read More Indicator */}
                <div className="flex items-center justify-end mt-2">
                  <OpenInNewIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                </div>
              </div>
            </div>
          </motion.div>
        ))
      )}
    </div>
  );
};

export default NewsList;