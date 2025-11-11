import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
    fetchArchiveByRange, 
    fetchArchiveByMonth, 
    fetchArchiveByPeriod, 
    fetchArchiveStats, 
    fetchAvailableDates 
} from '../Services/api';
import { 
    CalendarIcon, 
    ClockIcon, 
    FunnelIcon, 
    MagnifyingGlassIcon, 
    ChartBarIcon,
    ArchiveBoxIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const Archive = () => {
    // Filter states
    const [searchType, setSearchType] = useState('period'); // 'range', 'month', 'period'
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedPeriod, setSelectedPeriod] = useState('last_month');
    const [source, setSource] = useState('');
    const [category, setCategory] = useState('');
    const [sentiment, setSentiment] = useState('');
    const [location, setLocation] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(50);

    // Query for available dates
    const { data: availableDates } = useQuery({
        queryKey: ['availableDates'],
        queryFn: fetchAvailableDates,
        staleTime: 10 * 60 * 1000, // 10 minutes
    });

    // Query for articles based on search type and filters
    const { 
        data: articlesData, 
        isLoading: loading, 
        error: articlesError,
        refetch: refetchArticles 
    } = useQuery({
        queryKey: ['archiveArticles', searchType, startDate, endDate, selectedYear, selectedMonth, selectedPeriod, source, category, sentiment, location, currentPage, perPage],
        queryFn: async () => {
            const options = {
                page: currentPage,
                per_page: perPage,
                source: source || undefined,
                category: category || undefined,
                sentiment: sentiment || undefined,
                location: location || undefined
            };

            switch (searchType) {
                case 'range':
                    return await fetchArchiveByRange(startDate, endDate, options);
                case 'month':
                    return await fetchArchiveByMonth(selectedYear, selectedMonth, options);
                case 'period':
                    return await fetchArchiveByPeriod(selectedPeriod, options);
                default:
                    throw new Error('Invalid search type');
            }
        },
        enabled: true, // Always enabled, but will refetch when dependencies change
        staleTime: 2 * 60 * 1000, // 2 minutes
    });

    // Query for stats when using range search
    const { data: stats } = useQuery({
        queryKey: ['archiveStats', startDate, endDate],
        queryFn: () => fetchArchiveStats(startDate, endDate),
        enabled: searchType === 'range' && (!!startDate || !!endDate),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    const articles = articlesData?.articles || [];
    const pagination = articlesData?.pagination || {};

    const handleSearch = () => {
        if (searchType === 'range' && !startDate && !endDate) {
            toast.error('Please select at least one date for range search');
            return;
        }
        setCurrentPage(1);
        // React Query will automatically refetch when dependencies change
    };

    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
        // React Query will automatically refetch when currentPage changes
    };

    const handleQuickPeriod = (period) => {
        setSearchType('period');
        setSelectedPeriod(period);
        setCurrentPage(1);
        // React Query will automatically refetch when dependencies change
    };

    // Handle React Query errors
    React.useEffect(() => {
        if (articlesError) {
            console.error('Error loading articles:', articlesError);
            toast.error('Failed to load articles');
        }
    }, [articlesError]);

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getSentimentColor = (sentiment) => {
        switch (sentiment?.toLowerCase()) {
            case 'positive': return 'text-green-600 bg-green-100';
            case 'negative': return 'text-red-600 bg-red-100';
            case 'neutral': return 'text-gray-600 bg-gray-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const renderPagination = () => {
        if (!pagination.pages || pagination.pages <= 1) return null;

        const pages = [];
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(pagination.pages, currentPage + 2);

        for (let i = startPage; i <= endPage; i++) {
            pages.push(
                <button
                    key={i}
                    onClick={() => handlePageChange(i)}
                    className={`px-3 py-2 mx-1 rounded ${
                        i === currentPage
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                >
                    {i}
                </button>
            );
        }

        return (
            <div className="flex justify-center items-center mt-6">
                <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={!pagination.has_prev}
                    className="px-3 py-2 mx-1 rounded bg-gray-200 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300"
                >
                    Previous
                </button>
                {pages}
                <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={!pagination.has_next}
                    className="px-3 py-2 mx-1 rounded bg-gray-200 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300"
                >
                    Next
                </button>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <style dangerouslySetInnerHTML={{
                __html: `
                    .archive-select {
                        background-color: white !important;
                        color: #111827 !important;
                        border: 1px solid #d1d5db !important;
                        border-radius: 0.375rem !important;
                        padding: 0.5rem 0.75rem !important;
                        font-size: 0.875rem !important;
                        line-height: 1.25rem !important;
                        appearance: none !important;
                        background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e") !important;
                        background-position: right 0.5rem center !important;
                        background-repeat: no-repeat !important;
                        background-size: 1.5em 1.5em !important;
                        padding-right: 2.5rem !important;
                    }
                    .archive-select option {
                        background-color: white !important;
                        color: #111827 !important;
                        padding: 8px 12px !important;
                        font-size: 0.875rem !important;
                    }
                    .archive-select:focus {
                        outline: none !important;
                        ring: 2px !important;
                        ring-color: #3b82f6 !important;
                        border-color: #3b82f6 !important;
                    }
                    .archive-select:focus option {
                        background-color: #f3f4f6 !important;
                    }
                    input[type="radio"] {
                        appearance: none !important;
                        width: 16px !important;
                        height: 16px !important;
                        border: 2px solid #d1d5db !important;
                        border-radius: 50% !important;
                        background-color: white !important;
                        cursor: pointer !important;
                        position: relative !important;
                    }
                    input[type="radio"]:checked {
                        border-color: #2563eb !important;
                        background-color: #2563eb !important;
                    }
                    input[type="radio"]:checked::after {
                        content: '' !important;
                        position: absolute !important;
                        top: 50% !important;
                        left: 50% !important;
                        transform: translate(-50%, -50%) !important;
                        width: 6px !important;
                        height: 6px !important;
                        border-radius: 50% !important;
                        background-color: white !important;
                    }
                `
            }} />
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
                        <ArchiveBoxIcon className="mr-3 h-8 w-8 text-blue-600" />
                        News Archive
                    </h1>
                    <p className="text-gray-600">
                        Explore historical news data and analyze trends over time
                    </p>
                </div>

                {/* Quick Period Buttons */}
                <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Access</h3>
                    <div className="space-y-4">
                        {/* Time Period Buttons */}
                        <div>
                            <h4 className="text-sm font-medium text-gray-600 mb-2">Time Periods</h4>
                            <div className="flex flex-wrap gap-3">
                                {[
                                    { period: 'last_week', label: 'Last Week' },
                                    { period: 'last_month', label: 'Last Month' },
                                    { period: 'last_quarter', label: 'Last Quarter' },
                                    { period: 'last_year', label: 'Last Year' }
                                ].map(({ period, label }) => (
                                    <button
                                        key={period}
                                        onClick={() => handleQuickPeriod(period)}
                                        className={`px-4 py-2 rounded-lg border transition-colors ${
                                            searchType === 'period' && selectedPeriod === period
                                                ? 'bg-blue-500 text-white border-blue-500'
                                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                        }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        {/* Pakistani News Quick Access */}
                        <div>
                            <h4 className="text-sm font-medium text-gray-600 mb-2">🇵🇰 Pakistani News</h4>
                            <div className="flex flex-wrap gap-3">
                                {[
                                    { source: 'DAWN', label: 'DAWN News' },
                                    { source: 'Pakistan Times', label: 'Pakistan Times' },
                                    { source: 'Urdu Point', label: 'Urdu Point' }
                                ].map(({ source, label }) => (
                                    <button
                                        key={source}
                                        onClick={() => {
                                            setSource(source);
                                            setSearchType('period');
                                            setSelectedPeriod('last_month');
                                            handleSearch();
                                        }}
                                        className="px-4 py-2 rounded-lg border transition-colors bg-green-50 text-green-700 border-green-300 hover:bg-green-100"
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        {/* Major Cities Quick Access */}
                        <div>
                            <h4 className="text-sm font-medium text-gray-600 mb-2">🏙️ Major Cities</h4>
                            <div className="flex flex-wrap gap-3">
                                {[
                                    { location: 'Islamabad', label: 'Islamabad' },
                                    { location: 'Lahore', label: 'Lahore' },
                                    { location: 'Karachi', label: 'Karachi' },
                                    { location: 'Peshawar', label: 'Peshawar' },
                                    { location: 'Quetta', label: 'Quetta' },
                                    { location: 'Rawalpindi', label: 'Rawalpindi' }
                                ].map(({ location, label }) => (
                                    <button
                                        key={location}
                                        onClick={() => {
                                            setLocation(location);
                                            setSearchType('period');
                                            setSelectedPeriod('last_month');
                                            handleSearch();
                                        }}
                                        className="px-4 py-2 rounded-lg border transition-colors bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100"
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search Controls */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <div className="flex items-center mb-4">
                        <MagnifyingGlassIcon className="mr-2 h-5 w-5 text-gray-500" />
                        <h3 className="text-lg font-semibold text-gray-900">Search Archive</h3>
                    </div>

                    {/* Search Type Selection */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Search Type
                        </label>
                        <div className="flex space-x-6">
                            {[
                                { value: 'range', label: 'Date Range' },
                                { value: 'month', label: 'Specific Month' },
                                { value: 'period', label: 'Predefined Period' }
                            ].map(({ value, label }) => (
                                <label key={value} className={`flex items-center cursor-pointer p-2 rounded-lg transition-colors ${
                                    searchType === value 
                                        ? 'bg-blue-50 border border-blue-200' 
                                        : 'hover:bg-gray-50'
                                }`}>
                                    <input
                                        type="radio"
                                        value={value}
                                        checked={searchType === value}
                                        onChange={(e) => setSearchType(e.target.value)}
                                        className="mr-2"
                                    />
                                    <span className={`text-sm font-medium ${
                                        searchType === value 
                                            ? 'text-blue-700' 
                                            : 'text-gray-700'
                                    }`}>{label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Date Range Search */}
                    {searchType === 'range' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Start Date
                                </label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    End Date
                                </label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    )}

                    {/* Month Search */}
                    {searchType === 'month' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Year
                                </label>
                                <select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                    className="w-full archive-select"
                                >
                                    {availableDates && availableDates.available_months && 
                                        [...new Set(availableDates.available_months.map(m => m.year))]
                                            .sort((a, b) => b - a)
                                            .map(year => (
                                                <option key={year} value={year}>{year}</option>
                                            ))
                                    }
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Month
                                </label>
                                <select
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                    className="w-full archive-select"
                                >
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                        <option key={month} value={month}>
                                            {new Date(0, month - 1).toLocaleString('default', { month: 'long' })}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Period Search */}
                    {searchType === 'period' && (
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Period
                            </label>
                            <select
                                value={selectedPeriod}
                                onChange={(e) => setSelectedPeriod(e.target.value)}
                                className="w-full archive-select"
                            >
                                <option value="last_week">Last Week</option>
                                <option value="last_month">Last Month</option>
                                <option value="last_quarter">Last Quarter</option>
                                <option value="last_year">Last Year</option>
                            </select>
                        </div>
                    )}

                    {/* Additional Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Source
                            </label>
                            <select
                                value={source}
                                onChange={(e) => setSource(e.target.value)}
                                className="w-full archive-select"
                            >
                                <option value="">All Sources</option>
                                <option value="DAWN">DAWN (Pakistan)</option>
                                <option value="Pakistan Times">Pakistan Times</option>
                                <option value="Urdu Point">Urdu Point</option>
                                <option value="The Guardian">The Guardian</option>
                                <option value="CurrentsAPI">CurrentsAPI</option>
                                <option value="NewsAPI.org">NewsAPI.org</option>
                                <option value="BBC">BBC</option>
                                <option value="CNN">CNN</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Category
                            </label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full archive-select"
                            >
                                <option value="">All Categories</option>
                                <option value="Pakistan News">Pakistan News</option>
                                <option value="Politics">Politics</option>
                                <option value="Technology">Technology</option>
                                <option value="Business">Business</option>
                                <option value="Sports">Sports</option>
                                <option value="Health">Health</option>
                                <option value="Entertainment">Entertainment</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Sentiment
                            </label>
                            <select
                                value={sentiment}
                                onChange={(e) => setSentiment(e.target.value)}
                                className="w-full archive-select"
                            >
                                <option value="">All Sentiments</option>
                                <option value="Positive">Positive</option>
                                <option value="Negative">Negative</option>
                                <option value="Neutral">Neutral</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                🏙️ Location
                            </label>
                            <select
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                className="w-full archive-select"
                            >
                                <option value="">All Locations</option>
                                <option value="Islamabad">Islamabad</option>
                                <option value="Lahore">Lahore</option>
                                <option value="Karachi">Karachi</option>
                                <option value="Peshawar">Peshawar</option>
                                <option value="Quetta">Quetta</option>
                                <option value="Rawalpindi">Rawalpindi</option>
                                <option value="Faisalabad">Faisalabad</option>
                                <option value="Multan">Multan</option>
                                <option value="Gujranwala">Gujranwala</option>
                                <option value="Sialkot">Sialkot</option>
                                <option value="Sargodha">Sargodha</option>
                                <option value="Bahawalpur">Bahawalpur</option>
                                <option value="Sukkur">Sukkur</option>
                                <option value="Jhang">Jhang</option>
                                <option value="Sheikhupura">Sheikhupura</option>
                                <option value="Larkana">Larkana</option>
                                <option value="Gujrat">Gujrat</option>
                                <option value="Kasur">Kasur</option>
                                <option value="Mardan">Mardan</option>
                                <option value="Mingora">Mingora</option>
                                <option value="Nawabshah">Nawabshah</option>
                                <option value="Chiniot">Chiniot</option>
                                <option value="Kotri">Kotri</option>
                                <option value="Khanpur">Khanpur</option>
                                <option value="Hafizabad">Hafizabad</option>
                                <option value="Kohat">Kohat</option>
                                <option value="Jacobabad">Jacobabad</option>
                                <option value="Shikarpur">Shikarpur</option>
                                <option value="Muzaffargarh">Muzaffargarh</option>
                                <option value="Khanewal">Khanewal</option>
                                <option value="Hassan Abdal">Hassan Abdal</option>
                                <option value="Kamoke">Kamoke</option>
                                <option value="Sahiwal">Sahiwal</option>
                                <option value="Okara">Okara</option>
                                <option value="Wah Cantonment">Wah Cantonment</option>
                                <option value="Rahim Yar Khan">Rahim Yar Khan</option>
                                <option value="Chakwal">Chakwal</option>
                            </select>
                        </div>
                    </div>

                    {/* Search Button and Options */}
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-4">
                            <label className="block text-sm font-medium text-gray-700">
                                Articles per page:
                            </label>
                            <select
                                value={perPage}
                                onChange={(e) => setPerPage(parseInt(e.target.value))}
                                className="archive-select"
                            >
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>
                        <div className="flex space-x-3">
                            <button
                                onClick={() => {
                                    setSource('');
                                    setCategory('');
                                    setSentiment('');
                                    setLocation('');
                                    setStartDate('');
                                    setEndDate('');
                                    handleSearch();
                                }}
                                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                            >
                                Clear Filters
                            </button>
                            <button
                                onClick={handleSearch}
                                disabled={loading}
                                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                            >
                                {loading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Searching...
                                    </>
                                ) : (
                                    <>
                                        <MagnifyingGlassIcon className="mr-2 h-4 w-4" />
                                        Search Archive
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Statistics */}
                {stats && (
                    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                        <div className="flex items-center mb-4">
                            <ChartBarIcon className="mr-2 h-5 w-5 text-gray-500" />
                            <h3 className="text-lg font-semibold text-gray-900">Archive Statistics</h3>
                        </div>
                        
                        {/* Main Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                            <div className="text-center p-4 bg-blue-50 rounded-lg">
                                <div className="text-2xl font-bold text-blue-600">{stats.total_articles}</div>
                                <div className="text-sm text-gray-600">Total Articles</div>
                            </div>
                            <div className="text-center p-4 bg-green-50 rounded-lg">
                                <div className="text-2xl font-bold text-green-600">
                                    {stats.sentiments?.find(s => s.sentiment === 'Positive')?.count || 0}
                                </div>
                                <div className="text-sm text-gray-600">Positive</div>
                            </div>
                            <div className="text-center p-4 bg-red-50 rounded-lg">
                                <div className="text-2xl font-bold text-red-600">
                                    {stats.sentiments?.find(s => s.sentiment === 'Negative')?.count || 0}
                                </div>
                                <div className="text-sm text-gray-600">Negative</div>
                            </div>
                            <div className="text-center p-4 bg-gray-50 rounded-lg">
                                <div className="text-2xl font-bold text-gray-600">
                                    {stats.sentiments?.find(s => s.sentiment === 'Neutral')?.count || 0}
                                </div>
                                <div className="text-sm text-gray-600">Neutral</div>
                            </div>
                        </div>

                        {/* Source Breakdown */}
                        {stats.sources && stats.sources.length > 0 && (
                            <div className="mb-6">
                                <h4 className="text-md font-semibold text-gray-900 mb-3">📰 Sources Breakdown</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {stats.sources.map((source, index) => (
                                        <div key={index} className={`p-3 rounded-lg border ${
                                            source.source.includes('DAWN') || source.source.includes('Pakistan') || source.source.includes('Urdu')
                                                ? 'bg-green-50 border-green-200'
                                                : 'bg-gray-50 border-gray-200'
                                        }`}>
                                            <div className="flex justify-between items-center">
                                                <span className={`text-sm font-medium ${
                                                    source.source.includes('DAWN') || source.source.includes('Pakistan') || source.source.includes('Urdu')
                                                        ? 'text-green-700'
                                                        : 'text-gray-700'
                                                }`}>
                                                    {source.source.includes('DAWN') || source.source.includes('Pakistan') || source.source.includes('Urdu') ? '🇵🇰 ' : ''}{source.source}
                                                </span>
                                                <span className="text-sm font-bold text-gray-900">{source.count}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Pakistani News Highlight */}
                        {stats.sources && stats.sources.some(s => s.source.includes('DAWN') || s.source.includes('Pakistan') || s.source.includes('Urdu')) && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <h4 className="text-md font-semibold text-green-800 mb-2">🇵🇰 Pakistani News Summary</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {stats.sources
                                        .filter(s => s.source.includes('DAWN') || s.source.includes('Pakistan') || s.source.includes('Urdu'))
                                        .map((source, index) => (
                                            <div key={index} className="text-center">
                                                <div className="text-lg font-bold text-green-700">{source.count}</div>
                                                <div className="text-sm text-green-600">{source.source}</div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Results */}
                <div className="bg-white rounded-lg shadow-sm">
                    <div className="p-6 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Archive Results
                            {pagination.total && (
                                <span className="text-sm font-normal text-gray-500 ml-2">
                                    ({pagination.total} articles found)
                                </span>
                            )}
                        </h3>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                            <p className="text-gray-600">Loading articles...</p>
                        </div>
                    ) : articles.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <ArchiveBoxIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                            <p>No articles found for the selected criteria.</p>
                            <p className="text-sm mt-2">Try adjusting your search parameters.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200">
                            {articles.map((article) => (
                                <div key={article.id} className="p-6 hover:bg-gray-50 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="text-lg font-semibold text-gray-900 line-clamp-2">
                                            {article.title}
                                        </h4>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSentimentColor(article.sentiment?.label)}`}>
                                            {article.sentiment?.label || 'Unknown'}
                                        </span>
                                    </div>
                                    
                                    <div className="flex items-center text-sm text-gray-500 mb-3">
                                        <ClockIcon className="mr-1 h-4 w-4" />
                                        {formatDate(article.date)}
                                        <span className="mx-2">•</span>
                                        <span className={`font-medium ${
                                            article.source.includes('DAWN') || article.source.includes('Pakistan') || article.source.includes('Urdu')
                                                ? 'text-green-600'
                                                : 'text-gray-700'
                                        }`}>
                                            {article.source.includes('DAWN') || article.source.includes('Pakistan') || article.source.includes('Urdu') ? '🇵🇰 ' : ''}{article.source}
                                        </span>
                                        {article.category && (
                                            <>
                                                <span className="mx-2">•</span>
                                                <span className={`px-2 py-1 rounded-full text-xs ${
                                                    article.category === 'Pakistan News'
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-gray-100 text-gray-600'
                                                }`}>
                                                    {article.category}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                    
                                    {article.content && (
                                        <p className="text-gray-700 line-clamp-3 mb-3">
                                            {article.content}
                                        </p>
                                    )}
                                    
                                    <div className="flex justify-between items-center">
                                        <button
                                            onClick={() => {
                                                if (article.url && !article.url.includes('example.com')) {
                                                    window.open(article.url, '_blank', 'noopener,noreferrer');
                                                } else {
                                                    // Show article content in a modal or alert for demo articles
                                                    alert(`Demo Article: ${article.title}\n\nThis is a sample article for demonstration purposes. In a real application, this would link to the actual news source.`);
                                                }
                                            }}
                                            className="text-blue-600 hover:text-blue-800 text-sm font-medium cursor-pointer"
                                        >
                                            {article.url && !article.url.includes('example.com') ? 'Read full article →' : 'View article details →'}
                                        </button>
                                        {article.sentiment?.score && (
                                            <span className="text-xs text-gray-500">
                                                Score: {article.sentiment.score.toFixed(2)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {renderPagination()}
                </div>
            </div>
        </div>
    );
};

export default Archive;
