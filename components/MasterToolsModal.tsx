
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

  // 🔱 FOCUS: Only 'services' shortcuts active
  const TABLES = [
    { key: 'services', label: 'Offerings', icon: '🔮', color: 'text-amber-400', bg: 'bg-amber-900/20', border: 'border-amber-500/30' },
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
            a.download = `${table}_export.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (err) {}
        setDownloading(null);
    }, 500); 
  };

  return (
    <Modal isVisible={isVisible} onClose={onClose}>
      <div className="p-6 bg-[#0F0F23] rounded-xl border border-amber-500/20 w-full max-w-md mx-auto flex flex-col">
        <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
            <h2 className="text-2xl font-cinzel font-bold text-amber-100">Service Sanctum</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-white text-2xl">&times;</button>
        </div>

        <div className="grid grid-cols-1 gap-4 mb-6">
            {TABLES.map((t) => {
                const data = db[t.key] || [];
                return (
                    <div 
                        key={t.key}
                        onClick={() => handleNavigate(t.key)}
                        className={`group relative p-6 rounded-xl border ${t.border} ${t.bg} hover:bg-opacity-40 cursor-pointer transition-all hover:scale-[1.02] active:scale-95`}
                    >
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <span className="text-3xl">{t.icon}</span>
                                <div>
                                    <h3 className="font-cinzel font-black text-amber-100 uppercase tracking-widest">{t.label}</h3>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-tighter">Database Management</p>
                                </div>
                            </div>
                            <span className={`text-2xl font-bold font-mono ${t.color}`}>{data.length}</span>
                        </div>
                        <div className="mt-4 flex gap-2">
                             <button onClick={(e) => handleQuickAdd(e, t.key)} className="text-[9px] bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-full uppercase font-bold tracking-widest">+ Add New</button>
                             <button onClick={(e) => handleExportCSV(e, t.key)} className="text-[9px] bg-amber-500/20 hover:bg-amber-500/40 text-amber-400 px-3 py-1 rounded-full uppercase font-bold tracking-widest">CSV Export</button>
                        </div>
                    </div>
                );
            })}
        </div>

        <div className="grid grid-cols-1 gap-4 pt-4 border-t border-gray-800">
            <button 
                onClick={() => { onClose(); navigate('/admin/dashboard'); }} 
                className="bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white text-xs py-3 rounded-lg font-bold transition-all uppercase tracking-widest"
            >
                Back to Dashboard
            </button>
        </div>
      </div>
    </Modal>
  );
};

export default MasterToolsModal;
