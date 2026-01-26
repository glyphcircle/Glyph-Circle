
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useDb } from '../hooks/useDb';
import Card from './shared/Card';
import Modal from './shared/Modal';
import Button from './shared/Button';
import { cloudManager } from '../services/cloudManager';
import AdminContextHelp from './AdminContextHelp';
import RecursionErrorDisplay from './shared/RecursionErrorDisplay';
import { v4 as uuidv4 } from 'uuid';

// --- MASTER SCHEMA FALLBACK ---
const MASTER_SCHEMA: Record<string, string[]> = {
    services: ['id', 'name', 'price', 'path', 'status', 'image', 'description'],
    image_assets: ['id', 'name', 'path', 'tags', 'status'],
    config: ['id', 'key', 'value', 'status'],
    store_items: ['id', 'name', 'price', 'category', 'image_url', 'stock', 'status', 'description'],
    payment_providers: ['id', 'name', 'provider_type', 'is_active', 'currency', 'api_key', 'country_codes', 'status'],
    payment_methods: ['id', 'name', 'logo_url', 'type', 'status'],
    cloud_providers: ['id', 'provider', 'name', 'is_active', 'status', 'api_key', 'folder_id'],
    report_formats: ['id', 'name', 'url', 'status'],
    ui_themes: ['id', 'name', 'css_class', 'accent_color', 'status'],
    featured_content: ['id', 'title', 'text', 'image_url', 'status'],
    gemstones: ['id', 'name', 'planet', 'sanskrit', 'benefits', 'mantra', 'image', 'status']
};

const AdminDB: React.FC = () => {
  const { table } = useParams<{ table: string }>();
  const [searchParams] = useSearchParams(); 
  const { db, toggleStatus, createEntry, updateEntry, refresh, errorMessage } = useDb();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const tableName = table || 'users';
  const data = db[tableName] || [];

  const headers = useMemo(() => {
    if (data.length > 0) {
        return Array.from(new Set(data.flatMap((record: any) => Object.keys(record))));
    }
    return MASTER_SCHEMA[tableName] || ['id', 'status'];
  }, [data, tableName]);

  const handleRefresh = async () => {
      setIsRefreshing(true);
      await refresh();
      setTimeout(() => setIsRefreshing(false), 800);
  };

  const submitCreate = async () => {
      const finalData = { ...formData };
      if (!finalData.id) {
          finalData.id = uuidv4();
      }

      setIsSaving(true);
      setLastError(null);
      try {
          await createEntry(tableName, finalData);
          setIsCreateModalOpen(false);
          setFormData({});
          await refresh();
      } catch (e: any) { 
          setLastError(e.message.includes('row-level security') ? "Access Denied: Admin session is looping. Run V30 Zenith script in Config." : e.message);
      } finally { setIsSaving(false); }
  };

  const openEditModal = (record: any) => {
      const editableData: Record<string, string> = {};
      headers.forEach(h => {
          if (!['created_at', 'updated_at'].includes(h)) {
              const val = record[h];
              editableData[h] = typeof val === 'object' ? JSON.stringify(val) : String(val || '');
          }
      });
      setFormData(editableData);
      setEditingId(record.id);
      setIsEditModalOpen(true);
      setLastError(null);
  };

  const handleToggle = (id: string | number) => {
      if (navigator.vibrate) navigator.vibrate(40);
      toggleStatus(tableName, id);
  };

  const submitEdit = async () => {
      if (!editingId) return;
      setIsSaving(true);
      setLastError(null);
      try {
          await updateEntry(tableName, editingId, formData);
          setIsEditModalOpen(false);
          setEditingId(null);
          setFormData({});
          await refresh();
      } catch (e: any) {
          setLastError(e.message.includes('Timeout') ? "Latency Hang: Run V30 Zenith script in Config." : e.message);
      } finally { setIsSaving(false); }
  };

  return (
    <div className="min-h-screen bg-[#030308] p-4 md:p-8 font-mono text-sm text-gray-300">
        <div className="max-w-7xl mx-auto">
            {errorMessage?.includes('Timeout') && <div className="mb-8"><RecursionErrorDisplay /></div>}

            <div className="flex flex-col lg:flex-row items-center justify-between mb-8 gap-6">
                <div className="flex items-center gap-4">
                    <Link to="/admin/config" className="bg-gray-900/50 p-2 rounded-lg text-amber-500 hover:text-white transition-colors border border-amber-500/20">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-cinzel font-black text-white capitalize tracking-widest">{tableName.replace(/_/g, ' ')}</h1>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Registry Manifestation</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3 w-full lg:w-auto">
                    <div className="relative flex-grow">
                        <input 
                            type="text" placeholder="Search records..." value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-black/60 border border-gray-800 rounded-xl px-10 py-3 text-white focus:border-amber-500 outline-none"
                        />
                    </div>
                    <button onClick={handleRefresh} className={`p-3 bg-gray-900 hover:bg-gray-800 rounded-xl border border-gray-700 text-amber-500 transition-all ${isRefreshing ? 'animate-spin' : ''}`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>
                    <button 
                        onClick={() => { setFormData({}); setIsCreateModalOpen(true); setLastError(null); }}
                        className="bg-gradient-to-r from-amber-600 to-amber-800 hover:brightness-110 text-white font-black py-3 px-8 rounded-xl shadow-xl transition-all uppercase tracking-widest text-[11px] whitespace-nowrap"
                    >
                        + New Entry
                    </button>
                </div>
            </div>

            <Card className="bg-black/40 border-gray-800 overflow-hidden backdrop-blur-xl shadow-2xl">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-900/80 text-gray-500">
                                {headers.map(h => (
                                    <th key={h} className="p-4 border-b border-gray-800 font-black uppercase text-[10px] tracking-[0.2em] whitespace-nowrap">{h}</th>
                                ))}
                                <th className="p-4 border-b border-gray-800 text-right sticky right-0 bg-gray-900 z-10">Status Toggle</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.filter((r:any) => JSON.stringify(r).toLowerCase().includes(searchTerm.toLowerCase())).map((row: any, i: number) => (
                                <tr key={row.id || i} className="hover:bg-white/[0.03] border-b border-gray-900 transition-colors group">
                                    {headers.map(h => (
                                        <td key={h} className="p-4 text-[11px] font-mono">
                                            <div className="truncate max-w-[200px]" title={String(row[h])}>
                                                {typeof row[h] === 'object' ? '{...}' : String(row[h] || '-')}
                                            </div>
                                        </td>
                                    ))}
                                    <td className="p-4 text-right sticky right-0 bg-black/90 backdrop-blur z-10">
                                        <div className="flex items-center justify-end gap-3">
                                            <button onClick={() => openEditModal(row)} className="text-amber-500/50 hover:text-white font-black uppercase text-[9px] tracking-widest transition-all">Edit</button>
                                            <button 
                                                onClick={() => handleToggle(row.id)}
                                                className={`w-20 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all ${row.status === 'active' ? 'bg-green-600 text-white border-green-400 shadow-lg' : 'bg-gray-800 text-gray-400 border-gray-600'}`}
                                            >
                                                {row.status === 'active' ? 'ON' : 'OFF'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>

        {/* CREATE MODAL */}
        <Modal isVisible={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)}>
            <div className="p-8 bg-[#0b0c15] border border-amber-500/30 rounded-2xl max-w-2xl w-full shadow-[0_0_100px_rgba(0,0,0,0.8)]">
                <h3 className="text-2xl font-cinzel font-black text-amber-100 uppercase tracking-widest mb-8">New Manifestation</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto custom-scrollbar pr-2">
                    {headers.filter(h => !['created_at', 'updated_at'].includes(h)).map(key => (
                        <div key={key} className={key === 'description' || key === 'text' ? 'md:col-span-2' : ''}>
                            <label className="block text-gray-500 text-[9px] uppercase font-black tracking-widest mb-1.5">{key}</label>
                            <input 
                                className="w-full bg-black border border-gray-800 rounded-xl p-3 text-white focus:border-amber-500 outline-none font-mono text-xs shadow-inner"
                                placeholder={`Enter ${key}`}
                                value={formData[key] || ''}
                                onChange={e => setFormData({...formData, [key]: e.target.value})}
                            />
                        </div>
                    ))}
                </div>
                {lastError && <div className="mt-6 p-4 bg-red-900/20 border border-red-500/30 rounded-xl text-red-400 text-[10px] italic">{lastError}</div>}
                <div className="mt-8 flex gap-4">
                    <Button onClick={submitCreate} disabled={isSaving} className="flex-1 bg-gradient-to-r from-amber-600 to-amber-800 text-[11px] font-black py-4 uppercase tracking-widest">
                        {isSaving ? 'Processing...' : 'Confirm Entry'}
                    </Button>
                    <button onClick={() => setIsCreateModalOpen(false)} className="flex-1 bg-gray-900 text-gray-500 hover:text-white rounded-xl text-[11px] font-black uppercase tracking-widest">Cancel</button>
                </div>
            </div>
        </Modal>

        {/* EDIT MODAL */}
        <Modal isVisible={isEditModalOpen} onClose={() => setIsEditModalOpen(false)}>
            <div className="p-8 bg-[#0b0c15] border border-amber-500/30 rounded-2xl max-w-2xl w-full">
                <h3 className="text-2xl font-cinzel font-black text-amber-100 mb-8 uppercase tracking-widest">Modify Manifestation</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                    {Object.keys(formData).map(key => (
                        <div key={key}>
                            <label className="block text-gray-500 text-[9px] uppercase font-black tracking-widest mb-1.5">{key}</label>
                            <input 
                                disabled={key === 'id'} 
                                className={`w-full bg-black border border-gray-800 rounded-xl p-3 text-white font-mono text-xs shadow-inner ${key === 'id' ? 'opacity-30' : 'focus:border-amber-500 outline-none'}`}
                                value={formData[key]}
                                onChange={e => setFormData({...formData, [key]: e.target.value})}
                            />
                        </div>
                    ))}
                </div>
                <div className="mt-8 flex gap-4">
                    <Button onClick={submitEdit} disabled={isSaving} className="flex-1 bg-gradient-to-r from-amber-600 to-amber-800 text-[11px] font-black py-4 uppercase tracking-widest shadow-2xl">
                        {isSaving ? 'Syncing...' : 'Update Registry'}
                    </Button>
                    <button onClick={() => setIsEditModalOpen(false)} className="flex-1 bg-gray-900 text-gray-500 rounded-xl text-[11px] font-black uppercase tracking-widest">Discard</button>
                </div>
            </div>
        </Modal>
        
        <AdminContextHelp context="db" />
    </div>
  );
};

export default AdminDB;
