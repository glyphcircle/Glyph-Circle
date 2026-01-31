import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Card from './shared/Card';
import Button from './shared/Button';
import { dbService } from '../services/db';
import { useDb } from '../hooks/useDb';
import { safeStorageInstance } from '../services/supabaseClient';

const BackupManager: React.FC = () => {
  const { refresh } = useDb();
  const [lastBackup, setLastBackup] = useState<string | null>(
    safeStorageInstance.getItem('glyph_last_backup_time')
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
      setIsRefreshing(true);
      await refresh();
      setTimeout(() => setIsRefreshing(false), 800);
  };
  
  const handleExport = async (format: 'json' | 'csv', tableName?: string) => {
    try {
      let data: any;
      let fileName = 'glyph-backup';

      if (format === 'json') {
          const users = await dbService.getAll('users');
          const readings = await dbService.getAll('readings');
          const payments = await dbService.getAll('transactions');
          data = { users, readings, payments };
          fileName += `-${new Date().toISOString().split('T')[0]}.json`;
      } else if (tableName) {
          data = await dbService.getAll(tableName);
          fileName = `glyph-${tableName}-${new Date().toISOString().split('T')[0]}.csv`;
      }

      if (!data || (Array.isArray(data) && data.length === 0)) {
          alert("No data found to export.");
          return;
      }

      let content = '';
      let type = '';

      if (format === 'json') {
          content = JSON.stringify(data, null, 2);
          type = 'application/json';
      } else {
          const headers = Object.keys(data[0]).join(',');
          const rows = data.map((obj: any) => 
            Object.values(obj).map(v => 
                typeof v === 'object' ? `"${JSON.stringify(v).replace(/"/g, '""')}"` : `"${v}"`
            ).join(',')
          );
          content = [headers, ...rows].join('\n');
          type = 'text/csv';
      }

      const blob = new Blob([content], { type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (format === 'json') {
          const now = new Date().toLocaleString();
          safeStorageInstance.setItem('glyph_last_backup_time', now);
          setLastBackup(now);
      }

    } catch (e: any) {
      console.error("Export failed", e);
      alert("Export Failed: " + e.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6 font-mono text-gray-300">
        <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Disaster Recovery</h1>
                    <p className="text-sm text-gray-500">Export System Data (Supabase)</p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleRefresh}
                        className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded border border-gray-600 text-amber-200 flex items-center gap-2 transition-all active:scale-95"
                    >
                        <span className={`text-sm ${isRefreshing ? 'animate-spin' : ''}`}>🔄</span>
                        <span className="text-xs font-bold uppercase">Refresh</span>
                    </button>
                    <Link to="/admin/dashboard" className="text-blue-400 hover:text-blue-300">&larr; Dashboard</Link>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="bg-gray-800 border-gray-700 p-6">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <span>⬇️</span> Export Data
                    </h3>
                    <div className="bg-black/30 p-4 rounded border border-gray-700 text-xs mb-6">
                        <p className="text-gray-500 mb-1 uppercase tracking-widest">Last Backup</p>
                        <p className="text-green-400 font-mono text-base">{lastBackup || 'Never'}</p>
                    </div>
                    <Button onClick={() => handleExport('json')} className="w-full bg-blue-600 hover:bg-blue-500 border-none">
                        Download JSON Snapshot
                    </Button>
                </Card>
            </div>
        </div>
    </div>
  );
};

export default BackupManager;