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
  
  const lastKnownCloudUpdate = useRef<number>(0);

  /**
   * SYNC ENGINE V22
   * Ensures data is shared between Laptop and Mobile via the Sync Token.
   */
  const performSync = useCallback(async (isInitial = false) => {
    const currentUser = getUser();
    if (!currentUser || !currentUser.syncToken) return;
    if (isSyncing && !isInitial) return;
    
    setSyncStatus('syncing');
    try {
      const cloudData = await pullFromCloud(currentUser.syncToken);
      
      if (cloudData) {
        setSyncStatus('synced');
        
        // Priority logic: Overwrite local if cloud is strictly newer than our last known sync
        // OR if this is the very first load for this session.
        if (isInitial || cloudData.updatedAt > lastKnownCloudUpdate.current) {
          // Verify that the cloud data is valid before overwriting
          if (Array.isArray(cloudData.entries)) {
             setEntries(cloudData.entries);
             saveEntriesLocally(cloudData.entries);
             lastKnownCloudUpdate.current = cloudData.updatedAt;
          }
        }
        setLastSyncTime(Date.now());
      } else {
        setSyncStatus('error');
      }
    } catch (e) {
      setSyncStatus('error');
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  // Initial App Load
  useEffect(() => {
    const boot = async () => {
      const savedUser = getUser();
      setUser(savedUser);
      
      if (savedUser && savedUser.syncToken) {
        // Essential: Fetch data from cloud immediately to sync Laptop data to Mobile
        await performSync(true);
      } else {
        setEntries(getEntriesLocally());
      }
      setIsLoaded(true);
    };
    boot();
  }, [performSync]);

  // Background Sync: Refresh every 8 seconds
  useEffect(() => {
    if (!user || !user.syncToken) return;
    const interval = setInterval(() => {
      performSync();
    }, 8000); 
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
    
    // 1. Update UI and Local Storage first for speed
    setEntries(updated);
    saveEntriesLocally(updated);
    setActiveTab('dashboard');

    // 2. Broadcast to Cloud immediately
    if (user?.syncToken) {
      setSyncStatus('syncing');
      const success = await pushToCloud(updated, user.syncToken);
      if (success) {
        lastKnownCloudUpdate.current = Date.now();
        setSyncStatus('synced');
      } else {
        setSyncStatus('error');
      }
      setLastSyncTime(Date.now());
    }
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
    if (window.confirm("Logout? Data will remain on the cloud but will be cleared from this device.")) {
      saveUser(null);
      setUser(null);
      setEntries([]);
      lastKnownCloudUpdate.current = 0;
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-indigo-950 flex flex-col items-center justify-center text-white p-10">
        <div className="w-16 h-16 border-4 border-white/20 border-t-indigo-400 rounded-full animate-spin mb-6"></div>
        <h2 className="text-sm font-black uppercase tracking-[0.3em] animate-pulse">Syncing Family Data...</h2>
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
             <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all ${
               syncStatus === 'synced' ? 'bg-emerald-500/20 border-emerald-500/40' : 
               syncStatus === 'syncing' ? 'bg-amber-500/20 border-amber-500/40' : 
               'bg-rose-500/20 border-rose-500/40'
             }`}>
               <i className={`fas ${
                 syncStatus === 'synced' ? 'fa-cloud-check' : 
                 syncStatus === 'syncing' ? 'fa-sync animate-spin' : 
                 'fa-cloud-slash'
               } text-lg`}></i>
             </div>
             <div>
               <h1 className="text-xl font-black tracking-tighter leading-none uppercase italic">Family Cost</h1>
               <div className="flex items-center gap-2 mt-2">
                 <div className={`w-2 h-2 rounded-full ${
                   syncStatus === 'synced' ? 'bg-emerald-400' : 
                   syncStatus === 'syncing' ? 'bg-amber-400 animate-pulse' : 
                   'bg-rose-500'
                 }`}></div>
                 <p className="text-indigo-200 text-[9px] font-black uppercase tracking-widest">
                   ID: <span className="text-white px-1.5 py-0.5 rounded bg-white/10">{user.syncToken}</span>
                 </p>
               </div>
             </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => performSync(true)} 
              className="bg-white/10 hover:bg-white/20 p-3.5 rounded-2xl border border-white/10 active:scale-90 transition-all"
              title="Pull Cloud Data"
            >
              <i className="fas fa-download text-xs"></i>
            </button>
            <button onClick={handleLogout} className="bg-white/10 hover:bg-white/20 p-3.5 rounded-2xl border border-white/10">
              <i className="fas fa-sign-out-alt text-xs text-rose-300"></i>
            </button>
          </div>
        </div>
      </header>

      <div className={`text-center py-2 transition-all shadow-inner relative overflow-hidden ${syncStatus === 'error' ? 'bg-rose-600' : 'bg-emerald-600'}`}>
        <p className="text-[7px] font-black text-white uppercase tracking-[0.4em] relative z-10">
          {syncStatus === 'error' ? '⚠️ DATA LINK FAILURE - CHECK INTERNET' : `✓ CLOUD DATA SYNCED • ${new Date(lastSyncTime).toLocaleTimeString()}`}
        </p>
        {syncStatus === 'syncing' && <div className="absolute inset-0 bg-white/20 animate-pulse"></div>}
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
           <p className="text-[12px] font-black text-indigo-800 uppercase tracking-widest">Mehedi Hasan Soumik</p>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Professional Family Cost Tracker</p>
           
           <div className="flex justify-center gap-10 mt-8 opacity-10">
              <i className="fas fa-laptop text-2xl"></i>
              <i className="fas fa-cloud-arrow-up text-sm mt-2"></i>
              <i className="fas fa-mobile-alt text-2xl"></i>
           </div>
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-4 flex justify-around items-center z-20 md:static md:bg-transparent md:border-none md:p-6 md:justify-center md:gap-12">
        <button 
          onClick={() => { setEditingEntry(null); setActiveTab('dashboard'); }}
          className={`flex flex-col items-center gap-1.5 p-2 min-w-[70px] transition-all ${activeTab === 'dashboard' ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-transparent'}`}>
            <i className="fas fa-chart-pie text-xl"></i>
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest">Stats</span>
        </button>

        <button 
          onClick={() => { setEditingEntry(null); setActiveTab('entry'); }}
          className={`flex flex-col items-center gap-1.5 p-2 min-w-[70px] transition-all ${activeTab === 'entry' && !editingEntry ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <div className={`w-14 h-14 rounded-3xl flex items-center justify-center shadow-2xl -mt-10 transition-all ${activeTab === 'entry' && !editingEntry ? 'bg-indigo-600 text-white scale-110' : 'bg-slate-100 text-slate-400'}`}>
            <i className="fas fa-plus text-2xl"></i>
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest mt-1">Entry</span>
        </button>

        <button 
          onClick={() => { setEditingEntry(null); setActiveTab('history'); }}
          className={`flex flex-col items-center gap-1.5 p-2 min-w-[70px] transition-all ${activeTab === 'history' ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${activeTab === 'history' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-transparent'}`}>
            <i className="fas fa-history text-xl"></i>
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest">History</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
