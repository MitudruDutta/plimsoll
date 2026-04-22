import * as React from 'react';
import { cn } from '../ui/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

export interface AnalysisStep {
  id: string;
  agent: 'analyzer' | 'researcher' | 'gap_analyst';
  status: 'pending' | 'running' | 'complete' | 'error';
  title: string;
  description: string;
  detail?: string;
}

interface AnalysisProgressProps {
  steps: AnalysisStep[];
  currentStep: number;
  isRunning: boolean;
  className?: string;
}

const AGENT_ICONS: Record<string, React.ReactNode> = {
  analyzer: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  researcher: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  gap_analyst: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
};

const STATUS_STYLES = {
  pending: {
    circle: 'bg-gray-200 text-gray-400',
    text: 'text-gray-400',
    line: 'bg-gray-200'
  },
  running: {
    circle: 'bg-blue-100 text-blue-600 animate-pulse',
    text: 'text-blue-600',
    line: 'bg-blue-200'
  },
  complete: {
    circle: 'bg-green-100 text-green-600',
    text: 'text-green-600',
    line: 'bg-green-500'
  },
  error: {
    circle: 'bg-red-100 text-red-600',
    text: 'text-red-600',
    line: 'bg-red-500'
  }
};

export function AnalysisProgress({
  steps,
  currentStep,
  isRunning,
  className
}: AnalysisProgressProps) {
  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          Document Analysis
          {isRunning && (
            <span className="ml-2 text-sm font-normal text-blue-600 animate-pulse">
              Processing...
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {steps.map((step, index) => {
            const styles = STATUS_STYLES[step.status];
            const isLast = index === steps.length - 1;

            return (
              <div key={step.id} className="relative flex gap-4 pb-6 last:pb-0">
                {/* Vertical line */}
                {!isLast && (
                  <div
                    className={cn(
                      'absolute left-[15px] top-[36px] w-0.5 h-[calc(100%-36px)]',
                      index < currentStep ? 'bg-green-500' : 'bg-gray-200'
                    )}
                  />
                )}

                {/* Circle with icon */}
                <div
                  className={cn(
                    'relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-colors',
                    styles.circle
                  )}
                >
                  {step.status === 'complete' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : step.status === 'error' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  ) : (
                    AGENT_ICONS[step.agent]
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 pt-0.5">
                  <h4 className={cn('text-sm font-medium', styles.text)}>
                    {step.title}
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {step.description}
                  </p>
                  {step.detail && step.status === 'running' && (
                    <p className="text-xs text-blue-500 mt-1 animate-pulse">
                      {step.detail}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export const DEFAULT_ANALYSIS_STEPS: AnalysisStep[] = [
  {
    id: 'analyze',
    agent: 'analyzer',
    status: 'pending',
    title: 'Document Analyzer',
    description: 'Classifying documents and extracting metadata'
  },
  {
    id: 'research',
    agent: 'researcher',
    status: 'pending',
    title: 'Requirements Researcher',
    description: 'Determining required documents for your route'
  },
  {
    id: 'gap',
    agent: 'gap_analyst',
    status: 'pending',
    title: 'Gap Analyst',
    description: 'Comparing documents and generating recommendations'
  }
];

export const MISSING_DOCS_ANALYSIS_STEPS: AnalysisStep[] = [
  {
    id: 'requirements',
    agent: 'researcher',
    status: 'pending',
    title: 'Route Requirements Analyst',
    description: 'Identifying all required documents for each port on the route'
  },
  {
    id: 'gap_detection',
    agent: 'gap_analyst',
    status: 'pending',
    title: 'Document Gap Detector',
    description: 'Comparing vessel documents against requirements'
  }
];

export default AnalysisProgress;
