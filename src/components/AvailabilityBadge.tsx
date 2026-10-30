import React from 'react';
import { CheckCircle2, Clock } from 'lucide-react';
import { formatDate } from '../utils/formatters';
import { useLanguage } from '../utils/i18n';

interface AvailabilityBadgeProps {
  isAvailable: boolean | number;
  restockDate?: string | null;
  size?: 'sm' | 'md' | 'lg';
}

export const AvailabilityBadge: React.FC<AvailabilityBadgeProps> = ({
  isAvailable,
  restockDate,
  size = 'md'
}) => {
  const { language, t } = useLanguage();
  const available = Boolean(isAvailable);

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2'
  }[size];

  if (available) {
    return (
      <span className={`inline-flex items-center font-medium rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-xs ${sizeClasses}`}>
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-600"></span>
        </span>
        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
        <span>{t.storefront.inStock}</span>
      </span>
    );
  }

  const dateFormatted = formatDate(restockDate, language);

  return (
    <span className={`inline-flex items-center font-medium rounded-full bg-amber-50 text-amber-900 border border-amber-200/90 shadow-xs ${sizeClasses}`}>
      <Clock className="w-3 h-3 text-amber-700 shrink-0" />
      <span>
        {restockDate
          ? `${t.storefront.restockingOn} ${dateFormatted}`
          : t.storefront.restockingSoon}
      </span>
    </span>
  );
};
