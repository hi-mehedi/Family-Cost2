import React, { useState, useEffect, useCallback } from 'react';
import { DailyEntry, ActiveTab, AuthUser } from './types';
import { 
  getEntriesLocally, 
  saveEntriesLocally, 
  getUser, 
  saveUser, 
  pushToCloud, 
  pullFromCloud 
} from './storage';
import Dashboard from './components/Dashboard';
import EntryForm from './components/EntryForm';
import HistoryView from './components/HistoryView';
import Login from './components/Login';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [editingEntry, setEditingEntry] = useState<DailyEntry | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number>(Date.now());

  // Function to sync with cloud database
  const syncWithCloud = useCallback(async (forcePull = false) => {
    if (isSyncing) return;
    setIsSyncing(true);
    
    try {
      const cloudData = await pullFromCloud();
      if (cloudData && cloudData.entries) {
        const localEntries = getEntriesLocally();
        
        // Update local state if cloud data exists and is different
        // In this implementation, cloud is the "Source of Truth"
        if (forcePull || JSON.stringify(cloudData.entries) !== JSON.stringify(localEntries)) {
           setEntries(cloudData.entries);
           saveEntriesLocally(cloudData.entries);
        }
      }
      setLastSyncTime(Date.now());
    } catch (e) {
      console.error("Auto-sync error", e);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  useEffect(() => {
    const initUser = getUser();
    setUser(initUser);
    setEntries(getEntriesLocally());
    setIsLoaded(true);

    if (initUser) {
      syncWithCloud(true);
    }
  }, []);

  // Live Auto-Update Polling: Check cloud every 10 seconds
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(() => {
      syncWithCloud();
    }, 10000); 

    return () => clearInterval(interval);
  }, [user, syncWithCloud]);

  const handleAddEntry = async (entry: DailyEntry) => {
    let updated: DailyEntry[];
    if (editingEntry) {
      updated = entries.map(e => {
        if (e.id === editingEntry.id) {
          return { ...e, isHistory: true };
        }
        return e;
      });
      updated = [...updated, { ...entry, parentId: editingEntry.parentId || editingEntry.id }];
      setEditingEntry(null);
    } else {
      updated = [...entries, entry];
    }
    
    // Save locally for speed
    setEntries(updated);
    saveEntriesLocally(updated);
    setActiveTab('dashboard');

    // Push to cloud immediately for other mobiles
    setIsSyncing(true);
    await pushToCloud(updated);
    setIsSyncing(false);
    setLastSyncTime(Date.now());
  };

  const handleEditRequest = (entry: DailyEntry) => {
    setEditingEntry(entry);
    setActiveTab('entry');
  };

  const handleCancelEdit = () => {
    setEditingEntry(null);
    setActiveTab('history');
  };

  const handleLogout = () => {
    saveUser(null);
    setUser(null);
  };

  if (!isLoaded) return null;

  if (!user) {
    return <Login onLogin={u => { setUser(u); syncWithCloud(true); }} />;
  }

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto bg-slate-50 relative pb-20 md:max-w-4xl md:pb-0">
      <header className="bg-indigo-700 text-white p-6 pt-10 sticky top-0 z-10 shadow-lg md:rounded-b-[40px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="bg-white/20 p-2 rounded-2xl border border-white/20 relative">
               <i className="fas fa-home text-white"></i>
               {isSyncing && (
                 <span className="absolute -top-1 -right-1 flex h-3 w-3">
                   <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                   <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                 </span>
               )}
             </div>
             <div>
               <h1 className="text-xl font-black tracking-tight">Family Cost</h1>
               <div className="flex items-center gap-2">
                 <p className="text-indigo-200 text-[9px] font-black uppercase tracking-widest">Admin Cloud Active</p>
                 <span className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-emerald-400' : 'bg-indigo-400 opacity-50'}`}></span>
                 <p className="text-[7px] text-indigo-300 font-bold uppercase">
                   Synced {new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                 </p>
               </div>
             </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => syncWithCloud(true)} 
              disabled={isSyncing}
              className={`bg-white/10 hover:bg-white/20 p-3 rounded-2xl transition-all border border-white/10 ${isSyncing ? 'animate-spin' : ''}`}
            >
              <i className="fas fa-sync-alt text-xs"></i>
            </button>
            <button onClick={handleLogout} className="bg-white/10 hover:bg-white/20 p-3 rounded-2xl transition-all border border-white/10">
              <i className="fas fa-sign-out-alt text-xs"></i>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 overflow-y-auto">
        {activeTab === 'dashboard' && <Dashboard entries={entries.filter(e => !e.isHistory)} />}
        {activeTab === 'entry' && (
          <EntryForm 
            onAdd={handleAddEntry} 
            initialEntry={editingEntry} 
            onCancel={handleCancelEdit}
          />
        )}
        {activeTab === 'history' && (
          <HistoryView 
            entries={entries} 
            onDelete={() => {}} // Disabled as requested
            onEdit={handleEditRequest} 
          />
        )}
        
        {/* Footer Attribution */}
        <div className="py-8 text-center border-t border-slate-100 mt-6">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Family Cost</p>
           <p className="text-[11px] font-black text-indigo-600 uppercase tracking-widest">Developed by Mehedi Hasan Soumik</p>
           <div className="flex justify-center gap-4 mt-3 opacity-30">
             <i className="fas fa-cloud text-[10px]" title="Cloud Link Active"></i>
             <i className="fas fa-wifi text-[10px]" title="Auto Sync Enabled"></i>
             <i className="fas fa-shield-alt text-[10px]" title="Admin Secure"></i>
           </div>
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-2 flex justify-around items-center z-20 md:static md:bg-transparent md:border-none md:p-6 md:justify-center md:gap-8">
        <button 
          onClick={() => { setEditingEntry(null); setActiveTab('dashboard'); }}
          className={`flex flex-col items-center gap-1 p-2 min-w-[64px] transition-all ${activeTab === 'dashboard' ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeTab === 'dashboard' ? 'bg-indigo-100' : 'bg-transparent'}`}>
            <i className="fas fa-chart-pie text-lg"></i>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-tighter">Stats</span>
        </button>

        <button 
          onClick={() => { setEditingEntry(null); setActiveTab('entry'); }}
          className={`flex flex-col items-center gap-1 p-2 min-w-[64px] transition-all ${activeTab === 'entry' && !editingEntry ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeTab === 'entry' && !editingEntry ? 'bg-indigo-100' : 'bg-transparent'}`}>
            <i className="fas fa-plus-circle text-lg"></i>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-tighter">Log</span>
        </button>

        <button 
          onClick={() => { setEditingEntry(null); setActiveTab('history'); }}
          className={`flex flex-col items-center gap-1 p-2 min-w-[64px] transition-all ${activeTab === 'history' ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeTab === 'history' ? 'bg-indigo-100' : 'bg-transparent'}`}>
            <i className="fas fa-history text-lg"></i>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-tighter">History</span>
        </button>
      </nav>
    </div>
  );
};

export default App;