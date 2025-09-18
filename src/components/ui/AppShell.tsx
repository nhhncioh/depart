import React from 'react';

interface AppShellProps {
  children: React.ReactNode;
  className?: string;
}

export function AppShell({ children, className = "" }: AppShellProps) {
  return (
    <main className={`min-h-screen bg-gray-50 py-8 ${className}`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {children}
      </div>
    </main>
  );
}

interface SectionProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Section({ title, children, className = "" }: SectionProps) {
  return (
    <section className={className}>
      {title && (
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

interface GridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

export function Grid({ children, columns = 1, className = "" }: GridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
  };

  return (
    <div className={`grid gap-6 ${gridCols[columns]} ${className}`}>
      {children}
    </div>
  );
}