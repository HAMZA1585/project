import React from 'react';

export function useDashboardFilters(news) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [sentimentFilter, setSentimentFilter] = React.useState('All');
  const [categoryFilter, setCategoryFilter] = React.useState('All');
  const [dateRange, setDateRange] = React.useState({ start: null, end: null });

  const filteredNews = React.useMemo(() => {
    return (news || []).filter(item => {
      const searchMatch = item.title?.toLowerCase().includes(searchTerm.toLowerCase());
      const sentimentMatch = sentimentFilter === 'All' || item.sentiment === sentimentFilter;
      const categoryMatch = categoryFilter === 'All' || item.category === categoryFilter;
      const itemDate = new Date(item.date);
      const startDateMatch = !dateRange.start || itemDate >= new Date(dateRange.start);
      const endDateMatch = !dateRange.end || itemDate <= new Date(dateRange.end);
      return searchMatch && sentimentMatch && categoryMatch && startDateMatch && endDateMatch;
    });
  }, [news, searchTerm, sentimentFilter, categoryFilter, dateRange]);

  const resetFilters = () => {
    setSearchTerm('');
    setSentimentFilter('All');
    setCategoryFilter('All');
    setDateRange({ start: null, end: null });
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
  };
}
