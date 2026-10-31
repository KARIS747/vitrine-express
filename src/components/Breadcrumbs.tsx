import React from 'react';
import { Home, ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
  active?: boolean;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  onHomeClick: () => void;
  className?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  items,
  onHomeClick,
  className = '',
}) => {
  // Generate schema.org structured data for SEO
  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Accueil',
        item: typeof window !== 'undefined' ? window.location.origin : 'https://vitrine-express.pages.dev',
      },
      ...items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 2,
        name: item.label,
      })),
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
      />
      <nav
        aria-label="Fil d'Ariane"
        className={`flex items-center gap-1.5 text-xs text-ink-500 dark:text-ink-400 overflow-x-auto whitespace-nowrap py-2 no-scrollbar ${className}`}
      >
        <button
          onClick={onHomeClick}
          className="inline-flex items-center gap-1 hover:text-ink-950 dark:hover:text-white transition-colors cursor-pointer"
          title="Retour à l'accueil"
        >
          <Home className="w-3.5 h-3.5" />
          <span className="font-medium">Accueil</span>
        </button>

        {items.map((item, index) => (
          <React.Fragment key={index}>
            <ChevronRight className="w-3.5 h-3.5 text-ink-300 dark:text-ink-600 shrink-0" />
            {item.active || !item.onClick ? (
              <span
                className="font-semibold text-ink-900 dark:text-ink-100 truncate max-w-[200px]"
                aria-current={item.active ? 'page' : undefined}
              >
                {item.label}
              </span>
            ) : (
              <button
                onClick={item.onClick}
                className="hover:text-ink-950 dark:hover:text-white transition-colors cursor-pointer truncate max-w-[160px]"
              >
                {item.label}
              </button>
            )}
          </React.Fragment>
        ))}
      </nav>
    </>
  );
};
