import React from 'react';
import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';

interface WhatsAppButtonProps {
  url: string;
  label?: string;
  size?: 'sm' | 'md' | 'lg' | 'full';
  variant?: 'primary' | 'secondary' | 'outline';
  onClick?: (e: React.MouseEvent) => void;
}

export const WhatsAppButton: React.FC<WhatsAppButtonProps> = ({
  url,
  label = "Commander sur WhatsApp",
  size = 'md',
  variant = 'primary',
  onClick
}) => {
  const sizeClasses = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2.5 gap-2 font-medium',
    lg: 'text-base px-5 py-3.5 gap-2.5 font-semibold',
    full: 'w-full justify-center text-sm sm:text-base px-4 py-3 gap-2 font-semibold'
  }[size];

  const variantClasses = {
    primary: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-700/20 active:bg-emerald-800',
    secondary: 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/80 active:bg-emerald-200/60',
    outline: 'bg-white text-ink-900 border border-ink-200 hover:bg-warm-100 hover:border-ink-300'
  }[variant];

  return (
    <motion.a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 450, damping: 25 }}
      className={`inline-flex items-center rounded-xl transition-colors duration-150 cursor-pointer select-none ${sizeClasses} ${variantClasses}`}
    >
      {/* Official WhatsApp SVG Vector Icon */}
      <svg
        className="w-4 h-4 shrink-0 fill-current"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M17.507 14.307l-.009.075c-.322.846-1.523 1.644-2.115 1.708-.574.062-1.319.088-2.146-.179-1.393-.45-2.73-1.428-3.79-2.487-1.059-1.06-2.037-2.397-2.487-3.79-.267-.827-.241-1.572-.179-2.146.064-.592.862-1.793 1.708-2.115l.075-.009c.31-.035.631.065.862.274l1.455 1.319c.306.277.411.713.262 1.096l-.547 1.408c-.12.308-.035.656.216.877.688.604 1.464 1.38 2.068 2.068.221.251.569.336.877.216l1.408-.547c.383-.149.819-.044 1.096.262l1.319 1.455c.209.231.309.552.274.862z"/>
        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 1.821.487 3.53 1.338 5L2.1 21.9l4.9-.8A9.957 9.957 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.954 7.954 0 01-4.084-1.127l-.293-.174-3.03.495.503-2.946-.19-.303A7.962 7.962 0 014 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z"/>
      </svg>
      <span>{label}</span>
    </motion.a>
  );
};
