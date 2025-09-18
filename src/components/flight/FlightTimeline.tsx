import React from 'react';
import { motion } from 'framer-motion';
import { timelineContainer, timelineItem } from '../../lib/motion.utils';
import { getLocalTime, createTimeElement } from '../../lib/time';

interface TimelineStep {
  label: string;
  time: Date;
  actualTime?: Date;
  status: 'completed' | 'current' | 'upcoming';
}

interface FlightTimelineProps {
  steps: TimelineStep[];
  className?: string;
}

export function FlightTimeline({ steps, className = "" }: FlightTimelineProps) {

  const getStatusColor = (status: TimelineStep['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'current':
        return 'bg-blue-500';
      case 'upcoming':
        return 'bg-gray-300';
    }
  };

  const getTextColor = (status: TimelineStep['status']) => {
    switch (status) {
      case 'completed':
        return 'text-gray-900';
      case 'current':
        return 'text-gray-900 font-medium';
      case 'upcoming':
        return 'text-gray-500';
    }
  };

  return (
    <motion.div 
      className={`space-y-4 ${className}`}
      initial="hidden"
      animate="visible"
      variants={timelineContainer}
    >
      {steps.map((step, index) => (
        <motion.div
          key={index}
          className="flex items-start gap-4"
          variants={timelineItem}
        >
          <div className="flex flex-col items-center">
            <div className={`w-3 h-3 rounded-full ${getStatusColor(step.status)}`} />
            {index < steps.length - 1 && (
              <div className="w-px h-8 bg-gray-200 mt-2" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className={`text-sm ${getTextColor(step.status)}`}>
              {step.label}
            </div>
            
            <div className="flex items-center gap-2 mt-1">
              <time 
                dateTime={step.time.toISOString()}
                className="text-xs text-gray-500"
                aria-label={`Planned time: ${getLocalTime(step.time.toISOString(), { includeDate: false })}`}
              >
                Planned: {getLocalTime(step.time.toISOString())}
              </time>
              
              {step.actualTime && (
                <>
                  <span className="text-gray-300" aria-hidden="true">•</span>
                  <time 
                    dateTime={step.actualTime.toISOString()}
                    className="text-xs text-gray-900"
                    aria-label={`Actual time: ${getLocalTime(step.actualTime.toISOString(), { includeDate: false })}`}
                  >
                    Actual: {getLocalTime(step.actualTime.toISOString())}
                  </time>
                  
                  {step.actualTime.getTime() !== step.time.getTime() && (
                    <span 
                      className={`text-xs px-1.5 py-0.5 rounded text-white ${
                        step.actualTime > step.time ? 'bg-red-500' : 'bg-green-500'
                      }`}
                      aria-label={`${step.actualTime > step.time ? 'Delayed by' : 'Early by'} ${Math.abs(Math.round((step.actualTime.getTime() - step.time.getTime()) / (1000 * 60)))} minutes`}
                    >
                      {step.actualTime > step.time ? '+' : ''}
                      {Math.round((step.actualTime.getTime() - step.time.getTime()) / (1000 * 60))}m
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}