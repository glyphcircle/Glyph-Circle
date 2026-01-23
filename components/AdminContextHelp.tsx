
import React, { useState, useRef, useEffect } from 'react';

interface HelpStep {
  title: string;
  desc: string;
}

interface AdminContextHelpProps {
  context: 'db' | 'cloud' | 'payment' | 'dashboard';
}

const HELP_CONTENT: Record<string, { title: string, steps: HelpStep[] }> = {
  dashboard: {
    title: 'Admin Dashboard Overview',
    steps: [
      { title: 'System Status', desc: 'Check the health of your Cloud (Supabase) and Cache (Local) connections.' },
      { title: 'Navigation', desc: 'Use the grid buttons to jump to specific configuration sections.' },
      { title: 'Security', desc: 'Use the "De-Authorize" button to safely lock the admin panel.' }
    ]
  },
  db: {
    title: 'Database Management Guide',
    steps: [
      { title: 'Enable/Disable Records', desc: 'Locate the "Active/Inactive" button in the Actions column on the right. Click it to toggle the status instantly.' },
      { title: 'Edit Content', desc: 'Click the blue "Edit" button. A modal will appear where you can modify fields. Ensure links (like images) are valid.' },
      { title: 'Add New Entry', desc: 'Click the "+ New Entry" button at the top right. Fill in the required fields. Leave ID blank for auto-generation.' },
      { title: 'Validation', desc: 'The system automatically checks if your image links match an active Cloud Provider.' }
    ]
  },
  cloud: {
    title: 'Cloud Provider Setup',
    steps: [
      { title: 'Add New Provider', desc: 'Click "+ NEW" in the sidebar. Select a provider type (e.g., Dropbox, Google Drive).' },
      { title: 'Configuration', desc: 'Enter a Name (e.g., "My Dropbox"). Enter any required API keys or Folder IDs. For public links, keys might be optional depending on provider.' },
      { title: 'Activation', desc: 'IMPORTANT: After saving, locate the provider in the list. Click the "OFF" button to toggle it to "● LIVE".' },
      { title: 'Multiple Clouds', desc: 'You can have multiple providers active simultaneously. The system will detect which one to use based on the link URL.' }
    ]
  },
  payment: {
    title: 'Payment Gateway Setup',
    steps: [
      { title: 'Select Provider', desc: 'Choose between Razorpay (India/Global), Stripe (Global), or PayPal.' },
      { title: 'Credentials', desc: 'Enter your Public Key (Client ID) and Secret Key. These are provided by your payment processor dashboard.' },
      { title: 'Region Locking', desc: 'Use "IN" for India-only gateways, or "GLOBAL" for worldwide. The app auto-switches based on user location.' },
      { title: 'Testing', desc: 'Use the "Initiate Test" button to verify credentials before going live.' }
    ]
  }
};

const AdminContextHelp: React.FC<AdminContextHelpProps> = ({ context }) => {
  const [isOpen, setIsOpen] = useState(false);
  const content = HELP_CONTENT[context] || HELP_CONTENT['db'];
  
  // Dragging State
  const [position, setPosition] = useState({ x: window.innerWidth - 80, y: window.innerHeight - 100 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  // --- MOUSE EVENTS ---
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  // --- TOUCH EVENTS (Mobile) ---
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    const touch = e.touches[0];
    dragOffset.current = {
      x: touch.clientX - position.x,
      y: touch.clientY - position.y
    };
  };

  // Global Move/Up listeners to handle dragging outside the button area
  useEffect(() => {
    const handleMove = (clientX: number, clientY: number) => {
      if (isDragging) {
        let newX = clientX - dragOffset.current.x;
        let newY = clientY - dragOffset.current.y;

        // Boundary Checks
        const maxX = window.innerWidth - 60;
        const maxY = window.innerHeight - 60;
        
        newX = Math.max(10, Math.min(newX, maxX));
        newY = Math.max(10, Math.min(newY, maxY));

        setPosition({ x: newX, y: newY });
      }
    };

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX, e.touches[0].clientY);

    const onEnd = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onEnd);
      window.addEventListener('touchmove', onTouchMove, { passive: false });
      window.addEventListener('touchend', onEnd);
    }

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [isDragging]);

  const handleClick = (e: React.MouseEvent) => {
      // Only toggle if we didn't drag significantly (prevents opening on drag release)
      if (!isDragging) {
          setIsOpen(!isOpen);
      }
  };

  return (
    <>
      {/* Floating Trigger */}
      <button
        ref={buttonRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onClick={handleClick}
        style={{ 
            left: `${position.x}px`, 
            top: `${position.y}px`,
            touchAction: 'none' // Critical for mobile drag
        }}
        className={`fixed z-[1000] w-14 h-14 rounded-full shadow-[0_0_20px_rgba(34,211,238,0.5)] font-bold text-xl flex items-center justify-center border-2 border-white/20 transition-transform active:scale-95 cursor-move ${isDragging ? 'bg-cyan-700 scale-110' : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:scale-105'}`}
        title="Drag me! Click for Help."
      >
        <span className="text-white pointer-events-none text-2xl drop-shadow-md">?</span>
      </button>

      {/* Help Window */}
      {isOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in-up">
          <div className="w-full max-w-md bg-gray-900 border border-cyan-500/30 rounded-xl shadow-2xl overflow-hidden relative">
            <div className="bg-gradient-to-r from-blue-900/50 to-cyan-900/50 p-4 border-b border-white/10 flex justify-between items-center">
              <h3 className="font-cinzel font-bold text-cyan-100 flex items-center gap-2">
                <span>🛡️</span> Admin Guide
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-cyan-200 hover:text-white text-2xl leading-none">&times;</button>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <h4 className="text-sm font-bold text-white mb-4 border-b border-gray-700 pb-2">{content.title}</h4>
              
              <div className="space-y-4">
                {content.steps.map((step, index) => (
                  <div key={index} className="relative pl-4 border-l-2 border-cyan-800">
                    <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-cyan-500"></div>
                    <h5 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1">{step.title}</h5>
                    <p className="text-sm text-gray-300 leading-relaxed">{step.desc}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 text-center">
                <button 
                    onClick={() => setIsOpen(false)}
                    className="bg-gray-800 hover:bg-gray-700 text-cyan-400 px-6 py-2 rounded text-xs font-bold uppercase tracking-wider"
                >
                    Close Guide
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminContextHelp;
