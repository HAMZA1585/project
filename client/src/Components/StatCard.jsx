import React from 'react';
import PropTypes from 'prop-types';

const StatCard = ({ title, value, icon, color }) => {
  // Use a fallback color to prevent errors
  const safeColor = color || '#6b7280';

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-xl p-6 h-full flex flex-col justify-between">
      {/* Header with icon in top-right */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          {/* Title - smaller and lighter */}
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            {title}
          </p>
          {/* Value - significantly larger and bolder */}
          <p className="text-5xl font-bold text-gray-900 dark:text-white leading-none">
            {value}
          </p>
        </div>
        {/* Icon in top-right corner */}
        <div className="ml-4 flex-shrink-0">
          {React.cloneElement(icon, { 
            className: "h-8 w-8", 
            style: { 
              color: safeColor
            } 
          })}
        </div>
      </div>
    </div>
  );
};

StatCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  icon: PropTypes.element.isRequired,
  color: PropTypes.string.isRequired,
};

export default StatCard;
