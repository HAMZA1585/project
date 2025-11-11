import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card.jsx';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const Trends = ({ data, loading }) => {
  const COLORS = {
    Positive: '#4CAF50',
    Negative: '#F44336',
    Neutral: '#FFC107'
  };

  // Define gradient IDs for each sentiment
  const GRADIENT_IDS = {
    Positive: 'positiveGradient',
    Negative: 'negativeGradient',
    Neutral: 'neutralGradient'
  };

  if (loading) {
    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Sentiment Trends</CardTitle>
            <CardDescription>Sentiment trends over time</CardDescription>
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
          <CardTitle className="text-xl font-semibold">Sentiment Trends</CardTitle>
          <CardDescription>Sentiment trends over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <defs>
                  <linearGradient id={GRADIENT_IDS.Positive} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.Positive} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={COLORS.Positive} stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id={GRADIENT_IDS.Negative} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.Negative} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={COLORS.Negative} stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id={GRADIENT_IDS.Neutral} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.Neutral} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={COLORS.Neutral} stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#666' }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#666' }}
                />
                <Tooltip 
                  formatter={(value, name) => [`${value} articles`, name]}
                  labelStyle={{ color: '#333' }}
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                />
                <Area
                  type="monotone"
                  dataKey="Positive"
                  stackId="1"
                  stroke={COLORS.Positive}
                  fill={`url(#${GRADIENT_IDS.Positive})`}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="Neutral"
                  stackId="1"
                  stroke={COLORS.Neutral}
                  fill={`url(#${GRADIENT_IDS.Neutral})`}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="Negative"
                  stackId="1"
                  stroke={COLORS.Negative}
                  fill={`url(#${GRADIENT_IDS.Negative})`}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default Trends;