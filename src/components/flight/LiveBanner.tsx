import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getLocalTime, getRelativeTime } from '../../lib/time';

interface LiveBannerProps {
  flightNumber: string;
  status: 'scheduled' | 'boarding' | 'departed' | 'arrived' | 'delayed' | 'cancelled';
  gate?: string;
  leaveByTime: string; // ISO string
  className?: string;
}

export function LiveBanner({ 
  flightNumber, 
  status, 
  gate, 
  leaveByTime, 
  className = "" 
}: LiveBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMounted, setIsMounted] = useState(false);

  // Mount detection
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Scroll detection
  useEffect(() => {
    if (!isMounted) return;
    
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsVisible(scrollY > 120);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMounted]);

  // Update current time every 30 seconds for countdown
  useEffect(() => {
    if (!isMounted) return;
    
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);

    return () => clearInterval(interval);
  }, [isMounted]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-gray-500';
      case 'boarding':
        return 'bg-blue-500';
      case 'departed':
        return 'bg-green-500';
      case 'arrived':
        return 'bg-green-600';
      case 'delayed':
        return 'bg-amber-500';
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'On Time';
      case 'boarding':
        return 'Boarding';
      case 'departed':
        return 'Departed';
      case 'arrived':
        return 'Arrived';
      case 'delayed':
        return 'Delayed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const calculateCountdown = () => {
    const leaveBy = new Date(leaveByTime);
    const now = currentTime;
    const diffMs = leaveBy.getTime() - now.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes <= 0) {
      return { text: 'Leave now!', urgent: true };
    } else if (diffMinutes < 60) {
      return { 
        text: `Leave in ${diffMinutes}m`, 
        urgent: diffMinutes <= 15 
      };
    } else {
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      return { 
        text: minutes > 0 ? `Leave in ${hours}h ${minutes}m` : `Leave in ${hours}h`, 
        urgent: false 
      };
    }
  };

  const countdown = calculateCountdown();

  // Don't render anything until mounted to avoid hydration mismatch
  if (!isMounted) {
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: -56, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -56, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={`fixed top-0 left-0 right-0 z-50 ${className}`}
          role="banner"
          aria-label="Flight status summary"
        >
          <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
            <div className="max-w-6xl mx-auto px-4 py-3">
              <div className="flex items-center justify-between">
                {/* Left side: Flight info */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <motion.div
                      className={`w-2 h-2 rounded-full ${getStatusColor(status)}`}
                      initial={{ scale: 1 }}
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ 
                        duration: 2, 
                        repeat: status === 'boarding' ? Infinity : 0,
                        ease: 'easeInOut' 
                      }}
                      aria-hidden="true"
                    />
                    <span 
                      className="font-semibold text-gray-900"
                      aria-label={`Flight ${flightNumber}`}
                    >
                      {flightNumber}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <span 
                      className="capitalize font-medium"
                      aria-label={`Status: ${getStatusText(status)}`}
                    >
                      {getStatusText(status)}
                    </span>
                    
                    {gate && (
                      <>
                        <span aria-hidden="true">•</span>
                        <span aria-label={`Gate ${gate}`}>
                          Gate {gate}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Right side: Countdown */}
                <div className="flex items-center">
                  <div 
                    className={`text-sm font-medium px-3 py-1.5 rounded-full ${
                      countdown.urgent 
                        ? 'bg-red-100 text-red-800 border border-red-200' 
                        : 'bg-blue-100 text-blue-800 border border-blue-200'
                    }`}
                    role="timer"
                    aria-label={`Departure countdown: ${countdown.text}`}
                    aria-live="polite"
                  >
                    {countdown.text}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}