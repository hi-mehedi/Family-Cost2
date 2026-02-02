import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  const [syncStatus, setSyncStatus] = useState<'synced' | 'error' | 'syncing' | 'offline'>('synced');
  const [lastSyncTime, setLastSyncTime] = useState<number>(Date.now());
  
  // Track the timestamp of the data we currently have
  const lastKnownCloudUpdate = useRef<number>(0);

  /**
   * THE V20 SYNC ENGINE
   * Replaces local data ONLY if cloud is strictly newer.
   */
  const performSync = useCallback(async (isInitial = false) => {
    if (isSyncing && !isInitial) return;
    
    setSyncStatus('syncing');
    try {
      const cloudData = await pullFromCloud();
      
      if (cloudData) {
        // Successful contact with server
        setSyncStatus('synced');
        
        // LOGIC: Overwrite local if cloud is newer OR we have nothing local
        const localEntries = getEntriesLocally();
        if (isInitial || cloudData.updatedAt > lastKnownCloudUpdate.current) {
          if (cloudData.entries.length > 0 || isInitial) {
             setEntries(cloudData.entries);
             saveEntriesLocally(cloudData.entries);
             lastKnownCloudUpdate.current = cloudData.updatedAt;
          }
        }
        setLastSyncTime(Date.now());
      } else {
        // Network failure or CORS error
        setSyncStatus('error');
      }
    } catch (e) {
      setSyncStatus('error');
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  // App Startup
  useEffect(() => {
    const boot = async () => {
      const savedUser = getUser();
      setUser(savedUser);
      
      if (savedUser) {
        // On mobile/new device, block until we try to get Laptop data
        await performSync(true);
      } else {
        setEntries(getEntriesLocally());
      }
      setIsLoaded(true);
    };
    boot();
  }, []);

  // Sync Loop: Refresh every 7 seconds
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      performSync();
    }, 7000); 
    return () => clearInterval(interval);
  }, [user, performSync]);

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
    
    // 1. Update UI immediately
    setEntries(updated);
    saveEntriesLocally(updated);
    setActiveTab('dashboard');

    // 2. Broadcast to Cloud
    setSyncStatus('syncing');
    const success = await pushToCloud(updated);
    if (success) {
      lastKnownCloudUpdate.current = Date.now();
      setSyncStatus('synced');
    } else {
      setSyncStatus('error');
    }
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
    if (window.confirm("Logout? Cloud data will remain safe on the server.")) {
      saveUser(null);
      setUser(null);
      setEntries([]);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-indigo-900 flex flex-col items-center justify-center text-white p-10">
        <div className="w-16 h-16 border-4 border-white/20 border-t-emerald-400 rounded-full animate-spin mb-6"></div>
        <p className="text-xs font-black uppercase tracking-[0.3em] animate-pulse">Initializing Master Link...</p>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={async (u) => { 
      setUser(u); 
      await performSync(true); 
    }} />;
  }

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto bg-slate-50 relative pb-20 md:max-w-4xl md:pb-0">
      <header className="bg-indigo-700 text-white p-6 pt-10 sticky top-0 z-10 shadow-lg md:rounded-b-[40px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ${
               syncStatus === 'synced' ? 'bg-emerald-500/20 border-emerald-500/40' : 
               syncStatus === 'syncing' ? 'bg-blue-500/20 border-blue-500/40' : 
               'bg-rose-500/20 border-rose-500/40'
             }`}>
               <i className={`fas ${
                 syncStatus === 'synced' ? 'fa-check-circle' : 
                 syncStatus === 'syncing' ? 'fa-sync animate-spin' : 
                 'fa-exclamation-triangle'
               } text-lg`}></i>
             </div>
             <div>
               <h1 className="text-xl font-black tracking-tighter leading-none uppercase italic">Fleet Master</h1>
               <div className="flex items-center gap-2 mt-2">
                 <div className={`w-2 h-2 rounded-full ${
                   syncStatus === 'synced' ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]' : 
                   syncStatus === 'syncing' ? 'bg-blue-400 animate-pulse' : 
                   'bg-rose-500 shadow-[0_0_8px_#f43f5e]'
                 }`}></div>
                 <p className="text-indigo-200 text-[9px] font-black uppercase tracking-widest">
                   {syncStatus === 'synced' ? 'Cloud Verified' : syncStatus === 'syncing' ? 'Syncing...' : 'Sync Error'}
                 </p>
               </div>
             </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => performSync(true)} 
              className="bg-white/10 hover:bg-white/20 p-3.5 rounded-2xl border border-white/10 active:scale-90"
              title="Force Refresh"
            >
              <i className="fas fa-redo-alt text-xs"></i>
            </button>
            <button onClick={handleLogout} className="bg-white/10 hover:bg-white/20 p-3.5 rounded-2xl border border-white/10">
              <i className="fas fa-power-off text-xs text-rose-300"></i>
            </button>
          </div>
        </div>
      </header>

      {/* Sync Banner */}
      <div className={`text-center py-2 transition-all ${syncStatus === 'error' ? 'bg-rose-600' : 'bg-emerald-600'}`}>
        <p className="text-[7px] font-black text-white uppercase tracking-[0.5em]">
          {syncStatus === 'error' ? '⚠️ CONNECTION FAILED - CHECK INTERNET' : `✓ GLOBAL DATA SECURED • ${new Date(lastSyncTime).toLocaleTimeString()}`}
        </p>
      </div>

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
            onDelete={() => {}} 
            onEdit={handleEditRequest} 
          />
        )}
        
        <div className="py-12 text-center border-t border-slate-200/50 mt-10">
           <p className="text-[11px] font-black text-indigo-600 uppercase tracking-widest">Mehedi Hasan Soumik • Master System</p>
           <div className="flex justify-center gap-6 mt-4 opacity-20">
             <i className="fas fa-laptop text-lg"></i>
             <i className="fas fa-cloud text-xs mt-1"></i>
             <i className="fas fa-mobile-alt text-lg"></i>
           </div>
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3 flex justify-around items-center z-20 md:static md:bg-transparent md:border-none md:p-6 md:justify-center md:gap-10">
        <button 
          onClick={() => { setEditingEntry(null); setActiveTab('dashboard'); }}
          className={`flex flex-col items-center gap-1 p-2 min-w-[64px] transition-all ${activeTab === 'dashboard' ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-transparent'}`}>
            <i className="fas fa-chart-line text-xl"></i>
          </div>
          <span className="text-[9px] font-black uppercase tracking-tighter">Stats</span>
        </button>

        <button 
          onClick={() => { setEditingEntry(null); setActiveTab('entry'); }}
          className={`flex flex-col items-center gap-1 p-2 min-w-[64px] transition-all ${activeTab === 'entry' && !editingEntry ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <div className={`w-14 h-14 rounded-3xl flex items-center justify-center shadow-xl -mt-8 transition-all ${activeTab === 'entry' && !editingEntry ? 'bg-indigo-600 text-white scale-110' : 'bg-slate-100 text-slate-400'}`}>
            <i className="fas fa-plus text-2xl"></i>
          </div>
          <span className="text-[9px] font-black uppercase tracking-tighter mt-1">Add Log</span>
        </button>

        <button 
          onClick={() => { setEditingEntry(null); setActiveTab('history'); }}
          className={`flex flex-col items-center gap-1 p-2 min-w-[64px] transition-all ${activeTab === 'history' ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${activeTab === 'history' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-transparent'}`}>
            <i className="fas fa-history text-xl"></i>
          </div>
          <span className="text-[9px] font-black uppercase tracking-tighter">History</span>
        </button>
      </nav>
    </div>
  );
};

export default App;