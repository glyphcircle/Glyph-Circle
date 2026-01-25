
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useDb } from '../hooks/useDb';
import Card from './shared/Card';
import Modal from './shared/Modal';
import Button from './shared/Button';
import { cloudManager } from '../services/cloudManager';
import AdminContextHelp from './AdminContextHelp';
import RecursionErrorDisplay from './shared/RecursionErrorDisplay';

// --- MASTER SCHEMA FALLBACK (Ensures UI works on empty tables) ---
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
    featured_content: ['id', 'title', 'text', 'image_url', 'status']
};

// --- MAGIC BLUEPRINTS ---
const APP_BLUEPRINTS: Record<string, any[]> = {
    services: [
        { id: 'tarot', name: 'Imperial Tarot', price: 49, path: '/tarot', image: 'photo-1505537528343-4dc9b89823f6', description: 'Draw from the 78 mysteries of the Arcana.', status: 'active' },
        { id: 'palmistry', name: 'AI Palmistry', price: 49, path: '/palmistry', image: 'photo-1542553457-3f92a3449339', description: 'Scan your lines to reveal your lifeline and fate.', status: 'active' },
        { id: 'astrology', name: 'Vedic Astrology', price: 99, path: '/astrology', image: 'photo-1506318137071-a8bcbf90d114', description: 'Comprehensive Natal Chart and Planetary Analysis.', status: 'active' },
        { id: 'face-reading', name: 'Face Reading', price: 59, path: '/face-reading', image: 'photo-1531746020798-e6953c6e8e04', description: 'Discover personality through facial landmarks.', status: 'active' },
        { id: 'store', name: 'Vedic Store', price: 0, path: '/store', image: 'photo-1600609842388-3e4b489d71c6', description: 'Authentic spiritual artifacts.', status: 'active' }
    ],
    image_assets: [
        { id: 'header_logo', name: 'Header Logo', path: 'https://lh3.googleusercontent.com/d/1Mt-LsfsxuxNpGY0hholo8qkBv58S6VNO', tags: 'brand_logo', status: 'active' },
        { id: 'sacred_emblem', name: 'Sacred Emblem', path: 'https://lh3.googleusercontent.com/d/1Mt-LsfsxuxNpGY0hholo8qkBv58S6VNO', tags: 'brand_logo,emblem', status: 'active' }
    ]
};

const AdminDB: React.FC = () => {
  const { table } = useParams<{ table: string }>();
  const [searchParams] = useSearchParams(); 
  const { db, toggleStatus, createEntry, updateEntry, refresh, errorMessage } = useDb();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showBlueprints, setShowBlueprints] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const tableName = table || 'users';
  const data = db[tableName] || [];
  const blueprints = APP_BLUEPRINTS[tableName] || [];

  // Determine headers based on existing data OR master schema
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

  const applyBlueprint = (bp: any) => {
      const blueprintData: Record<string, string> = {};
      headers.forEach(h => {
          blueprintData[h] = bp[h] !== undefined ? String(bp[h]) : '';
      });
      setFormData(blueprintData);
      setShowBlueprints(false);
      setLastError(null);
  };

  const submitCreate = async () => {
      if (!formData.id && tableName !== 'users' && tableName !== 'readings') {
          setLastError("Missing ID: Please provide a unique key.");
          return;
      }
      setIsSaving(true);
      setLastError(null);
      try {
          await createEntry(tableName, formData);
          setIsCreateModalOpen(false);
          setFormData({});
          await refresh();
      } catch (e: any) { 
          setLastError(e.message.includes('row-level security') ? "Access Blocked: Run V25 SQL in Supabase Editor." : e.message);
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
          setLastError(e.message.includes('Timeout') ? "Latency Hang: Run V25 SQL in Supabase Editor." : e.message);
      } finally { setIsSaving(false); }
  };

  const isImageUrl = (val: any, colName: string) => {
      const str = String(val);
      if (!str || str === 'null' || str === '-') return false;
      const isUrl = str.startsWith('http') || str.startsWith('photo-') || str.includes('drive.google') || str.includes('googleusercontent');
      const isImgCol = colName.toLowerCase().includes('image') || colName.toLowerCase().includes('path') || colName.toLowerCase().includes('url') || colName.toLowerCase().includes('logo');
      return isUrl && isImgCol;
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
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Manifest Registry</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3 w-full lg:w-auto">
                    <div className="relative flex-grow">
                        <input 
                            type="text" placeholder="Search registry..." value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-black/60 border border-gray-800 rounded-xl px-10 py-3 text-white focus:border-amber-500 outline-none"
                        />
                        <svg className="w-4 h-4 text-gray-600 absolute left-4 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
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
                                <th className="p-4 border-b border-gray-800 text-right sticky right-0 bg-gray-900 z-10">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.filter((r:any) => JSON.stringify(r).toLowerCase().includes(searchTerm.toLowerCase())).map((row: any, i: number) => (
                                <tr key={row.id || i} className="hover:bg-white/[0.03] border-b border-gray-900 transition-colors group">
                                    {headers.map(h => (
                                        <td key={h} className="p-4 text-[11px] font-mono">
                                            {h === 'status' ? (
                                                <button 
                                                    onClick={() => toggleStatus(tableName, row.id)}
                                                    className={`px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest transition-all ${row[h] === 'active' ? 'bg-green-900/30 text-green-400 border-green-500/30 hover:bg-green-900/50' : 'bg-red-900/30 text-red-400 border-red-500/30 hover:bg-red-900/50'}`}
                                                >
                                                    {row[h] || 'inactive'}
                                                </button>
                                            ) : isImageUrl(row[h], h) ? (
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded bg-black border border-gray-700 overflow-hidden flex-shrink-0 group-hover:scale-[2.5] group-hover:z-50 group-hover:translate-x-12 transition-all shadow-xl">
                                                        <img 
                                                          src={cloudManager.resolveImage(row[h])} 
                                                          className="w-full h-full object-cover" 
                                                          alt="Preview" 
                                                          loading="lazy"
                                                          onError={(e) => {
                                                              e.currentTarget.style.display = 'none';
                                                              e.currentTarget.parentElement!.classList.add('bg-red-900/20');
                                                          }} 
                                                        />
                                                    </div>
                                                    <span className="opacity-40 truncate max-w-[80px] text-[9px]">{String(row[h]).substring(0, 15)}...</span>
                                                </div>
                                            ) : (
                                                <div className="truncate max-w-[200px]" title={String(row[h])}>
                                                    {typeof row[h] === 'object' ? '{...}' : String(row[h] || '-')}
                                                </div>
                                            )}
                                        </td>
                                    ))}
                                    <td className="p-4 text-right sticky right-0 bg-black/90 backdrop-blur z-10">
                                        <button onClick={() => openEditModal(row)} className="text-amber-500 hover:text-white font-black uppercase text-[10px] tracking-widest border border-amber-500/30 hover:border-amber-500 px-3 py-1 rounded-lg transition-all">Edit</button>
                                    </td>
                                </tr>
                            ))}
                            {data.length === 0 && (
                                <tr>
                                    <td colSpan={headers.length + 1} className="p-24 text-center text-gray-700 font-cinzel tracking-[0.3em] uppercase text-xs italic">
                                        No entries found in {tableName}.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>

        {/* CREATE MODAL */}
        <Modal isVisible={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)}>
            <div className="p-8 bg-[#0b0c15] border border-amber-500/30 rounded-2xl max-w-2xl w-full shadow-[0_0_100px_rgba(0,0,0,0.8)]">
                <div className="flex justify-between items-center mb-8">
                    <h3 className="text-2xl font-cinzel font-black text-amber-100 uppercase tracking-widest">New Manifestation</h3>
                    {blueprints.length > 0 && (
                        <button 
                            onClick={() => setShowBlueprints(!showBlueprints)}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg animate-pulse"
                        >
                            ✨ Magic Fill
                        </button>
                    )}
                </div>

                {showBlueprints && (
                    <div className="mb-8 grid grid-cols-2 gap-3 max-h-48 overflow-y-auto p-4 bg-black/40 border border-indigo-500/30 rounded-xl custom-scrollbar animate-fade-in-up">
                        {blueprints.map((bp, i) => (
                            <button key={i} onClick={() => applyBlueprint(bp)} className="p-3 bg-gray-900 hover:bg-indigo-900/30 border border-gray-800 text-left text-[10px] font-bold text-indigo-200 rounded-xl transition-all flex items-center gap-2">
                                <span className="text-lg">✦</span> {bp.name || bp.id}
                            </button>
                        ))}
                    </div>
                )}

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

                {lastError && (
                    <div className="mt-6 p-4 bg-red-900/20 border border-red-500/30 rounded-xl text-red-400 text-[10px] italic animate-shake">
                        ⚠️ Error: {lastError}
                    </div>
                )}
                
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
                <h3 className="text-2xl font-cinzel font-black text-amber-100 mb-8 uppercase tracking-widest">Modify Registry</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                    {Object.keys(formData).map(key => (
                        <div key={key} className={key === 'description' || key === 'text' ? 'md:col-span-2' : ''}>
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
                {lastError && <div className="mt-6 p-4 bg-red-900/10 border border-red-500/30 rounded-xl text-red-400 text-[10px] leading-relaxed italic animate-shake">{lastError}</div>}
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
