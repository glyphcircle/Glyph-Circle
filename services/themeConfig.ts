
export type ThemeId = 'default' | 'diwali' | 'holi' | 'navratri' | 'divine';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  icon: string;
  backgrounds: string[]; // URLs for Home Slider
  cssClass: string; // Tailwind class for base background
  accentColor: string;
}

export const THEMES: Record<ThemeId, ThemeConfig> = {
  default: {
    id: 'default',
    name: 'Mystic Night',
    icon: '🌙',
    backgrounds: [
      'https://images.unsplash.com/photo-1531162232855-369463387517?q=80&w=1920',
      'https://images.unsplash.com/photo-1515524738708-327f6b0037a2?q=80&w=1920',
      'https://images.unsplash.com/photo-1605333116398-1c39a3f898e3?q=80&w=1920',
      'https://images.unsplash.com/photo-1590387120759-4f86a5578507?q=80&w=1920',
    ],
    cssClass: 'bg-midnight',
    accentColor: 'text-amber-400'
  },
  diwali: {
    id: 'diwali',
    name: 'Royal Maroon',
    icon: '🪔',
    backgrounds: [
      'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?q=80&w=1920', // Sparklers/Lights
      'https://images.unsplash.com/photo-1543429268-b737898e7e46?q=80&w=1920', // Diyas
      'https://images.unsplash.com/photo-1605629232363-2591dd8b7623?q=80&w=1920', // Rangoli/Lanterns
    ],
    cssClass: 'bg-maroon-950', // Deep Red base
    accentColor: 'text-gold-500'
  },
  holi: {
    id: 'holi',
    name: 'Holi Colors',
    icon: '🎨',
    backgrounds: [
      'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1920', // Color Powder
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1920', // Event
      'https://images.unsplash.com/photo-1615966650071-855b15f29ad1?q=80&w=1920', // Paint Splash
    ],
    cssClass: 'bg-slate-900', // Slightly lighter dark mode to let colors pop
    accentColor: 'text-neon-magenta'
  },
  navratri: {
    id: 'navratri',
    name: 'Rose Quartz',
    icon: '🔱',
    backgrounds: [
      'https://images.unsplash.com/photo-1601306342673-0b6fd4739c38?q=80&w=1920', // Festive India
      'https://images.unsplash.com/photo-1634320722359-009d6b2c0024?q=80&w=1920', // Durga/Festive
      'https://images.unsplash.com/photo-1567591414240-e13630603713?q=80&w=1920', // Gold Texture
    ],
    cssClass: 'bg-indigo-950',
    accentColor: 'text-amber-300'
  },
  divine: {
    id: 'divine',
    name: 'Divine Blue',
    icon: '🧘',
    backgrounds: [
        'https://images.unsplash.com/photo-1506318137071-a8bcbf90d114?q=80&w=1920', // Calm sky
        'https://images.unsplash.com/photo-1532274402911-5a369e4c4bb5?q=80&w=1920', // Clouds
    ],
    cssClass: 'bg-blue-900',
    accentColor: 'text-yellow-400'
  }
};
