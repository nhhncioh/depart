import React from 'react';

interface AlertAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

interface AlertStripProps {
  tone: 'info' | 'success' | 'warn' | 'danger';
  message: React.ReactNode;
  actions?: AlertAction[];
  className?: string;
}

export function AlertStrip({ 
  tone, 
  message, 
  actions, 
  className = "" 
}: AlertStripProps) {
  const toneStyles = {
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      buttonPrimary: 'bg-blue-600 hover:bg-blue-700 text-white',
      buttonSecondary: 'text-blue-600 hover:bg-blue-100 border-blue-300'
    },
    success: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-800',
      buttonPrimary: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      buttonSecondary: 'text-emerald-600 hover:bg-emerald-100 border-emerald-300'
    },
    warn: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-800',
      buttonPrimary: 'bg-amber-600 hover:bg-amber-700 text-white',
      buttonSecondary: 'text-amber-600 hover:bg-amber-100 border-amber-300'
    },
    danger: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      buttonPrimary: 'bg-red-600 hover:bg-red-700 text-white',
      buttonSecondary: 'text-red-600 hover:bg-red-100 border-red-300'
    }
  };

  const styles = toneStyles[tone];
  const role = (tone === 'warn' || tone === 'danger') ? 'alert' : 'status';

  return (
    <div 
      className={`rounded-lg border p-4 ${styles.bg} ${styles.border} ${className}`}
      role={role}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`flex-1 text-sm ${styles.text}`}>
          {message}
        </div>
        
        {actions && actions.length > 0 && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  action.variant === 'primary' 
                    ? styles.buttonPrimary
                    : `border ${styles.buttonSecondary}`
                }`}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}