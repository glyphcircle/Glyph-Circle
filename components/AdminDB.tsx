import React, { useState, useMemo, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDb } from '../hooks/useDb';
import Card from './shared/Card';
import Modal from './shared/Modal';

const AdminDB: React.FC = () => {
  const { table } = useParams<{ table: string }>();
  const { db, refreshTable, updateEntry, createEntry, deleteEntry, toggleStatus } = useDb();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({}); 
  const [isNewRecord, setIsNewRecord] = useState(false);
  
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const tableName = table || 'services';
  const data = db[tableName] || [];

  const SYSTEM_FIELDS = ['id', 'created_at', 'updated_at', 'timestamp', 'item_ids', 'user_id'];

// Disabled auto-refresh - manual only during debugging
// useEffect(() => {
//   console.log(`📊 [AdminDB] Synchronizing Registry for: ${tableName}`);
//   refreshTable(tableName);
// }, [tableName, refreshTable]);


  const headers = useMemo(() => {
    if (data.length > 0) return Object.keys(data[0]);
    return ['id', 'name', 'price', 'description', 'status', 'path', 'image'];
  }, [data]);

  const openCreateModal = () => {
      setFormData({ status: 'active', price: 0 });
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

  const handleCommit = async () => {
      console.log("📡 [UI] Initiating Cloud Synchronization...");
      setStatus('saving');
      setErrorMsg(null);

      // 🛡️ ENSURE PRIMARY KEY ID IS PRESENT
      const recordId = formData.id;
      
      const payload = { ...formData };
      SYSTEM_FIELDS.forEach(field => delete payload[field]);

      try {
          if (isNewRecord) {
              await createEntry(tableName, payload);
          } else {
              if (!recordId) {
                  throw new Error("IDENTIFICATION_ERROR: Cannot modify artifact without valid 'id'.");
              }
              console.log(`📡 [UI] Commit payload for ID: ${recordId}`);
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
          setErrorMsg(err.message || "Celestial Link Failed: Database rejected the payload.");
      }
  };

  return (
    <div className="min-h-screen bg-[#020205] p-4 md:p-8 font-mono text-gray-300">
        <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
                <div className="flex items-center gap-6">
                    <Link to="/admin/dashboard" className="bg-gray-900 px-4 py-2 rounded-xl border border-white/10 hover:bg-white/20 transition-all text-[10px] font-bold tracking-widest text-amber-500">← DASHBOARD</Link>
                    <h1 className="text-3xl font-cinzel font-black text-white uppercase tracking-widest">{tableName}</h1>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <input 
                        type="text" 
                        placeholder="Search..." 
                        className="w-full md:w-64 bg-black border border-white/10 rounded-full px-6 py-2 text-xs outline-none focus:border-amber-500 shadow-inner" 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    <button onClick={openCreateModal} className="bg-amber-600 hover:bg-amber-500 text-black font-black px-6 py-2 rounded-full text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95">+ NEW ENTRY</button>
                </div>
            </div>

            <Card className="bg-black/40 border-white/5 overflow-hidden rounded-2xl shadow-2xl">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left">
                        <thead className="bg-white/5 text-[9px] text-gray-500 uppercase tracking-widest font-black">
                            <tr>
                                {headers.map(h => <th key={h} className="p-5 border-b border-white/5">{h}</th>)}
                                <th className="p-5 border-b border-white/5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {data.filter((r:any) => JSON.stringify(r).toLowerCase().includes(searchTerm.toLowerCase())).map((row: any) => (
                                <tr key={row.id} className="hover:bg-amber-500/[0.02] transition-colors group">
                                    {headers.map(h => (
                                        <td key={h} className="p-5 text-[11px] truncate max-w-[200px] font-mono">{String(row[h] ?? '-')}</td>
                                    ))}
                                    <td className="p-5 text-right whitespace-nowrap space-x-4">
                                        <button onClick={() => openEditModal(row)} className="text-amber-500/50 hover:text-amber-400 font-black text-[10px] tracking-widest transition-all uppercase">Modify</button>
                                        <button onClick={() => deleteEntry(tableName, row.id)} className="text-red-500/30 hover:text-red-500 font-black text-[10px] tracking-widest transition-all uppercase">Purge</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>

        <Modal isVisible={isModalOpen} onClose={() => status !== 'saving' && setIsModalOpen(false)}>
            <div className="p-10 bg-[#0a0a14] rounded-[2.4rem] border border-amber-500/20 w-full max-w-lg relative overflow-hidden">
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  disabled={status === 'saving'}
                  className="absolute top-8 right-8 text-gray-600 hover:text-white text-4xl font-light leading-none z-10"
                >
                  &times;
                </button>
                <div className="mb-10">
                    <h3 className="text-3xl font-cinzel font-black text-white tracking-[0.1em] uppercase mb-1">{isNewRecord ? 'NEW ARTIFACT' : 'MODIFY RECORD'}</h3>
                    <p className="text-[10px] text-amber-500/60 uppercase tracking-[0.5em] font-bold">Secure Payload Protocol</p>
                </div>
                <div className="space-y-6 max-h-[45vh] overflow-y-auto pr-4 custom-scrollbar">
                    {Object.keys(formData).filter(k => !SYSTEM_FIELDS.includes(k)).map(key => (
                        <div key={key} className="space-y-1.5">
                            <label className="block text-[9px] text-gray-500 uppercase font-black ml-1 tracking-[0.2em]">{key}</label>
                            {key === 'status' ? (
                                <select 
                                    className="w-full bg-black border border-white/10 rounded-xl p-4 text-white text-sm outline-none focus:border-amber-500 transition-all cursor-pointer" 
                                    value={formData[key]} 
                                    onChange={e => setFormData({ ...formData, [key]: e.target.value })}
                                >
                                    <option value="active">active</option>
                                    <option value="inactive">inactive</option>
                                </select>
                            ) : (
                                <input 
                                    className="w-full bg-black border border-white/10 rounded-xl p-4 text-white text-sm outline-none focus:border-amber-500 transition-all font-mono" 
                                    value={formData[key] ?? ''} 
                                    onChange={e => setFormData({ ...formData, [key]: e.target.value })} 
                                    placeholder={`Enter ${key}...`}
                                />
                            )}
                        </div>
                    ))}
                </div>
                {errorMsg && <div className="mt-8 p-4 bg-red-950/20 border border-red-500/30 rounded-xl text-red-400 text-[10px] text-center uppercase tracking-widest animate-shake">{errorMsg}</div>}
                <div className="mt-12 flex flex-col gap-5">
                    <button 
                        onClick={handleCommit} 
                        disabled={status === 'saving' || status === 'success'} 
                        className={`w-full py-5 rounded-full font-black text-xs uppercase tracking-[0.4em] transition-all transform active:scale-95 shadow-2xl ${
                            status === 'success' ? 'bg-green-600 text-white' :
                            status === 'saving' ? 'bg-gray-800 text-gray-500 cursor-wait' : 
                            'bg-amber-600 hover:bg-amber-500 text-black'
                        }`}
                    >
                        {status === 'saving' ? 'COMMITTING TO CLOUD...' : 
                         status === 'success' ? 'SEALED ✅' : 'COMMIT CHANGES'}
                    </button>
                    {status !== 'saving' && (
                        <button onClick={() => setIsModalOpen(false)} className="text-gray-600 hover:text-white text-[10px] font-black uppercase tracking-[0.3em] py-2 transition-colors">Abort Procedure</button>
                    )}
                </div>
            </div>
        </Modal>
    </div>
  );
};

export default AdminDB;