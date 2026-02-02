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
  const [syncStatus, setSyncStatus] = useState<'synced' | 'error' | 'syncing' | 'pushing'>('synced');
  const [lastSyncTime, setLastSyncTime] = useState<number>(Date.now());
  
  const lastKnownCloudUpdate = useRef<number>(0);
  const syncInProgress = useRef<boolean>(false);

  /**
   * SMART SYNC ENGINE V30
   * This logic ensures Laptop and Mobile talk to each other correctly.
   */
  const performSync = useCallback(async (forcePull = false) => {
    const currentUser = getUser();
    if (!currentUser || !currentUser.syncToken || syncInProgress.current) return;
    
    syncInProgress.current = true;
    setSyncStatus('syncing');

    try {
      const cloudData = await pullFromCloud(currentUser.syncToken);
      
      if (cloudData) {
        // PREVENT RESET BUG:
        // If we have local data but cloud is empty, we should PUSH our local data
        // instead of wiping it.
        const localData = getEntriesLocally();
        
        if (cloudData.updatedAt === 0 && localData.length > 0) {
          console.log("Cloud empty, local has data. Initializing cloud...");
          await pushToCloud(localData, currentUser.syncToken);
          lastKnownCloudUpdate.current = Date.now();
        } 
        else if (cloudData.updatedAt > lastKnownCloudUpdate.current || forcePull) {
          // Cloud has newer data or user forced a refresh
          if (Array.isArray(cloudData.entries) && cloudData.entries.length > 0) {
            setEntries(cloudData.entries);
            saveEntriesLocally(cloudData.entries);
            lastKnownCloudUpdate.current = cloudData.updatedAt;
          }
        }
        setSyncStatus('synced');
        setLastSyncTime(Date.now());
      } else {
        setSyncStatus('error');
      }
    } catch (e) {
      setSyncStatus('error');
    } finally {
      syncInProgress.current = false;
    }
  }, []);

  // App Initialization
  useEffect(() => {
    const boot = async () => {
      const savedUser = getUser();
      setUser(savedUser);
      
      if (savedUser && savedUser.syncToken) {
        // Load local first for speed
        const local = getEntriesLocally();
        setEntries(local);
        // Then try to pull from Laptop/Cloud
        await performSync(true);
      } else {
        setEntries(getEntriesLocally());
      }
      setIsLoaded(true);
    };
    boot();
  }, [performSync]);

  // High Frequency Background Sync: Every 10 seconds
  useEffect(() => {
    if (!user || !user.syncToken) return;
    const interval = setInterval(() => {
      performSync();
    }, 10000); 
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
    
    // UI Updates First
    setEntries(updated);
    saveEntriesLocally(updated);
    setActiveTab('dashboard');

    // Push to Cloud Pulse
    if (user?.syncToken) {
      setSyncStatus('pushing');
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
    if (window.confirm("Logout? This device will disconnect from the cloud token.")) {
      saveUser(null);
      setUser(null);
      setEntries([]);
      lastKnownCloudUpdate.current = 0;
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-indigo-950 flex flex-col items-center justify-center text-white p-10">
        <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin mb-6"></div>
        <h2 className="text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">Establishing Secure Link...</h2>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={async (u) => { 
      setUser(u); 
      // Force initial sync on login
      await performSync(true); 
    }} />;
  }

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto bg-slate-50 relative pb-20 md:max-w-4xl md:pb-0">
      <header className="bg-indigo-700 text-white p-6 pt-10 sticky top-0 z-20 shadow-lg md:rounded-b-[40px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 ${
               syncStatus === 'synced' ? 'bg-emerald-500/20 border-emerald-500/40 rotate-0' : 
               syncStatus === 'syncing' ? 'bg-blue-500/20 border-blue-500/40 animate-pulse' : 
               syncStatus === 'pushing' ? 'bg-amber-500/20 border-amber-500/40 animate-bounce' :
               'bg-rose-500/20 border-rose-500/40'
             }`}>
               <i className={`fas ${
                 syncStatus === 'synced' ? 'fa-cloud' : 
                 syncStatus === 'syncing' ? 'fa-sync-alt animate-spin' : 
                 syncStatus === 'pushing' ? 'fa-cloud-upload-alt' :
                 'fa-exclamation-triangle'
               } text-lg`}></i>
             </div>
             <div>
               <h1 className="text-xl font-black tracking-tighter leading-none uppercase italic">Family Cost</h1>
               <div className="flex items-center gap-2 mt-2">
                 <div className={`w-2 h-2 rounded-full ${
                   syncStatus === 'synced' ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]' : 
                   syncStatus === 'error' ? 'bg-rose-500 animate-pulse' : 
                   'bg-amber-400 animate-pulse'
                 }`}></div>
                 <p className="text-indigo-100 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                   Pulse ID: <span className="bg-black/20 px-1.5 py-0.5 rounded text-white font-black">{user.syncToken}</span>
                 </p>
               </div>
             </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => performSync(true)} 
              className={`bg-white/10 hover:bg-white/20 p-3.5 rounded-2xl border border-white/10 active:scale-90 transition-all ${syncStatus === 'syncing' ? 'opacity-50 pointer-events-none' : ''}`}
              title="Manual Sync Pulse"
            >
              <i className={`fas fa-sync ${syncStatus === 'syncing' ? 'animate-spin' : ''} text-xs`}></i>
            </button>
            <button onClick={handleLogout} className="bg-white/10 hover:bg-white/20 p-3.5 rounded-2xl border border-white/10">
              <i className="fas fa-power-off text-xs text-rose-300"></i>
            </button>
          </div>
        </div>
      </header>

      {/* Real-time Status Banner */}
      <div className={`text-center py-2 transition-all duration-500 shadow-inner overflow-hidden ${
        syncStatus === 'error' ? 'bg-rose-600' : 
        syncStatus === 'pushing' ? 'bg-amber-600' :
        'bg-emerald-600'
      }`}>
        <p className="text-[8px] font-black text-white uppercase tracking-[0.4em]">
          {syncStatus === 'error' ? '⚠️ CLOUD DISCONNECTED - RETRYING' : 
           syncStatus === 'pushing' ? '↑ UPDATING CLOUD STATE...' :
           `✓ CONNECTED TO MASTER • ${new Date(lastSyncTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'})}`}
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
           <div className="inline-flex items-center gap-2 mb-2 px-3 py-1 bg-slate-100 rounded-lg">
             <i className="fas fa-microchip text-[10px] text-slate-400"></i>
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Mehedi Sync Engine V30</p>
           </div>
           <p className="text-[11px] font-black text-indigo-800 uppercase tracking-[0.3em] mt-4">Family Cost Tracker</p>
           
           <div className="flex justify-center gap-10 mt-8 opacity-10">
              <i className="fas fa-laptop text-2xl"></i>
              <i className="fas fa-exchange-alt text-xs mt-2 animate-pulse"></i>
              <i className="fas fa-mobile-screen text-2xl"></i>
           </div>
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-4 flex justify-around items-center z-30 md:static md:bg-transparent md:border-none md:p-6 md:justify-center md:gap-12">
        <button 
          onClick={() => { setEditingEntry(null); setActiveTab('dashboard'); }}
          className={`flex flex-col items-center gap-1.5 p-2 min-w-[70px] transition-all active:scale-95 ${activeTab === 'dashboard' ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-slate-50'}`}>
            <i className="fas fa-chart-pie text-xl"></i>
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest">Stats</span>
        </button>

        <button 
          onClick={() => { setEditingEntry(null); setActiveTab('entry'); }}
          className={`flex flex-col items-center gap-1.5 p-2 min-w-[70px] transition-all active:scale-95 ${activeTab === 'entry' && !editingEntry ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <div className={`w-14 h-14 rounded-3xl flex items-center justify-center shadow-2xl -mt-10 transition-all ${activeTab === 'entry' && !editingEntry ? 'bg-indigo-600 text-white scale-110' : 'bg-slate-100 text-slate-400'}`}>
            <i className="fas fa-plus text-2xl"></i>
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest mt-1">Add</span>
        </button>

        <button 
          onClick={() => { setEditingEntry(null); setActiveTab('history'); }}
          className={`flex flex-col items-center gap-1.5 p-2 min-w-[70px] transition-all active:scale-95 ${activeTab === 'history' ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${activeTab === 'history' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-slate-50'}`}>
            <i className="fas fa-history text-xl"></i>
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest">History</span>
        </button>
      </nav>
    </div>
  );
};

export default App;