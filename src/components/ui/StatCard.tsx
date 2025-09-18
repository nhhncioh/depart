import React from 'react';
import { motion } from 'framer-motion';
import { Sparkline } from '../viz/Sparkline';
import { cardHover } from '@/lib/motion.utils';

interface StatCardProps {
  title: string;
  value: React.ReactNode;
  hint?: string;
  sparklineData?: number[];
  className?: string;
}

export function StatCard({ 
  title, 
  value, 
  hint, 
  sparklineData, 
  className = "" 
}: StatCardProps) {
  return (
    <motion.div 
      className={`card ${className}`}
      initial="rest"
      whileHover="hover"
      variants={cardHover}
    >
      <div className="card-inner" style={{ padding: '20px' }}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="kicker">
            {title}
          </div>
          <div className="time-big" style={{ fontSize: '24px', margin: '8px 0' }}>
            {value}
          </div>
          {hint && (
            <div className="help">
              {hint}
            </div>
          )}
        </div>
        {sparklineData && sparklineData.length > 0 && (
          <div className="ml-3 flex-shrink-0">
            <Sparkline 
              data={sparklineData} 
              width={120} 
              height={36}
              className="text-gray-400"
            />
          </div>
        )}
      </div>
      </div>
    </motion.div>
  );
}