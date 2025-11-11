import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card.jsx';
import { MagnifyingGlassIcon as MagnifyingGlassSolidIcon, MapPinIcon, FunnelIcon, CalendarIcon } from '@heroicons/react/24/solid';
import { MagnifyingGlassIcon as MagnifyingGlassOutlineIcon } from '@heroicons/react/24/outline';
import { advancedSearch, fetchLocations, fetchCategories, fetchSources, saveQuery, createAlert } from '../Services/api';

const AdvancedSearchInterface = ({ onSearchResults }) => {
  const [searchParams, setSearchParams] = useState({
    keyword: '',
    location: '',
    category: '',
    source: '',
    sentiment: ''
  });
  
  const [isSearchEnabled, setIsSearchEnabled] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch filter options using React Query
  const { data: locationsData } = useQuery({
    queryKey: ['locations'],
    queryFn: fetchLocations,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: 10 * 60 * 1000,
  });

  const { data: sourcesData } = useQuery({
    queryKey: ['sources'],
    queryFn: fetchSources,
    staleTime: 10 * 60 * 1000,
  });

  // Use React Query to fetch search results
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['advancedSearch', searchParams, currentPage],
    queryFn: () => advancedSearch({ ...searchParams, page: currentPage, limit: 20 }),
    enabled: isSearchEnabled, // Only run the query when a search is triggered
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    onSuccess: (data) => {
      if (onSearchResults) {
        onSearchResults(data.articles || []);
      }
      setIsSearchEnabled(false); // Disable query after it succeeds to prevent re-fetching on param change
    },
    onError: () => {
      setIsSearchEnabled(false);
    }
  });

  const searchResults = data?.articles || [];
  const pagination = data?.pagination || {};
  const locations = locationsData?.locations || [];
  const categories = categoriesData?.categories || [];
  const sources = sourcesData?.sources || [];

  const handleInputChange = (field, value) => {
    setSearchParams(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page
    setIsSearchEnabled(true); // Enable and trigger the query
  };

  const clearFilters = () => {
    setSearchParams({
      keyword: '',
      location: '',
      category: '',
      source: '',
      sentiment: ''
    });
    setCurrentPage(1);
    setIsSearchEnabled(false);
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    setIsSearchEnabled(true);
  };

  const handleSaveQuery = async () => {
    const name = window.prompt('Name this query');
    if (!name) return;
    try {
      await saveQuery({
        name,
        description: '',
        query: searchParams.keyword || '',
        filters: { ...searchParams, page: currentPage },
      });
      // Optionally inform user
      // eslint-disable-next-line no-alert
      window.alert('Query saved');
    } catch (e) {
      // eslint-disable-next-line no-alert
      window.alert(e?.message || 'Failed to save query');
    }
  };

  const handleCreateAlert = async () => {
    const name = window.prompt('Name this alert');
    if (!name) return;
    try {
      await createAlert({
        name,
        query: searchParams.keyword || '',
        filters: { ...searchParams },
        frequency: 'daily',
        is_active: true,
      });
      // eslint-disable-next-line no-alert
      window.alert('Alert created');
    } catch (e) {
      // eslint-disable-next-line no-alert
      window.alert(e?.message || 'Failed to create alert');
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <MagnifyingGlassSolidIcon className="h-6 w-6 text-blue-600" />
                <span>Advanced Search</span>
              </span>
              <span className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveQuery}
                  className="px-3 py-1.5 text-sm rounded bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  Save Query
                </button>
                <button
                  type="button"
                  onClick={handleCreateAlert}
                  className="px-3 py-1.5 text-sm rounded bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Create Alert
                </button>
              </span>
            </CardTitle>
            <CardDescription>
              Search articles by keyword, location, category, and more
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              {/* Keyword Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Search Keywords
                </label>
                <div className="relative">
                  <MagnifyingGlassOutlineIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="e.g., crime, storm, technology, politics..."
                    value={searchParams.keyword}
                    onChange={(e) => handleInputChange('keyword', e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              {/* Filter Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Location Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <MapPinIcon className="inline h-4 w-4 mr-1" />
                    Location
                  </label>
                  <select
                    value={searchParams.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">All Locations</option>
                    {locations.map((location) => (
                      <option key={location} value={location}>
                        {location}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <FunnelIcon className="inline h-4 w-4 mr-1" />
                    Category
                  </label>
                  <select
                    value={searchParams.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">All Categories</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Source Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Source
                  </label>
                  <select
                    value={searchParams.source}
                    onChange={(e) => handleInputChange('source', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">All Sources</option>
                    {sources.map((source) => (
                      <option key={source} value={source}>
                        {source}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sentiment Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Sentiment
                  </label>
                  <select
                    value={searchParams.sentiment}
                    onChange={(e) => handleInputChange('sentiment', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">All Sentiments</option>
                    <option value="positive">Positive</option>
                    <option value="negative">Negative</option>
                    <option value="neutral">Neutral</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <MagnifyingGlassSolidIcon className="h-4 w-4" />
                  )}
                  <span>{isLoading ? 'Searching...' : 'Search'}</span>
                </button>
                
                <button
                  type="button"
                  onClick={clearFilters}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Clear Filters
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Search Results</span>
                <span className="text-sm font-normal text-gray-500">
                  {pagination.total_count} articles found
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {searchResults.map((article) => (
                  <div
                    key={article.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {article.title}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        article.sentiment.label === 'positive' ? 'bg-green-100 text-green-800' :
                        article.sentiment.label === 'negative' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {article.sentiment.label}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400 mb-2">
                      <span className="flex items-center">
                        <MapPinIcon className="h-4 w-4 mr-1" />
                        {article.location}
                      </span>
                      <span>{article.source}</span>
                      <span>{article.category}</span>
                      <span>{new Date(article.date).toLocaleDateString()}</span>
                    </div>
                    
                    {article.content && (
                      <p className="text-gray-700 dark:text-gray-300 text-sm line-clamp-2">
                        {article.content.substring(0, 200)}...
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pagination.total_pages > 1 && (
                <div className="flex justify-center items-center space-x-2 mt-6">
                  <button
                    onClick={() => handlePageChange(pagination.current_page - 1)}
                    disabled={!pagination.has_prev}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  <span className="px-3 py-1 text-sm">
                    Page {pagination.current_page} of {pagination.total_pages}
                  </span>
                  
                  <button
                    onClick={() => handlePageChange(pagination.current_page + 1)}
                    disabled={!pagination.has_next}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Error State */}
      {isError && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="shadow-lg border-red-200 bg-red-50 dark:bg-red-900/20">
            <CardContent className="text-center py-12">
              <div className="text-red-600 dark:text-red-400 mb-4">
                <MagnifyingGlassSolidIcon className="h-12 w-12 mx-auto mb-2" />
                <h3 className="text-lg font-medium mb-2">Search Error</h3>
                <p className="text-sm">
                  {error?.message || 'An error occurred while searching. Please try again.'}
                </p>
              </div>
              <button
                onClick={() => setIsSearchEnabled(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Retry Search
              </button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* No Results */}
      {searchResults.length === 0 && !isLoading && !isSearchEnabled && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="shadow-lg">
            <CardContent className="text-center py-12">
              <MagnifyingGlassSolidIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No articles found
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Try adjusting your search criteria or clearing the filters
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

export default AdvancedSearchInterface;
