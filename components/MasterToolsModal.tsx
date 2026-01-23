
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDb } from '../hooks/useDb';
import Modal from './shared/Modal';

interface MasterToolsModalProps {
  isVisible: boolean;
  onClose: () => void;
}

const MasterToolsModal: React.FC<MasterToolsModalProps> = ({ isVisible, onClose }) => {
  const { db } = useDb();
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState<string | null>(null);

  const TABLES = [
    { key: 'store_items', label: 'Inventory', icon: '🛒', color: 'text-green-400', bg: 'bg-green-900/20', border: 'border-green-500/30' },
    { key: 'users', label: 'Seekers', icon: '👥', color: 'text-blue-400', bg: 'bg-blue-900/20', border: 'border-blue-500/30' },
    { key: 'readings', label: 'Readings', icon: '🔮', color: 'text-purple-400', bg: 'bg-purple-900/20', border: 'border-purple-500/30' },
    { key: 'transactions', label: 'Revenue', icon: '💰', color: 'text-amber-400', bg: 'bg-amber-900/20', border: 'border-amber-500/30' },
    { key: 'feedback', label: 'Feedback', icon: '💬', color: 'text-pink-400', bg: 'bg-pink-900/20', border: 'border-pink-500/30' },
    { key: 'config', label: 'System Config', icon: '⚙️', color: 'text-gray-400', bg: 'bg-gray-800/50', border: 'border-gray-600/30' },
  ];

  const handleNavigate = (table: string) => {
    onClose();
    navigate(`/admin/db/${table}`);
  };

  const handleQuickAdd = (e: React.MouseEvent, table: string) => {
    e.stopPropagation();
    onClose();
    navigate(`/admin/db/${table}?create=true`);
  };

  const handleExportCSV = (e: React.MouseEvent, table: string) => {
    e.stopPropagation();
    setDownloading(table);
    
    setTimeout(() => {
        try {
            const data = db[table as keyof typeof db] || [];
            if (data.length === 0) {
                alert("No records to export.");
                setDownloading(null);
                return;
            }
            const headers = Object.keys(data[0]).join(',');
            const rows = data.map((row: any) => Object.values(row).map(v => `"${v}"`).join(','));
            const csv = [headers, ...rows].join('\n');
            
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${table}_export_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (err) {
            console.error(err);
        }
        setDownloading(null);
    }, 800); 
  };

  const recentActivity = useMemo(() => {
      const activities = [];
      if (db.users) db.users.forEach((u: any) => activities.push({ type: 'User Joined', text: u.name, time: u.created_at, icon: '👤' }));
      if (db.transactions) db.transactions.forEach((p: any) => activities.push({ type: 'Payment', text: `Order #${p.id.toString().slice(-4)}`, time: p.created_at, icon: '💰' }));
      if (db.readings) db.readings.forEach((r: any) => activities.push({ type: 'Reading', text: r.type, time: r.created_at, icon: '📜' }));

      return activities
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        .slice(0, 3);
  }, [db]);

  return (
    <Modal isVisible={isVisible} onClose={onClose}>
      <div className="p-6 bg-[#0F0F23] rounded-xl border border-amber-500/20 w-full max-w-2xl mx-auto flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center animate-pulse">
                    <span className="text-xl">🛠️</span>
                </div>
                <div>
                    <h2 className="text-2xl font-cinzel font-bold text-amber-100">Master Tools</h2>
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <p className="text-[10px] text-green-400 font-mono tracking-widest uppercase">System Active</p>
                    </div>
                </div>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors text-2xl">&times;</button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6 overflow-y-auto custom-scrollbar pr-2 flex-grow">
            {TABLES.map((t) => {
                const data = db[t.key as keyof typeof db] || [];
                const count = data.length;
                const activeCount = data.filter((r: any) => r.status === 'active').length;
                const inactiveCount = count - activeCount;

                return (
                    <div 
                        key={t.key}
                        onClick={() => handleNavigate(t.key)}
                        className={`group relative p-4 rounded-xl border ${t.border} ${t.bg} hover:bg-opacity-40 cursor-pointer transition-all hover:scale-[1.02] active:scale-95`}
                    >
                        <button 
                            onClick={(e) => handleQuickAdd(e, t.key)}
                            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/10 hover:bg-white/30 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity z-20"
                            title="Quick Add Record"
                        >
                            +
                        </button>

                        <div className="flex justify-between items-start mb-3">
                            <span className="text-2xl filter drop-shadow-lg">{t.icon}</span>
                            <div className="text-right">
                                <span className={`text-xl font-bold font-mono ${t.color}`}>{count}</span>
                            </div>
                        </div>
                        
                        <h3 className="text-sm font-bold text-gray-200 mb-1">{t.label}</h3>
                        
                        <div className="flex gap-2 text-[10px] text-gray-400 font-mono">
                            {activeCount > 0 && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>{activeCount}</span>}
                            {inactiveCount > 0 && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>{inactiveCount}</span>}
                        </div>

                        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-2 rounded-b-xl">
                             <button 
                                onClick={(e) => handleExportCSV(e, t.key)}
                                className="text-[10px] bg-gray-800 hover:bg-gray-700 text-white px-2 py-1 rounded shadow flex items-center gap-1"
                             >
                                 {downloading === t.key ? '⏳' : '📥 CSV'}
                             </button>
                        </div>
                    </div>
                );
            })}
        </div>

        {/* Recent Activity Feed */}
        <div className="bg-black/20 rounded-lg p-3 border border-gray-800 mb-4">
            <h4 className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2 flex justify-between items-center">
                <span>Recent Cosmic Activity</span>
                <span className="text-[9px] bg-gray-800 px-1 rounded">LIVE</span>
            </h4>
            <div className="space-y-2">
                {recentActivity.map((act, i) => (
                    <div key={i} className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2">
                            <span>{act.icon}</span>
                            <span className="text-gray-300">{act.type}: <strong className="text-white">{act.text}</strong></span>
                        </div>
                        <span className="text-gray-600 font-mono text-[10px]">
                            {new Date(act.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                    </div>
                ))}
                {recentActivity.length === 0 && <div className="text-gray-600 text-xs italic">No recent activity detected.</div>}
            </div>
        </div>

        {/* Footer Actions */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-800">
            <button 
                onClick={() => { onClose(); navigate('/admin/dashboard'); }} 
                className="bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white text-xs py-2.5 rounded-lg font-bold transition-all uppercase tracking-widest"
            >
                Dashboard
            </button>
            <button 
                onClick={() => { onClose(); navigate('/admin/config'); }} 
                className="bg-skin-accent hover:opacity-90 border border-skin-border text-skin-button-text text-xs py-2.5 rounded-lg font-bold transition-all uppercase tracking-widest shadow-lg"
            >
                Full Config
            </button>
        </div>
      </div>
    </Modal>
  );
};

export default MasterToolsModal;
