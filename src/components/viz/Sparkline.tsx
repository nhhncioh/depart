import React from 'react';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
}

export function Sparkline({ 
  data, 
  width = 140, 
  height = 36, 
  className = "" 
}: SparklineProps) {
  if (!data || data.length < 2) {
    return <div className={`inline-block ${className}`} style={{ width, height }} />;
  }

  const minValue = Math.min(...data);
  const maxValue = Math.max(...data);
  const range = maxValue - minValue;
  
  // Avoid division by zero
  const safeRange = range === 0 ? 1 : range;
  
  // Create path points
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - minValue) / safeRange) * height;
    return `${x},${y}`;
  }).join(' L ');

  const pathData = `M ${points}`;

  return (
    <svg 
      width={width} 
      height={height} 
      className={`inline-block ${className}`}
      viewBox={`0 0 ${width} ${height}`}
    >
      <path
        d={pathData}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}