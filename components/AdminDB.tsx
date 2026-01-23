
import React, { useState, useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useDb } from '../hooks/useDb';
import Card from './shared/Card';
import Modal from './shared/Modal';
import Button from './shared/Button';
import { cloudManager } from '../services/cloudManager';
import AdminContextHelp from './AdminContextHelp';

const AdminDB: React.FC = () => {
  const { table } = useParams<{ table: string }>();
  const [searchParams] = useSearchParams(); 
  const { db, toggleStatus, activateTheme, createEntry, updateEntry, refresh } = useDb();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const tableName = table || 'users';
  const data = db[tableName] || [];

  // Should we use Radio behavior?
  const isThemeTable = tableName === 'ui_themes';

  useEffect(() => {
      refresh();
  }, [tableName, refresh]);

  useEffect(() => {
      if (searchParams.get('create') === 'true') {
          setIsCreateModalOpen(true);
          setFormData({});
      }
  }, [searchParams]);

  const handleRefresh = async () => {
      setIsRefreshing(true);
      await refresh();
      setTimeout(() => setIsRefreshing(false), 800);
  };

  const filteredData = data.filter((record: any) => 
    JSON.stringify(record).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const headers: string[] = data.length > 0 
    ? Array.from(new Set(data.flatMap((record: any) => Object.keys(record))))
    : ['id', 'status', 'name', 'image', 'description']; 

  const systemFields = ['created_at'];

  const handleFormChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const openCreateModal = () => {
      setFormData({});
      setIsCreateModalOpen(true);
  };

  const submitCreate = async () => {
      setIsSaving(true);
      try {
          await createEntry(tableName, formData);
          setIsCreateModalOpen(false);
          setFormData({});
          refresh();
      } catch (e) {
          alert("Failed to create entry.");
      } finally {
          setIsSaving(false);
      }
  };

  const openEditModal = (record: any) => {
      const editableData: Record<string, string> = {};
      Object.keys(record).forEach(key => {
          if (!systemFields.includes(key)) {
              const val = record[key];
              editableData[key] = typeof val === 'object' ? JSON.stringify(val) : String(val);
          }
      });
      setFormData(editableData);
      setEditingId(record.id);
      setIsEditModalOpen(true);
  };

  const submitEdit = async () => {
      if (editingId) {
          setIsSaving(true);
          try {
              const { id, ...cleanData } = formData;
              await updateEntry(tableName, editingId, cleanData);
              setIsEditModalOpen(false);
              setEditingId(null);
              setFormData({});
              refresh();
          } catch (e) {
              alert("Failed to save.");
          } finally {
              setIsSaving(false);
          }
      }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6 font-mono text-sm text-gray-300">
        <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-4">
                    <Link to="/admin/config" className="text-blue-400 hover:underline">&larr; Back to Panel</Link>
                    <h1 className="text-2xl font-bold text-white capitalize">{tableName.replace(/_/g, ' ')}</h1>
                    <span className="bg-green-900 text-green-200 px-2 py-1 rounded text-xs">Supabase Live</span>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <input 
                        type="text" 
                        placeholder="Search..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-gray-800 border border-gray-600 rounded px-4 py-2 text-white focus:outline-none focus:border-blue-500 flex-grow"
                    />
                    <button onClick={handleRefresh} className="p-2 bg-gray-800 hover:bg-gray-700 rounded border border-gray-600 text-amber-200">
                        <span className={`block ${isRefreshing ? 'animate-spin' : ''}`}>🔄</span>
                    </button>
                    <button onClick={openCreateModal} className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded shadow-lg transition-colors">
                        + New Entry
                    </button>
                </div>
            </div>

            <Card className="bg-gray-800 border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-700 text-gray-200">
                                {headers.map(h => (
                                    <th key={h} className="p-3 border-b border-gray-600 font-bold uppercase text-xs whitespace-nowrap">{h}</th>
                                ))}
                                <th className="p-3 border-b border-gray-600 text-right sticky right-0 bg-gray-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.map((row: any, i: number) => (
                                <tr key={i} className={`hover:bg-gray-700/50 border-b border-gray-700 last:border-0 transition-colors ${row.status === 'active' && isThemeTable ? 'bg-green-900/10' : ''}`}>
                                    {headers.map(h => {
                                        const val = row[h];
                                        
                                        // STATUS COLUMN LOGIC
                                        if (h === 'status') {
                                            if (isThemeTable) {
                                                // RADIO BUTTON BEHAVIOR for Themes
                                                return (
                                                    <td key={h} className="p-3">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); activateTheme(row.id); }}
                                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${val === 'active' ? 'bg-green-600 text-white border-green-400 shadow-lg scale-105' : 'bg-gray-800 text-gray-400 border-gray-600 hover:border-gray-400'}`}
                                                        >
                                                            <div className={`w-3 h-3 rounded-full border-2 ${val === 'active' ? 'bg-white border-white' : 'border-gray-400'}`}></div>
                                                            <span className="text-[10px] font-bold uppercase">{val === 'active' ? 'ACTIVE' : 'SELECT'}</span>
                                                        </button>
                                                    </td>
                                                );
                                            } else {
                                                // STANDARD TOGGLE for others
                                                return (
                                                    <td key={h} className="p-3">
                                                        <div 
                                                            onClick={(e) => { e.stopPropagation(); toggleStatus(tableName, row.id); }}
                                                            className={`w-10 h-5 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${val === 'active' ? 'bg-green-600' : 'bg-gray-600'}`}
                                                            title={`Toggle Status: ${val}`}
                                                        >
                                                            <div className={`bg-white w-3 h-3 rounded-full shadow-md transform duration-300 ease-in-out ${val === 'active' ? 'translate-x-5' : ''}`}></div>
                                                        </div>
                                                    </td>
                                                );
                                            }
                                        }

                                        const strVal = String(val || '');
                                        const isUrl = typeof val === 'string' && strVal.startsWith('http');
                                        const showPreview = isUrl && (h.includes('image') || h.includes('url') || h.includes('path') || strVal.match(/\.(jpg|png|svg)/));

                                        return (
                                            <td key={h} className="p-3 text-xs truncate max-w-[200px]" title={strVal}>
                                                {showPreview ? (
                                                    <div className="flex items-center gap-2">
                                                        <img src={cloudManager.resolveImage(strVal)} alt="prev" className="w-8 h-8 object-cover rounded bg-black" />
                                                        <a href={strVal} target="_blank" className="text-blue-400 underline">Link</a>
                                                    </div>
                                                ) : (typeof val === 'object' ? '{...}' : strVal)}
                                            </td>
                                        );
                                    })}
                                    <td className="p-3 text-right sticky right-0 bg-gray-800/50 backdrop-blur-sm flex gap-2 justify-end items-center h-full">
                                        <button onClick={() => openEditModal(row)} className="px-3 py-1.5 rounded text-xs font-bold bg-blue-900 text-blue-300 border border-blue-700">Edit</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>

        <Modal isVisible={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)}>
            <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-4">Add New Record</h3>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                    {headers.filter(h => !systemFields.includes(h)).map(key => (
                        <div key={key}>
                            <label className="block text-gray-400 text-xs uppercase mb-1">{key}</label>
                            <input 
                                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
                                placeholder={key === 'id' ? 'Leave empty for auto-gen' : `Enter ${key}`}
                                value={formData[key] || ''}
                                onChange={e => handleFormChange(key, e.target.value)}
                            />
                        </div>
                    ))}
                </div>
                <div className="mt-6 flex gap-3">
                    <Button onClick={submitCreate} disabled={isSaving} className="flex-1 bg-green-700">{isSaving ? 'Creating...' : 'Create'}</Button>
                    <button onClick={() => setIsCreateModalOpen(false)} className="flex-1 bg-gray-700 text-white rounded font-bold">Cancel</button>
                </div>
            </div>
        </Modal>

        <Modal isVisible={isEditModalOpen} onClose={() => setIsEditModalOpen(false)}>
            <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-4">Edit Record</h3>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                    {Object.keys(formData).map(key => (
                        <div key={key}>
                            <label className="block text-gray-400 text-xs uppercase mb-1">{key}</label>
                            <input 
                                disabled={key === 'id'} 
                                className={`w-full bg-gray-900 border border-gray-700 rounded p-2 text-white ${key === 'id' ? 'opacity-50' : ''}`}
                                value={formData[key]}
                                onChange={e => handleFormChange(key, e.target.value)}
                            />
                        </div>
                    ))}
                </div>
                <div className="mt-6 flex gap-3">
                    <Button onClick={submitEdit} disabled={isSaving} className="flex-1 bg-blue-700">{isSaving ? 'Saving...' : 'Save'}</Button>
                    <button onClick={() => setIsEditModalOpen(false)} className="flex-1 bg-gray-700 text-white rounded font-bold">Cancel</button>
                </div>
            </div>
        </Modal>
        
        <AdminContextHelp context="db" />
    </div>
  );
};

export default AdminDB;
