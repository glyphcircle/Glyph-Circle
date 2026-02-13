import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const MobileNavBar: React.FC = () => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  const NAV_ITEMS = [
    { path: '/home', icon: '🏠', label: 'Home' },
    { path: '/history', icon: '📜', label: 'History' },
    { path: '/store', icon: '🛒', label: 'Store' },
    { path: '/remedy', icon: '🧘', label: 'Guide' },
  ];

  return (
    <>
      {/* ✅ Safe area spacer for iOS devices */}
      <div className="h-20 md:h-0" aria-hidden="true"></div>

      {/* ✅ FIXED: Lower z-index (z-40), proper safe area, pointer-events control */}
      <nav
        className="fixed bottom-0 left-0 w-full bg-[#0F0F23]/95 backdrop-blur-xl border-t border-amber-500/20 z-40 safe-area-bottom"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex justify-around items-center h-16 px-2">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 h-full space-y-1 transition-all duration-200 active:scale-95 relative ${isActive(item.path)
                ? 'text-amber-400'
                : 'text-gray-400 hover:text-amber-200 active:text-amber-300'
                }`}
              style={{
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'rgba(245, 158, 11, 0.2)'
              }}
            >
              <span className={`text-2xl transition-transform duration-200 ${isActive(item.path) ? 'scale-110 -translate-y-0.5' : ''
                }`}>
                {item.icon}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider">
                {item.label}
              </span>
              {isActive(item.path) && (
                <span className="absolute bottom-1 w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse"></span>
              )}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
};

export default MobileNavBar;
