import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDb } from '../hooks/useDb';
import Card from './shared/Card';
import Modal from './shared/Modal';

const AdminDB: React.FC = () => {
  const { table } = useParams<{ table: string }>();
  const { db, refreshTable, updateEntry, createEntry, deleteEntry } = useDb();
  const navigate = useNavigate();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({}); 
  const [isNewRecord, setIsNewRecord] = useState(false);
  
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const tableName = table || 'services';
  const data = db[tableName] || [];

  const SYSTEM_FIELDS = ['id', 'created_at', 'updated_at', 'timestamp', 'item_ids', 'user_id'];

  useEffect(() => {
    console.log(`📂 [AdminDB] Syncing Registry: ${tableName}`);
    refreshTable(tableName);
  }, [tableName, refreshTable]);

  const headers = useMemo(() => {
    let rawHeaders = data.length > 0 ? Object.keys(data[0]) : ['id', 'status'];
    if (tableName === 'services' && data.length === 0) {
        rawHeaders = ['id', 'name', 'price', 'description', 'status', 'path', 'image'];
    }
    // Filter out user_id from the table display for a cleaner UI
    return rawHeaders.filter(h => h !== 'user_id');
  }, [data, tableName]);

  const openCreateModal = () => {
      const initialForm: Record<string, any> = {};
      headers.forEach(header => {
          if (!SYSTEM_FIELDS.includes(header)) {
              if (header === 'price' || header === 'stock') initialForm[header] = 0;
              else if (header === 'status') initialForm[header] = 'active';
              else initialForm[header] = '';
          }
      });
      
      setFormData(initialForm);
      setIsNewRecord(true);
      setStatus('idle');
      setErrorMsg(null);
      setIsModalOpen(true);
  };

  const openEditModal = (record: any) => {
      console.log(`🛠️ [UI] Inspecting artifact: ${record.id}`);
      setFormData({ ...record });
      setIsNewRecord(false);
      setStatus('idle');
      setErrorMsg(null);
      setIsModalOpen(true);
  };

  const handleDelete = async (id: string | number) => {
      const confirmed = await new Promise<boolean>(resolve => {
          const modal = document.createElement('div');
          const cleanId = String(id).replace(/[^a-zA-Z0-9]/g, '_');
          const callbackKey = `__delete_${cleanId}_${Date.now()}`;
          
          (window as any)[callbackKey] = (result: boolean) => {
              delete (window as any)[callbackKey];
              modal.remove();
              resolve(result);
          };

          modal.innerHTML = `
              <div style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.8);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)"> 
                  <div style="background:#0a0a14;padding:2.5rem;border-radius:1.5rem;border:2px solid #f59e0b;max-width:400px;text-align:center;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5)"> 
                      <h3 style="color:white;margin-bottom:1rem;font-family:Cinzel,serif;font-size:1.5rem">⚠️ Purge Artifact?</h3> 
                      <p style="color:#f3f4f6;margin-bottom:2rem;font-family:Lora,serif;line-height:1.5">Are you sure you want to permanently delete artifact <strong style="color:#f59e0b">${id}</strong> from the Registry?</p> 
                      <div style="display:flex;gap:1.5rem;justify-content:center"> 
                          <button onclick="window['${callbackKey}'](false)" style="padding:0.75rem 2rem;background:#4b5563;color:white;border:none;border-radius:0.75rem;cursor:pointer;font-weight:700;font-family:Cinzel,serif"> Cancel </button> 
                          <button onclick="window['${callbackKey}'](true)" style="padding:0.75rem 2rem;background:#dc2626;color:white;border:none;border-radius:0.75rem;cursor:pointer;font-weight:700;font-family:Cinzel,serif"> PURGE </button> 
                      </div> 
                  </div> 
              </div>`;
          document.body.appendChild(modal);
          setTimeout(() => { if((window as any)[callbackKey]) (window as any)[callbackKey](false); }, 15000);
      });

      if (!confirmed) return;

      try {
          console.log(`🗑️ [UI] Purging ID: ${id}`);
          await deleteEntry(tableName, id);
          console.log(`✅ [UI] Purged: ${id}`);
          refreshTable(tableName);
      } catch (err: any) {
          console.error('❌ [UI] Purge failed:', err);
          alert(`Purge failed: ${err.message}`);
      }
  };

  const handleCommit = async () => {
      console.log("📡 [UI] Initiating Cloud Synchronization...");
      setStatus('saving');
      setErrorMsg(null);

      const recordId = formData.id;
      
      // 🔧 [FIX] IMAGE URL SHORTENING BEFORE COMMIT (Prevents payload hanging)
      let workingFormData = { ...formData };
      workingFormData.image = workingFormData.image || '';
      if (workingFormData.image.length > 300) {
        console.log('🔧 [UI] High payload detected. Shortening image URL before commit...');
        if (workingFormData.image.includes('drive.google.com')) {
          const idMatch = workingFormData.image.match(/\/d\/([a-zA-Z0-9_-]+)/) || workingFormData.image.match(/id=([a-zA-Z0-9_-]+)/);
          if (idMatch) {
            workingFormData.image = `https://lh3.googleusercontent.com/d/${idMatch[1]}`;
            console.log('✅ [UI] Google Drive → thumbnail mapping complete');
          } else {
            workingFormData.image = workingFormData.image.slice(0, 250);
          }
        } else {
          workingFormData.image = workingFormData.image.slice(0, 250);
        }
      }

      const payload = { ...workingFormData };
      SYSTEM_FIELDS.forEach(field => delete (payload as any)[field]);

      try {
          if (isNewRecord) {
              await createEntry(tableName, payload);
          } else {
              if (!recordId) throw new Error("IDENTIFICATION_ERROR: Missing ID.");
              await updateEntry(tableName, recordId, payload);
          }
          
          setStatus('success');
          setTimeout(() => {
              setIsModalOpen(false);
              setStatus('idle');
          }, 1200);
      } catch (err: any) {
          console.error("💥 [UI] Commit Failed:", err);
          setStatus('error');
          setErrorMsg(err.message || "Database rejected the payload. Possible session timeout.");
      }
  };

  return (
    <div className="min-h-screen bg-[#020205] pt-32 p-4 md:p-8 md:pt-40 font-mono text-gray-300">
        <div className="max-w-7xl mx-auto">
            {/* STICKY TOOLBAR HEADER */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-6 border-b border-white/5 pb-8">
                <div className="flex items-center gap-6">
                    <Link to="/admin/dashboard" className="bg-gray-900 px-5 py-3 rounded-2xl border border-white/10 hover:bg-white/20 transition-all text-[11px] font-bold tracking-widest text-amber-500 shadow-xl flex items-center gap-2">
                        <span>←</span> DASHBOARD
                    </Link>
                    <div>
                        <h1 className="text-4xl font-cinzel font-black text-white uppercase tracking-widest drop-shadow-lg">{tableName}</h1>
                        <p className="text-[9px] text-gray-500 uppercase tracking-[0.5em] font-bold">Active Registry Entries</p>
                    </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                    <div className="relative flex-grow lg:w-80">
                        <input 
                            type="text" 
                            placeholder="Search records..." 
                            className="w-full bg-black/60 border border-white/10 rounded-full px-6 py-3 text-sm text-white outline-none focus:border-amber-500 shadow-inner focus:ring-1 focus:ring-amber-500/20" 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={() => navigate('/admin/config')}
                        className="bg-gray-900 hover:bg-gray-800 text-amber-400 font-black px-8 py-3 rounded-full text-[11px] uppercase tracking-widest transition-all shadow-xl border border-amber-500/30 flex items-center gap-2 active:scale-95"
                    >
                        ⚙️ CONFIG
                    </button>
                    <button 
                        onClick={openCreateModal} 
                        className="bg-amber-600 hover:bg-amber-500 text-black font-black px-8 py-3 rounded-full text-[11px] uppercase tracking-widest transition-all shadow-2xl shadow-amber-500/20 flex items-center gap-2 active:scale-95"
                    >
                        <span>+</span> NEW ENTRY
                    </button>
                </div>
            </div>

            <Card className="bg-black/40 border-white/5 overflow-hidden rounded-[2rem] shadow-2xl">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left">
                        <thead className="bg-white/5 text-[10px] text-gray-500 uppercase tracking-widest font-black border-b border-white/5">
                            <tr>
                                {headers.map(h => <th key={h} className="p-6">{h}</th>)}
                                <th className="p-6 text-right">Registry Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {data.filter((r:any) => JSON.stringify(r).toLowerCase().includes(searchTerm.toLowerCase())).map((row: any) => (
                                <tr key={row.id} className="hover:bg-amber-500/[0.03] transition-colors group">
                                    {headers.map(h => (
                                        <td key={h} className="p-6 text-[12px] truncate max-w-[200px] font-mono font-medium text-gray-400 group-hover:text-amber-100/80 transition-colors">
                                            {String(row[h] ?? '-')}
                                        </td>
                                    ))}
                                    <td className="p-6 text-right whitespace-nowrap">
                                        <div className="flex justify-end gap-3">
                                            <button 
                                                onClick={() => openEditModal(row)} 
                                                className="bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-black border border-amber-500/30 px-5 py-1.5 rounded-full font-black text-[10px] tracking-widest transition-all uppercase shadow-lg"
                                            >
                                                Modify
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(row.id)} 
                                                className="bg-red-500/5 hover:bg-red-600 text-red-500/60 hover:text-white border border-red-500/10 px-5 py-1.5 rounded-full font-black text-[10px] tracking-widest transition-all uppercase"
                                            >
                                                Purge
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {data.length === 0 && (
                                <tr>
                                    <td colSpan={headers.length + 1} className="p-32 text-center text-gray-600 italic">
                                        <div className="text-5xl mb-4 opacity-10">📖</div>
                                        Registry is silent. No artifacts detected in the current dimension.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>

        <Modal isVisible={isModalOpen} onClose={() => status !== 'saving' && setIsModalOpen(false)}>
            <div className="p-10 bg-[#0a0a14] rounded-[2.4rem] border border-amber-500/20 w-full max-w-lg relative overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.9)]">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500/40 to-transparent"></div>
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  disabled={status === 'saving'}
                  className="absolute top-8 right-8 text-gray-600 hover:text-white text-4xl font-light leading-none z-10 transition-colors"
                >
                  &times;
                </button>
                <div className="mb-10">
                    <h3 className="text-3xl font-cinzel font-black text-white tracking-[0.1em] uppercase mb-1">
                        {isNewRecord ? 'NEW ARTIFACT' : 'MODIFY RECORD'}
                    </h3>
                    <p className="text-[10px] text-amber-500/60 uppercase tracking-[0.5em] font-bold">Secure Registry Authorization</p>
                </div>
                <div className="space-y-6 max-h-[50vh] overflow-y-auto pr-4 custom-scrollbar">
                    {Object.keys(formData).filter(k => !SYSTEM_FIELDS.includes(k)).map(key => (
                        <div key={key} className="space-y-2">
                            <label className="block text-[10px] text-gray-500 uppercase font-black ml-1 tracking-[0.2em]">{key}</label>
                            {key === 'status' ? (
                                <select 
                                    className="w-full bg-black border border-white/10 rounded-xl p-4 text-white text-sm outline-none focus:border-amber-500 cursor-pointer appearance-none" 
                                    value={formData[key]} 
                                    onChange={e => setFormData({ ...formData, [key]: e.target.value })}
                                >
                                    <option value="active">active</option>
                                    <option value="inactive">inactive</option>
                                </select>
                            ) : (
                                <input 
                                    className="w-full bg-black border border-white/10 rounded-xl p-4 text-white text-sm outline-none focus:border-amber-500 font-mono shadow-inner transition-all focus:ring-1 focus:ring-amber-500/20" 
                                    value={formData[key] ?? ''} 
                                    onChange={e => setFormData({ ...formData, [key]: e.target.value })} 
                                    placeholder={`Enter ${key}...`}
                                />
                            )}
                        </div>
                    ))}
                    {!isNewRecord && formData.id && (
                        <div className="pt-6 mt-6 border-t border-white/5 opacity-40">
                             <label className="block text-[9px] text-gray-500 uppercase font-black ml-1 tracking-[0.2em]">Registry Identifier (Fixed)</label>
                             <div className="w-full bg-black/40 border border-white/5 rounded-xl p-4 text-gray-500 text-xs font-mono truncate">{formData.id}</div>
                        </div>
                    )}
                </div>
                {errorMsg && <div className="mt-8 p-4 bg-red-950/20 border border-red-500/30 rounded-xl text-red-400 text-[10px] text-center uppercase tracking-widest animate-shake">{errorMsg}</div>}
                <div className="mt-12 flex flex-col gap-5">
                    <button 
                        onClick={handleCommit} 
                        disabled={status === 'saving' || status === 'success'} 
                        className={`w-full py-5 rounded-full font-black text-xs uppercase tracking-[0.4em] transition-all shadow-2xl ${
                            status === 'success' ? 'bg-green-600 text-white' :
                            status === 'saving' ? 'bg-gray-800 text-gray-500 cursor-wait' : 
                            'bg-amber-600 hover:bg-amber-500 text-black active:scale-95'
                        }`}
                    >
                        {status === 'saving' ? 'SYNCING VAULT...' : 
                         status === 'success' ? 'MANIFESTED ✅' : 'COMMIT TO VAULT'}
                    </button>
                </div>
            </div>
        </Modal>
    </div>
  );
};

export default AdminDB;