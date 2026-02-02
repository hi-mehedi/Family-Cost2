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
  const [syncError, setSyncError] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number>(Date.now());
  
  const lastCloudTimestamp = useRef<number>(0);

  /**
   * PULL LATEST FROM CLOUD
   * Ensures this device matches the Master Cloud Record.
   */
  const performSync = useCallback(async (isInitial = false) => {
    if (isSyncing && !isInitial) return;
    setIsSyncing(true);
    
    try {
      const cloudData = await pullFromCloud();
      if (cloudData && cloudData.entries) {
        // If cloud data is newer OR we are starting up, update local view
        if (isInitial || cloudData.updatedAt > lastCloudTimestamp.current) {
           setEntries(cloudData.entries);
           saveEntriesLocally(cloudData.entries);
           lastCloudTimestamp.current = cloudData.updatedAt;
        }
        setSyncError(false);
      } else if (isInitial && !cloudData) {
        // If it's a first time login and cloud is empty, we keep local
        console.log("Cloud is empty or unreachable on startup.");
      }
      setLastSyncTime(Date.now());
    } catch (e) {
      setSyncError(true);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  // Handle Login and Initial Load
  useEffect(() => {
    const startup = async () => {
      const savedUser = getUser();
      setUser(savedUser);
      
      // Load whatever we have locally first
      setEntries(getEntriesLocally());

      if (savedUser) {
        // BUT IMMEDIATELY override with cloud data to ensure laptop data shows up
        await performSync(true);
      }
      setIsLoaded(true);
    };
    startup();
  }, []);

  // Aggressive Polling: Check every 4 seconds
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      performSync();
    }, 4000); 
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
    
    // 1. Update UI and Local Storage for speed
    setEntries(updated);
    saveEntriesLocally(updated);
    setActiveTab('dashboard');

    // 2. BROADCAST to Cloud so Mobile/Laptop sees it
    setIsSyncing(true);
    const success = await pushToCloud(updated);
    if (success) {
      lastCloudTimestamp.current = Date.now();
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
    saveUser(null);
    setUser(null);
    setEntries([]);
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-indigo-700 flex flex-col items-center justify-center text-white p-10 text-center">
        <div className="relative w-20 h-20 mb-8">
           <div className="absolute inset-0 border-4 border-white/20 rounded-full"></div>
           <div className="absolute inset-0 border-4 border-t-white rounded-full animate-spin"></div>
        </div>
        <h2 className="text-xl font-black uppercase tracking-[0.2em]">Master Sync</h2>
        <p className="text-indigo-200 text-xs mt-4 font-bold opacity-80 uppercase tracking-widest">Downloading Laptop Data to Mobile...</p>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={async (u) => { 
      setUser(u); 
      setIsSyncing(true);
      await performSync(true); // Pull everything immediately after login
      setIsSyncing(false);
    }} />;
  }

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto bg-slate-50 relative pb-20 md:max-w-4xl md:pb-0">
      <header className="bg-indigo-700 text-white p-6 pt-10 sticky top-0 z-10 shadow-lg md:rounded-b-[40px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="bg-white/20 p-2 rounded-2xl border border-white/20 relative">
               <i className="fas fa-cloud-bolt text-white"></i>
               {isSyncing && (
                 <span className="absolute -top-1 -right-1 flex h-3 w-3">
                   <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                   <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                 </span>
               )}
             </div>
             <div>
               <h1 className="text-xl font-black tracking-tight leading-none uppercase">Fleet Cloud</h1>
               <div className="flex items-center gap-2 mt-1">
                 <div className={`w-1.5 h-1.5 rounded-full ${syncError ? 'bg-rose-500 animate-pulse' : 'bg-emerald-400 shadow-[0_0_5px_#10b981]'}`}></div>
                 <p className="text-indigo-200 text-[8px] font-black uppercase tracking-widest">
                   {syncError ? 'Sync Error' : isSyncing ? 'Syncing...' : 'Cloud Verified'}
                 </p>
               </div>
             </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => performSync(true)} 
              disabled={isSyncing}
              className={`bg-white/10 hover:bg-white/20 p-3 rounded-2xl transition-all border border-white/10 ${isSyncing ? 'animate-spin' : ''}`}
            >
              <i className="fas fa-rotate text-xs"></i>
            </button>
            <button onClick={handleLogout} className="bg-white/10 hover:bg-white/20 p-3 rounded-2xl transition-all border border-white/10">
              <i className="fas fa-power-off text-xs text-rose-300"></i>
            </button>
          </div>
        </div>
      </header>

      {/* Connection Indicator Bar */}
      <div className={`text-center py-1 transition-all ${syncError ? 'bg-rose-600' : 'bg-emerald-600'}`}>
        <p className="text-[7px] font-black text-white uppercase tracking-[0.4em]">
          {syncError ? '⚠️ SYNC FAILED - RECONNECTING' : '✓ MOBILE & LAPTOP IN SYNC'}
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
        
        <div className="py-8 text-center border-t border-slate-100 mt-6">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Family Cost Monitor</p>
           <p className="text-[11px] font-black text-indigo-600 uppercase tracking-widest">Developed by Mehedi Hasan Soumik</p>
           <div className="flex justify-center gap-4 mt-3 opacity-30">
             <i className="fas fa-globe text-[10px]" title="Global Sync"></i>
             <i className="fas fa-shield-halved text-[10px]" title="Admin Encrypted"></i>
             <i className="fas fa-database text-[10px]" title="Cloud Hosted"></i>
           </div>
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-2 flex justify-around items-center z-20 md:static md:bg-transparent md:border-none md:p-6 md:justify-center md:gap-8">
        <button 
          onClick={() => { setEditingEntry(null); setActiveTab('dashboard'); }}
          className={`flex flex-col items-center gap-1 p-2 min-w-[64px] transition-all ${activeTab === 'dashboard' ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeTab === 'dashboard' ? 'bg-indigo-100' : 'bg-transparent'}`}>
            <i className="fas fa-chart-line text-lg"></i>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-tighter">Stats</span>
        </button>

        <button 
          onClick={() => { setEditingEntry(null); setActiveTab('entry'); }}
          className={`flex flex-col items-center gap-1 p-2 min-w-[64px] transition-all ${activeTab === 'entry' && !editingEntry ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeTab === 'entry' && !editingEntry ? 'bg-indigo-100' : 'bg-transparent'}`}>
            <i className="fas fa-plus-square text-lg"></i>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-tighter">Record</span>
        </button>

        <button 
          onClick={() => { setEditingEntry(null); setActiveTab('history'); }}
          className={`flex flex-col items-center gap-1 p-2 min-w-[64px] transition-all ${activeTab === 'history' ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeTab === 'history' ? 'bg-indigo-100' : 'bg-transparent'}`}>
            <i className="fas fa-book-open text-lg"></i>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-tighter">History</span>
        </button>
      </nav>
    </div>
  );
};

export default App;