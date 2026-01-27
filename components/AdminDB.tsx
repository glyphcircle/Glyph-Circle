
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useDb } from '../hooks/useDb';
import { dbService } from '../services/db';
import Card from './shared/Card';
import Modal from './shared/Modal';
import Button from './shared/Button';
import { cloudManager } from '../services/cloudManager';
import AdminContextHelp from './AdminContextHelp';
import { v4 as uuidv4 } from 'uuid';

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
    gemstones: ['id', 'name', 'planet', 'sanskrit', 'benefits', 'mantra', 'image', 'status'],
    users: ['id', 'name', 'email', 'role', 'status', 'credits']
};

const AdminDB: React.FC = () => {
  const { table } = useParams<{ table: string }>();
  const [searchParams] = useSearchParams();
  const { db, toggleStatus, createEntry, deleteEntry, refresh, refreshTable } = useDb();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({}); 
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [originalData, setOriginalData] = useState<any>(null); 
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [processingId, setProcessingId] = useState<string | number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  
  const tableName = table || 'users';
  const data = db[tableName] || [];

  useEffect(() => {
    if (searchParams.get('create') === 'true') {
        setFormData({});
        setIsCreateModalOpen(true);
    }
  }, [searchParams]);

  const headers = useMemo<string[]>(() => {
    if (data.length > 0) return Array.from(new Set(data.flatMap((record: any) => Object.keys(record)))) as string[];
    return (MASTER_SCHEMA[tableName] || ['id', 'status']) as string[];
  }, [data, tableName]);

  const handleRefresh = async () => {
      setIsRefreshing(true);
      try { await refresh(); } finally { setTimeout(() => setIsRefreshing(false), 500); }
  };

  const handleToggle = async (id: string | number) => {
      setProcessingId(id);
      try { 
          await toggleStatus(tableName, id); 
      } catch (e: any) { 
          alert(`Toggle Failed: ${e.message}`); 
      } finally { 
          setProcessingId(null); 
      }
  };

  const openEditModal = (record: any) => {
      if (!record || !record.id) return;
      const editableData: Record<string, any> = {};
      headers.forEach(h => {
          if (!['created_at', 'updated_at'].includes(h)) {
              const val = record[h];
              if (typeof val === 'object' && val !== null) {
                  editableData[h] = JSON.stringify(val, null, 2);
              } else if (val === null || val === undefined) {
                  editableData[h] = '';
              } else {
                  editableData[h] = String(val);
              }
          }
      });
      setOriginalData({...record});
      setFormData(editableData);
      setEditingId(record.id);
      setActionError(null);
      setIsEditModalOpen(true);
  };

  const parseFieldValue = (raw: any) => {
    if (raw === null || raw === undefined) return null;
    const s = String(raw).trim();
    if (s === '') return null;

    // Handle Booleans
    if (s.toLowerCase() === 'true') return true;
    if (s.toLowerCase() === 'false') return false;

    // Handle Numbers
    if (!isNaN(Number(s)) && !/\s/.test(s) && !s.includes(',') && (!s.startsWith('0') || s === '0' || s.startsWith('0.'))) {
        return Number(s);
    }

    // Handle JSON Objects/Arrays
    if ((s.startsWith('{') && s.endsWith('}')) || (s.startsWith('[') && s.endsWith(']'))) {
        try {
            return JSON.parse(s);
        } catch {
            return s;
        }
    }

    return s;
  };

  const submitEdit = async () => {
      setIsSaving(true);
      setActionError(null);

      try {
          const payload: Record<string, any> = {};
          let hasChanges = false;

          Object.keys(formData).forEach(key => {
              if (key === 'id') return;
              const valRaw = formData[key];
              const parsed = parseFieldValue(valRaw);
              const originalVal = originalData ? originalData[key] : undefined;

              const changed = (typeof parsed === 'object' && parsed !== null)
                ? JSON.stringify(parsed) !== JSON.stringify(originalVal)
                : String(parsed ?? '') !== String(originalVal ?? '');

              if (changed) {
                  payload[key] = parsed;
                  hasChanges = true;
              }
          });

          if (!hasChanges) {
              setIsEditModalOpen(false);
              setIsSaving(false);
              return;
          }

          // 🔥 DIRECT RPC EXECUTION
          await dbService.callSecureAdminUpdate(tableName, editingId!, payload);

          // ✅ SUCCESS: Close modal and refresh local state
          setIsEditModalOpen(false);
          setEditingId(null);
          refreshTable(tableName);
          
      } catch (e: any) { 
          console.error("Update Failure:", e);
          setActionError(e.message || "Link severed by Gateway. Verify your clearance.");
      } finally { 
          // 🛡️ Ensure button is always unstuck
          setIsSaving(false); 
      }
  };

  return (
    <div className="min-h-screen bg-[#030308] p-4 md:p-8 font-mono text-sm text-gray-300">
        <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row items-center justify-between mb-8 gap-6">
                <div className="flex items-center gap-4">
                    <Link to="/admin/config" className="bg-gray-900/50 p-2 rounded-lg text-amber-500 hover:text-white border border-amber-500/20 shadow-lg"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg></Link>
                    <div>
                        <h1 className="text-3xl font-cinzel font-black text-white uppercase tracking-widest leading-none">{tableName.replace(/_/g, ' ')}</h1>
                        <p className="text-[9px] text-gray-600 uppercase tracking-[0.6em] mt-1">Direct Database Access</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3 w-full lg:w-auto">
                    <input type="text" placeholder="Search archive..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full lg:w-64 bg-black/60 border border-gray-800 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none transition-all shadow-inner" />
                    <button onClick={handleRefresh} className={`p-3 bg-gray-900 rounded-xl border border-gray-700 text-amber-500 shadow-lg hover:border-amber-500/50 transition-all ${isRefreshing ? 'animate-spin' : ''}`}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg></button>
                    <button onClick={() => { setFormData({}); setIsCreateModalOpen(true); }} className="bg-amber-600 hover:bg-amber-500 text-black font-black py-3 px-8 rounded-xl transition-all uppercase text-[11px] tracking-widest active:scale-95 shadow-xl">Genesis +</button>
                </div>
            </div>

            <Card className="bg-black/40 border-gray-800 overflow-hidden backdrop-blur-xl shadow-2xl relative rounded-3xl">
                {isRefreshing && <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-20 flex items-center justify-center"><div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div></div>}
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-900/90 text-gray-500">
                            <tr>
                                {headers.map(h => <th key={h} className="p-5 border-b border-gray-800 font-black uppercase text-[10px] tracking-widest">{h}</th>)}
                                <th className="p-5 border-b border-gray-800 text-right sticky right-0 bg-gray-900 z-10">Act</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-900">
                            {data.filter((r:any) => JSON.stringify(r).toLowerCase().includes(searchTerm.toLowerCase())).map((row: any, i: number) => (
                                <tr key={row.id || i} className="hover:bg-white/[0.03] transition-colors group/row">
                                    {headers.map(h => (
                                        <td key={h} className="p-5 text-[11px] font-mono font-medium truncate max-w-[200px]">
                                            {typeof row[h] === 'object' ? '{...}' : String(row[h] || '-')}
                                        </td>
                                    ))}
                                    <td className="p-5 text-right sticky right-0 bg-[#030308] border-l border-white/5 z-10">
                                        <div className="flex items-center justify-end gap-3">
                                            <button onClick={() => openEditModal(row)} className="text-gray-400 hover:text-blue-400 transition-colors p-1" title="Edit">✎</button>
                                            <button onClick={() => handleToggle(row.id)} disabled={processingId === row.id} className={`px-2 py-1 rounded text-[9px] font-bold uppercase border transition-all ${row.status === 'active' ? 'bg-green-900/20 text-green-400 border-green-500/50' : 'bg-red-900/20 text-red-400 border-red-500/50'}`}>{processingId === row.id ? '...' : row.status}</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>

        <Modal isVisible={isEditModalOpen} onClose={() => { if(!isSaving) setIsEditModalOpen(false); }}>
            <div className="p-0 bg-[#0b0c15] rounded-[2.5rem] w-full max-w-2xl shadow-[0_0_120px_rgba(0,0,0,1)] relative overflow-hidden border border-amber-500/20" onClick={e => e.stopPropagation()}>
                <div className="absolute inset-0 z-0 pointer-events-none p-4">
                    <div className="w-full h-full border-[10px] border-double border-[#d4af37]/40 rounded-[2.2rem] opacity-30 shadow-[inset_0_0_40px_rgba(212,175,55,0.1)]"></div>
                </div>

                <div className="relative z-10 p-10 flex flex-col items-center">
                    <div className="text-center mb-8 w-full border-b border-white/5 pb-6">
                        <div className="w-16 h-16 bg-black rounded-full border-2 border-amber-500/30 flex items-center justify-center mx-auto mb-4">
                             <span className="text-2xl opacity-60">📜</span>
                        </div>
                        <h3 className="text-4xl font-cinzel font-black gold-gradient-text uppercase tracking-widest mb-2">Modify Artifact</h3>
                        <p className="text-[10px] text-gray-500 uppercase tracking-[0.5em] font-bold">Protocol v4.0 // Direct Secure Handshake</p>
                    </div>

                    {actionError && (
                        <div className="w-full mb-6 bg-red-950/40 p-4 rounded-2xl border-2 border-red-500 text-red-400 text-xs text-center font-black tracking-widest animate-shake uppercase shadow-xl">
                            {actionError}
                        </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-h-[40vh] overflow-y-auto pr-3 custom-scrollbar mb-8 px-2">
                        {Object.keys(formData).map(key => (
                            <div key={key} className="space-y-1.5 group">
                                <label className="block text-gray-600 text-[9px] uppercase font-black tracking-[0.2em] ml-2 group-focus-within:text-blue-400 transition-colors">
                                    {key} {key === 'id' && '(Read Only)'}
                                </label>
                                <input 
                                    disabled={key==='id'} 
                                    className="w-full bg-black/80 border border-gray-800 rounded-2xl p-4 text-white text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all shadow-inner font-mono disabled:opacity-20 disabled:bg-gray-900" 
                                    value={formData[key]} 
                                    onChange={e => setFormData({...formData, [key]: e.target.value})} 
                                    placeholder={`Enter ${key}...`}
                                />
                            </div>
                        ))}
                    </div>

                    <div className="w-full flex flex-col md:flex-row items-center gap-4 border-t border-white/5 pt-8">
                        <button 
                            onClick={submitEdit} 
                            disabled={isSaving} 
                            className={`w-full md:flex-1 h-16 rounded-2xl font-black text-xs uppercase tracking-[0.4em] transition-all transform active:scale-95 shadow-[0_20px_40px_rgba(0,0,0,0.5)] border ${isSaving ? 'bg-gray-800 border-gray-700 text-gray-500 grayscale cursor-wait' : 'bg-blue-800 border-blue-400 hover:bg-blue-700 hover:shadow-blue-900/50 text-white'}`}
                        >
                            {isSaving ? 'ILLUMINATING...' : 'Commit to Vault'}
                        </button>
                        <button 
                            onClick={() => { setIsEditModalOpen(false); setEditingId(null); setActionError(null); }} 
                            className="w-full md:w-auto text-gray-600 hover:text-red-500 uppercase font-black text-[10px] tracking-widest transition-colors py-4 px-8"
                        >
                            Abort
                        </button>
                    </div>
                </div>
            </div>
        </Modal>

        <AdminContextHelp context="db" />
    </div>
  );
};

export default AdminDB;
