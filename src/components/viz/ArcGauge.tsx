import React from 'react';

interface ArcGaugeProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function ArcGauge({ 
  value, 
  size = 48, 
  strokeWidth = 4, 
  className = "" 
}: ArcGaugeProps) {
  const normalizedValue = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (normalizedValue / 100) * circumference;

  const getColor = (val: number) => {
    if (val <= 25) return '#10b981'; // green
    if (val <= 50) return '#f59e0b'; // amber
    if (val <= 75) return '#f97316'; // orange
    return '#ef4444'; // red
  };

  return (
    <div className={`inline-block ${className}`}>
      <svg 
        width={size} 
        height={size} 
        className="transform -rotate-90"
        role="img"
        aria-label={`${normalizedValue}% gauge`}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-200"
        />
        
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor(normalizedValue)}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-300 ease-out"
        />
      </svg>
    </div>
  );
}