
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDb } from '../hooks/useDb';
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
  const { db, toggleStatus, createEntry, updateEntry, deleteEntry, refresh, errorMessage } = useDb();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [processingId, setProcessingId] = useState<string | number | null>(null);

  const tableName = table || 'users';
  const data = db[tableName] || [];

  const headers = useMemo<string[]>(() => {
    if (data.length > 0) return Array.from(new Set(data.flatMap((record: any) => Object.keys(record)))) as string[];
    return (MASTER_SCHEMA[tableName] || ['id', 'status']) as string[];
  }, [data, tableName]);

  const handleRefresh = async () => {
      setIsRefreshing(true);
      await refresh();
      setTimeout(() => setIsRefreshing(false), 800);
  };

  const handleToggle = async (id: string | number) => {
      setProcessingId(id);
      try {
        if (navigator.vibrate) navigator.vibrate(40);
        await toggleStatus(tableName, id);
      } finally {
        setProcessingId(null);
      }
  };

  const handleDelete = async (id: string | number) => {
      if (window.confirm(`Permanently destroy this record in ${tableName}? This action cannot be undone.`)) {
          setProcessingId(id);
          try {
              if (navigator.vibrate) navigator.vibrate([100, 50]);
              await deleteEntry(tableName, id);
          } catch (e: any) { 
              alert(`Action Denied: ${e.message}. Ensure your admin role is active in the database.`); 
          } finally {
              setProcessingId(null);
          }
      }
  };

  const openEditModal = (record: any) => {
      const editableData: Record<string, string> = {};
      headers.forEach(h => {
          if (!['created_at', 'updated_at'].includes(h)) {
              editableData[h] = typeof record[h] === 'object' ? JSON.stringify(record[h]) : String(record[h] || '');
          }
      });
      setFormData(editableData);
      setEditingId(record.id);
      setIsEditModalOpen(true);
  };

  const submitCreate = async () => {
      setIsSaving(true);
      try {
          const finalData = { ...formData, id: formData.id || uuidv4() };
          await createEntry(tableName, finalData);
          setIsCreateModalOpen(false);
          setFormData({});
      } catch (e: any) { 
          alert(`Creation Failed: ${e.message}`); 
      } finally { 
          setIsSaving(false); 
      }
  };

  const submitEdit = async () => {
      if (!editingId) return;
      setIsSaving(true);
      try {
          await updateEntry(tableName, editingId, formData);
          setIsEditModalOpen(false);
          setEditingId(null);
          setFormData({});
      } catch (e: any) { 
          alert(`Update Failed: ${e.message}`); 
      } finally { 
          setIsSaving(false); 
      }
  };

  const renderCell = (key: string, val: any) => {
      const strVal = String(val || '');
      if (['image', 'image_url', 'path', 'logo_url', 'url'].includes(key.toLowerCase()) && val) {
          return (
            <div className="flex items-center gap-2 group/cell">
               <img src={cloudManager.resolveImage(strVal)} className="w-8 h-8 object-cover rounded border border-white/10 transition-transform group-hover/cell:scale-150" />
               <span className="truncate max-w-[100px] opacity-30">{strVal}</span>
            </div>
          );
      }
      return <div className="truncate max-w-[200px]">{typeof val === 'object' ? '{...}' : strVal || '-'}</div>;
  };

  return (
    <div className="min-h-screen bg-[#030308] p-4 md:p-8 font-mono text-sm text-gray-300">
        <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row items-center justify-between mb-8 gap-6">
                <div className="flex items-center gap-4">
                    <Link to="/admin/config" className="bg-gray-900/50 p-2 rounded-lg text-amber-500 hover:text-white border border-amber-500/20"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg></Link>
                    <h1 className="text-3xl font-cinzel font-black text-white capitalize tracking-widest">{tableName.replace(/_/g, ' ')}</h1>
                </div>
                
                <div className="flex items-center gap-3 w-full lg:w-auto">
                    <div className="relative flex-grow lg:flex-grow-0">
                        <input type="text" placeholder="Search entries..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full lg:w-64 bg-black/60 border border-gray-800 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none pr-10" />
                        <span className="absolute right-3 top-3.5 opacity-30">🔍</span>
                    </div>
                    <button onClick={handleRefresh} className={`p-3 bg-gray-900 rounded-xl border border-gray-700 text-amber-500 hover:border-amber-400 transition-colors ${isRefreshing ? 'animate-spin' : ''}`}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg></button>
                    <button onClick={() => { setFormData({}); setIsCreateModalOpen(true); }} className="bg-amber-600 hover:bg-amber-500 text-black font-black py-3 px-8 rounded-xl transition-all uppercase text-[11px] tracking-widest shadow-lg active:scale-95">Genesis +</button>
                </div>
            </div>

            <Card className="bg-black/40 border-gray-800 overflow-hidden backdrop-blur-xl shadow-2xl relative">
                {isRefreshing && <div className="absolute inset-0 bg-black/20 backdrop-blur-sm z-20 flex items-center justify-center"><div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div></div>}
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-900/90 text-gray-500">
                            <tr>
                                {headers.map(h => <th key={h} className="p-4 border-b border-gray-800 font-black uppercase text-[10px] tracking-widest">{h}</th>)}
                                <th className="p-4 border-b border-gray-800 text-right sticky right-0 bg-gray-900 z-10">Control</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-900">
                            {data.filter((r:any) => JSON.stringify(r).toLowerCase().includes(searchTerm.toLowerCase())).map((row: any, i: number) => (
                                <tr key={row.id || i} className="hover:bg-white/[0.03] transition-colors group/row">
                                    {headers.map(h => <td key={h} className="p-4 text-[11px] font-mono">{renderCell(h, row[h])}</td>)}
                                    <td className="p-4 text-right sticky right-0 bg-black/90 backdrop-blur z-10 border-l border-white/5">
                                        <div className="flex items-center justify-end gap-3">
                                            <button onClick={() => openEditModal(row)} className="text-gray-400 hover:text-blue-400 p-1 transition-colors" title="Edit Entry">✎</button>
                                            <button 
                                                onClick={() => handleToggle(row.id)} 
                                                disabled={processingId === row.id}
                                                className={`px-2 py-1 rounded text-[9px] font-bold uppercase border transition-all ${row.status === 'active' ? 'bg-green-900/20 text-green-400 border-green-500/50 hover:bg-green-500 hover:text-black' : 'bg-red-900/20 text-red-400 border-red-500/50 hover:bg-red-500 hover:text-black'}`}
                                            >
                                                {processingId === row.id ? '...' : row.status}
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(row.id)} 
                                                disabled={processingId === row.id}
                                                className="text-gray-600 hover:text-red-500 transition-colors p-1" 
                                                title="Destroy Entry"
                                            >
                                                🗑
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {data.length === 0 && (
                                <tr>
                                    <td colSpan={headers.length + 1} className="p-20 text-center text-gray-600 italic">No records found in the {tableName} archives.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>

        <Modal isVisible={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)}>
            <div className="p-8 bg-[#0b0c15] border border-amber-500/30 rounded-2xl w-full max-w-2xl shadow-2xl">
                <h3 className="text-xl font-cinzel font-black text-amber-400 uppercase mb-6 tracking-widest border-b border-white/5 pb-4">Initialize Record</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                    {headers.filter(h => !['created_at', 'updated_at'].includes(h)).map(key => (
                        <div key={key}>
                            <label className="block text-gray-500 text-[9px] uppercase font-black mb-1.5 ml-1">{key}</label>
                            <input 
                                className="w-full bg-black/60 border border-gray-800 rounded-xl p-3 text-white text-xs outline-none focus:border-amber-500 transition-all shadow-inner" 
                                value={formData[key] || ''} 
                                onChange={e => setFormData({...formData, [key]: e.target.value})} 
                                placeholder={`Enter ${key}...`}
                            />
                        </div>
                    ))}
                </div>
                <div className="mt-8 flex gap-4">
                    <Button onClick={submitCreate} disabled={isSaving} className="flex-1 bg-amber-600 hover:bg-amber-500 text-black">
                        {isSaving ? 'Manifesting...' : 'Confirm Genesis'}
                    </Button>
                    <button onClick={() => setIsCreateModalOpen(false)} className="flex-1 text-gray-500 uppercase font-black text-xs hover:text-white transition-colors">Cancel</button>
                </div>
            </div>
        </Modal>

        <Modal isVisible={isEditModalOpen} onClose={() => setIsEditModalOpen(false)}>
            <div className="p-8 bg-[#0b0c15] border border-amber-500/30 rounded-2xl w-full max-w-2xl shadow-2xl">
                <h3 className="text-xl font-cinzel font-black text-blue-400 uppercase mb-6 tracking-widest border-b border-white/5 pb-4">Modify Artifact</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                    {Object.keys(formData).map(key => (
                        <div key={key}>
                            <label className="block text-gray-500 text-[9px] uppercase font-black mb-1.5 ml-1">{key}</label>
                            <input 
                                disabled={key==='id'} 
                                className="w-full bg-black/60 border border-gray-800 rounded-xl p-3 text-white text-xs outline-none focus:border-blue-500 transition-all disabled:opacity-20 shadow-inner" 
                                value={formData[key]} 
                                onChange={e => setFormData({...formData, [key]: e.target.value})} 
                            />
                        </div>
                    ))}
                </div>
                <div className="mt-8 flex gap-4">
                    <Button onClick={submitEdit} disabled={isSaving} className="flex-1 bg-blue-700 hover:bg-blue-600 text-white">
                        {isSaving ? 'Updating...' : 'Commit Changes'}
                    </Button>
                    <button onClick={() => setIsEditModalOpen(false)} className="flex-1 text-gray-500 uppercase font-black text-xs hover:text-white transition-colors">Abort</button>
                </div>
            </div>
        </Modal>

        <AdminContextHelp context="db" />
    </div>
  );
};

export default AdminDB;
