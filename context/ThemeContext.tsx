
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { THEMES, ThemeConfig, ThemeId } from '../services/themeConfig';
import { useDb } from '../hooks/useDb';

interface ThemeContextType {
  currentTheme: ThemeConfig;
  setTheme: (id: ThemeId) => void;
  availableThemes: ThemeConfig[]; // Exposed for switcher if needed
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
};

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { db } = useDb();
  
  // Default to local storage or 'default', but will be overridden by DB active state
  const [currentThemeId, setCurrentThemeId] = useState<ThemeId>(() => {
    return (localStorage.getItem('glyph_theme') as ThemeId) || 'default';
  });

  // Derived state for the actual config object
  const [activeConfig, setActiveConfig] = useState<ThemeConfig>(THEMES[currentThemeId] || THEMES['default']);

  useEffect(() => {
      // 1. Check DB for active theme
      const dbThemes = db.ui_themes || [];
      const activeDbTheme = dbThemes.find((t: any) => t.status === 'active');

      if (activeDbTheme) {
          // Construct config from DB row
          const newConfig: ThemeConfig = {
              id: activeDbTheme.id,
              name: activeDbTheme.name,
              icon: '🎨', // DB doesn't store icon yet, default to palette
              backgrounds: THEMES['default'].backgrounds, // Keep default BGs or add column later
              cssClass: activeDbTheme.css_class,
              accentColor: activeDbTheme.accent_color
          };
          
          setActiveConfig(newConfig);
          
          // Sync ID if it matches one of our presets, or use 'custom'
          if (THEMES[activeDbTheme.id as ThemeId]) {
              setCurrentThemeId(activeDbTheme.id as ThemeId);
          }
      } else {
          // Fallback to local state if DB is empty or loading
          setActiveConfig(THEMES[currentThemeId] || THEMES['default']);
      }
  }, [db.ui_themes, currentThemeId]);

  const setTheme = (id: ThemeId) => {
    // This is primarily for the legacy switcher. 
    // The new Admin Manager handles DB updates which trigger the Effect above.
    setCurrentThemeId(id);
    localStorage.setItem('glyph_theme', id);
    if (navigator.vibrate) navigator.vibrate(20);
  };

  useEffect(() => {
    // Apply data attribute to body for CSS variable targeting
    // If using DB theme, the ID might not match predefined 'data-theme' selectors unless we map them
    // For now, we rely on the `cssClass` being applied to the main wrapper in App.tsx
    // But we can also set a generic attribute
    document.body.setAttribute('data-theme', currentThemeId);
    
    // Inject dynamic colors if needed (for custom DB themes not in CSS)
    // This allows the DB 'accent_color' to work even if it's a hex code
    if (activeConfig.accentColor.startsWith('#')) {
        document.documentElement.style.setProperty('--color-primary-glow', activeConfig.accentColor);
    }
  }, [currentThemeId, activeConfig]);

  return (
    <ThemeContext.Provider value={{ 
        currentTheme: activeConfig, 
        setTheme,
        availableThemes: Object.values(THEMES) 
    }}>
      {children}
    </ThemeContext.Provider>
  );
};
