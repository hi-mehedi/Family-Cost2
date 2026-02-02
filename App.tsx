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
  const [isInitialSyncing, setIsInitialSyncing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number>(Date.now());
  
  const cloudUpdatedAtRef = useRef<number>(0);
  const retryCountRef = useRef<number>(0);

  /**
   * THE MASTER SYNC LOGIC
   * With automatic retry mechanism for unstable mobile connections.
   */
  const performSync = useCallback(async (isInitial = false) => {
    if (isSyncing && !isInitial) return;
    
    setIsSyncing(true);
    try {
      const cloudData = await pullFromCloud();
      
      if (cloudData) {
        setSyncError(false);
        retryCountRef.current = 0; // Reset retries on success
        
        if (isInitial || cloudData.updatedAt > cloudUpdatedAtRef.current) {
          setEntries(cloudData.entries);
          saveEntriesLocally(cloudData.entries);
          cloudUpdatedAtRef.current = cloudData.updatedAt;
        }
        setLastSyncTime(Date.now());
      } else {
        throw new Error("Failed to fetch data");
      }
    } catch (e) {
      console.warn("Sync attempt failed, retrying...", retryCountRef.current);
      if (retryCountRef.current < 3) {
        retryCountRef.current += 1;
        setTimeout(() => performSync(isInitial), 2000);
      } else {
        setSyncError(true);
      }
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  // Bootup
  useEffect(() => {
    const startup = async () => {
      const savedUser = getUser();
      setUser(savedUser);
      
      if (savedUser) {
        setIsInitialSyncing(true);
        // We MUST get data from cloud on start
        await performSync(true);
        setIsInitialSyncing(false);
      } else {
        setEntries(getEntriesLocally());
      }
      setIsLoaded(true);
    };
    startup();
  }, []);

  // Background Sync Loop
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      performSync();
    }, 10000); // 10 seconds is safer for rate limits
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
    
    setEntries(updated);
    saveEntriesLocally(updated);
    setActiveTab('dashboard');

    setIsSyncing(true);
    const success = await pushToCloud(updated);
    if (success) {
      cloudUpdatedAtRef.current = Date.now();
      setSyncError(false);
    } else {
      setSyncError(true);
    }
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
    if (window.confirm("Logout from Fleet Cloud?")) {
      saveUser(null);
      setUser(null);
      setEntries([]);
    }
  };

  if (!isLoaded || isInitialSyncing) {
    return (
      <div className="min-h-screen bg-indigo-950 flex flex-col items-center justify-center text-white p-10 text-center">
        <div className="relative mb-8">
           <div className="w-24 h-24 border-8 border-white/5 rounded-full"></div>
           <div className="w-24 h-24 border-8 border-t-emerald-400 rounded-full animate-spin absolute top-0 left-0"></div>
           <div className="absolute inset-0 flex items-center justify-center">
             <i className="fas fa-satellite text-3xl text-emerald-400 animate-pulse"></i>
           </div>
        </div>
        <h2 className="text-2xl font-black uppercase tracking-[0.4em] mb-4">Connecting...</h2>
        <div className="bg-white/5 border border-white/10 p-5 rounded-3xl backdrop-blur-md max-w-xs shadow-2xl">
          <p className="text-indigo-200 text-[10px] font-black uppercase tracking-widest leading-relaxed">
            Linking Mobile to Laptop Cloud...<br/>
            {syncError ? "Connection unstable, retrying..." : "Establishing Secure Data Tunnel"}
          </p>
          {syncError && (
            <button 
              onClick={() => performSync(true)} 
              className="mt-4 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
            >
              Force Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={async (u) => { 
      setUser(u); 
      setIsInitialSyncing(true);
      await performSync(true); 
      setIsInitialSyncing(false);
    }} />;
  }

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto bg-slate-50 relative pb-20 md:max-w-4xl md:pb-0">
      <header className="bg-indigo-700 text-white p-6 pt-10 sticky top-0 z-10 shadow-lg md:rounded-b-[40px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className={`p-3 rounded-2xl border transition-all relative ${syncError ? 'bg-rose-500/20 border-rose-500/50' : 'bg-white/10 border-white/10'}`}>
               <i className={`fas ${syncError ? 'fa-triangle-exclamation text-rose-400' : 'fa-broadcast-tower text-white'}`}></i>
               {!syncError && isSyncing && (
                 <span className="absolute -top-1 -right-1 flex h-4 w-4">
                   <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                   <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-indigo-700"></span>
                 </span>
               )}
             </div>
             <div>
               <h1 className="text-xl font-black tracking-tight leading-none uppercase italic">Fleet Cloud</h1>
               <div className="flex items-center gap-2 mt-2">
                 <div className={`w-2 h-2 rounded-full ${syncError ? 'bg-rose-500 animate-pulse' : 'bg-emerald-400 shadow-[0_0_10px_#10b981]'}`}></div>
                 <p className="text-indigo-200 text-[9px] font-black uppercase tracking-widest">
                   {syncError ? 'Reconnecting...' : isSyncing ? 'Syncing...' : 'Connected'}
                 </p>
               </div>
             </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => performSync(true)} 
              disabled={isSyncing}
              className={`bg-white/10 hover:bg-white/20 p-3.5 rounded-2xl transition-all border border-white/10 ${isSyncing ? 'opacity-50' : ''}`}
            >
              <i className={`fas fa-sync-alt text-xs ${isSyncing ? 'animate-spin' : ''}`}></i>
            </button>
            <button onClick={handleLogout} className="bg-white/10 hover:bg-white/20 p-3.5 rounded-2xl transition-all border border-white/10">
              <i className="fas fa-power-off text-xs text-rose-300"></i>
            </button>
          </div>
        </div>
      </header>

      {/* Sync Status Banner */}
      <div className={`text-center py-2 transition-all shadow-inner relative ${syncError ? 'bg-rose-600' : 'bg-emerald-600'}`}>
        <p className="text-[7px] font-black text-white uppercase tracking-[0.5em] relative z-10">
          {syncError ? '⚠️ SYNC INTERRUPTED - ATTEMPTING RECOVERY' : `✓ CLOUD MASTER VERIFIED • ${new Date(lastSyncTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
        </p>
        {syncError && <div className="absolute inset-0 bg-white/10 animate-pulse"></div>}
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
           <p className="text-[12px] font-black text-indigo-600 uppercase tracking-[0.2em]">Developed by Mehedi Hasan Soumik</p>
           <div className="flex justify-center gap-8 mt-6 opacity-20 grayscale hover:grayscale-0 transition-all cursor-default">
             <i className="fas fa-laptop text-lg"></i>
             <i className="fas fa-cloud text-xs mt-1 animate-bounce"></i>
             <i className="fas fa-mobile-screen text-lg"></i>
           </div>
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3 flex justify-around items-center z-20 md:static md:bg-transparent md:border-none md:p-6 md:justify-center md:gap-10">
        <button 
          onClick={() => { setEditingEntry(null); setActiveTab('dashboard'); }}
          className={`flex flex-col items-center gap-1 p-2 min-w-[64px] transition-all ${activeTab === 'dashboard' ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-transparent'}`}>
            <i className="fas fa-chart-pie text-xl"></i>
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
          <span className="text-[9px] font-black uppercase tracking-tighter mt-1">Record</span>
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