import React from 'react';

interface StorefrontSkeletonProps {
  count?: number;
}

export const StorefrontSkeleton: React.FC<StorefrontSkeletonProps> = ({ count = 6 }) => {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 w-full animate-pulse">
      {/* Header Banner Skeleton */}
      <div className="w-full h-36 sm:h-52 bg-ink-100 rounded-2xl mb-6 relative overflow-hidden" />

      {/* Profile info skeleton */}
      <div className="flex items-start gap-4 -mt-12 sm:-mt-16 px-4 mb-8">
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white p-1 shadow-elevated border border-ink-100 shrink-0">
          <div className="w-full h-full bg-ink-200/60 rounded-xl" />
        </div>
        <div className="flex-1 pt-6 sm:pt-8 space-y-2.5">
          <div className="h-6 w-48 bg-ink-200/80 rounded-lg" />
          <div className="h-4 w-64 bg-ink-100 rounded" />
          <div className="h-3 w-36 bg-ink-100 rounded" />
        </div>
      </div>

      {/* Category Pills Skeleton */}
      <div className="flex items-center gap-2 mb-6 overflow-hidden">
        <div className="h-8 w-24 bg-ink-200/70 rounded-xl" />
        <div className="h-8 w-28 bg-ink-100 rounded-xl" />
        <div className="h-8 w-24 bg-ink-100 rounded-xl" />
        <div className="h-8 w-32 bg-ink-100 rounded-xl" />
      </div>

      {/* Product Cards Grid Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5">
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={index}
            className="flex flex-col bg-white rounded-2xl border border-ink-100/90 shadow-subtle overflow-hidden"
          >
            {/* Image Skeleton */}
            <div className="w-full aspect-[4/3] bg-ink-100/80 relative" />

            {/* Content Skeleton */}
            <div className="p-3.5 sm:p-4 flex flex-col flex-1 justify-between gap-3">
              <div className="space-y-2">
                <div className="h-4 bg-ink-200/80 rounded w-3/4" />
                <div className="h-3 bg-ink-100 rounded w-full" />
                <div className="h-3 bg-ink-100 rounded w-2/3" />
              </div>

              <div className="pt-3 border-t border-ink-100/70 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="h-3 w-12 bg-ink-100 rounded" />
                  <div className="h-4 w-20 bg-ink-200/80 rounded" />
                </div>
                <div className="h-9 w-full bg-ink-200/60 rounded-xl" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
