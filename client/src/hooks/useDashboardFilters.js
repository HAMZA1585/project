import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { advancedSearch } from '../Services/api';

export function useDashboardFilters(initialNews) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [sentimentFilter, setSentimentFilter] = React.useState('All');
  const [categoryFilter, setCategoryFilter] = React.useState('All');
  const [dateRange, setDateRange] = React.useState({ start: null, end: null });

  // Create a debounced search term to avoid spamming the API on every keystroke
  const [debouncedSearchTerm, setDebouncedSearchTerm] = React.useState(searchTerm);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // 500ms delay

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  const searchParams = React.useMemo(() => ({
    keyword: debouncedSearchTerm,
    sentiment: sentimentFilter === 'All' ? '' : sentimentFilter.toLowerCase(),
    category: categoryFilter === 'All' ? '' : categoryFilter,
    // Note: advancedSearch API doesn't support date range yet,
    // but we build it here for when it does.
    // We will keep client-side date filtering for now.
  }), [debouncedSearchTerm, sentimentFilter, categoryFilter]);

  // Use React Query to fetch data based on search params
  const { data, isLoading, error } = useQuery({
    queryKey: ['advancedSearch', searchParams],
    queryFn: () => advancedSearch(searchParams),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!(searchParams.keyword || searchParams.sentiment || searchParams.category),
    keepPreviousData: true,
  });

  const filteredNews = React.useMemo(() => {
    // If a search is active (or was active), use its results
    let newsToFilter = data?.articles ? data.articles : initialNews;
    
    // Fallback to initialNews if search is not active
    if (!searchParams.keyword && !searchParams.sentiment && !searchParams.category) {
        newsToFilter = initialNews;
    }
    
    // We still need to apply date filtering client-side
    return (newsToFilter || []).filter(item => {
      const itemDate = new Date(item.date);
      const startDateMatch = !dateRange.start || itemDate >= new Date(dateRange.start);
      const endDateMatch = !dateRange.end || itemDate <= new Date(dateRange.end);
      return startDateMatch && endDateMatch;
    });
  }, [initialNews, data, dateRange, searchParams]);

  const resetFilters = () => {
    setSearchTerm('');
    setSentimentFilter('All');
    setCategoryFilter('All');
    setDateRange({ start: null, end: null });
    setDebouncedSearchTerm('');
  };

  return {
    searchTerm,
    setSearchTerm,
    sentimentFilter,
    setSentimentFilter,
    categoryFilter,
    setCategoryFilter,
    dateRange,
    setDateRange,
    filteredNews,
    resetFilters,
    // Pass loading/error states back to the dashboard
    isLoading: isLoading, 
    isError: !!error,
  };
}
