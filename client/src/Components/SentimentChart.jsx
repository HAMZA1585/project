import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card.jsx';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const SentimentChart = ({ data, loading, onClick }) => {
  const COLORS = {
    Positive: '#4CAF50',
    Negative: '#F44336',
    Neutral: '#FFC107'
  };

  if (loading) {
    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Sentiment by Category</CardTitle>
            <CardDescription>Analyzing sentiment distribution across categories</CardDescription>
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
          <CardTitle className="text-xl font-semibold">Sentiment by Category</CardTitle>
          <CardDescription>Distribution of sentiment across different news categories</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                onClick={onClick}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [`${value} articles`, 'Count']}
                />
                <Legend />
                <Bar dataKey="Positive" stackId="a" fill={COLORS.Positive} name="Positive" />
                <Bar dataKey="Neutral" stackId="a" fill={COLORS.Neutral} name="Neutral" />
                <Bar dataKey="Negative" stackId="a" fill={COLORS.Negative} name="Negative" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default SentimentChart;