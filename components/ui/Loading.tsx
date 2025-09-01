import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingProps {
  className?: string;
}

export const Loading: React.FC<LoadingProps> = ({ className }) => {
  return (
    <div className={cn('flex items-center justify-center p-4', className)}>
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
    </div>
  );
};

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className }) => {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-gray-200',
        className
      )}
    />
  );
};

export const CoachCardSkeleton: React.FC = () => {
  return (
    <div className="rounded-brand border border-gray-200 bg-white shadow-brand-sm p-6 space-y-4">
      <div className="flex items-center space-x-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <div className="flex justify-between items-center">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  );
};