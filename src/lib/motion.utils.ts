import { Variants } from 'framer-motion';

// Card hover animations
export const cardHover = {
  rest: {
    y: 0,
    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    transition: {
      duration: 0.2,
      ease: 'easeOut' as const
    }
  },
  hover: {
    y: -2,
    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    transition: {
      duration: 0.2,
      ease: 'easeOut' as const
    }
  }
};

// Status pulse animation
export const statusPulse = {
  scale: [1, 1.2, 1],
  transition: {
    duration: 0.6,
    ease: 'easeInOut' as const
  }
};

// Timeline staggered animations
export const timelineContainer: Variants = {
  hidden: {
    opacity: 0
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

export const timelineItem: Variants = {
  hidden: {
    opacity: 0,
    x: -20
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.4,
      ease: 'easeOut'
    }
  }
};

// Reusable spring configs
export const springs = {
  gentle: {
    type: 'spring' as const,
    stiffness: 300,
    damping: 30
  },
  snappy: {
    type: 'spring' as const,
    stiffness: 400,
    damping: 25
  },
  bouncy: {
    type: 'spring' as const,
    stiffness: 200,
    damping: 20
  }
};