/// <reference types="vite/client" />

declare module 'lucide-react' {
  import { FC, SVGProps } from 'react';
  export interface LucideProps extends SVGProps<SVGSVGElement> {
    size?: string | number;
    color?: string;
    strokeWidth?: string | number;
  }
  export type Icon = FC<LucideProps>;
  export const Store: Icon;
  export const ShieldCheck: Icon;
  export const KeyRound: Icon;
  export const Search: Icon;
  export const Smartphone: Icon;
  export const MapPin: Icon;
  export const Phone: Icon;
  export const QrCode: Icon;
  export const Share2: Icon;
  export const CheckCircle: Icon;
  export const CheckCircle2: Icon;
  export const MessageCircle: Icon;
  export const MessageSquare: Icon;
  export const Eye: Icon;
  export const Layers: Icon;
  export const Calendar: Icon;
  export const Clock: Icon;
  export const X: Icon;
  export const Tag: Icon;
  export const Upload: Icon;
  export const Check: Icon;
  export const AlertCircle: Icon;
  export const AlertTriangle: Icon;
  export const Sparkles: Icon;
  export const Image: Icon;
  export const Printer: Icon;
  export const Download: Icon;
  export const ShoppingBag: Icon;
  export const ArrowUpDown: Icon;
  export const Plus: Icon;
  export const Trash2: Icon;
  export const Edit3: Icon;
  export const ExternalLink: Icon;
  export const Coins: Icon;
  export const RefreshCw: Icon;
  export const Lock: Icon;
  export const LogIn: Icon;
  export const LogOut: Icon;
  export const Copy: Icon;
}
