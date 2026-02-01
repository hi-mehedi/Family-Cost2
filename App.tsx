import React, { useState, useEffect } from 'react';
import { DailyEntry, ActiveTab, AuthUser } from './types';
import { saveEntries, getEntries, getUser, saveUser, exportState } from './storage';
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
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [currentSyncToken, setCurrentSyncToken] = useState('');

  useEffect(() => {
    setUser(getUser());
    setEntries(getEntries());
    setIsLoaded(true);
  }, []);

  const handleAddEntry = (entry: DailyEntry) => {
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
    saveEntries(updated);
    setActiveTab('dashboard');
  };

  const handleDeleteEntry = (id: string) => {
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated);
    saveEntries(updated);
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

  const handleSyncClick = () => {
    const token = exportState();
    setCurrentSyncToken(token);
    setShowSyncModal(true);
  };

  const copySyncToken = () => {
    navigator.clipboard.writeText(currentSyncToken);
    alert('Sync Token Copied! Use this to login on your other mobile.');
  };

  if (!isLoaded) return null;

  if (!user) {
    return <Login onLogin={u => setUser(u)} />;
  }

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto bg-slate-50 relative pb-20 md:max-w-4xl md:pb-0">
      <header className="bg-indigo-700 text-white p-6 pt-10 sticky top-0 z-10 shadow-lg md:rounded-b-[40px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="bg-white/20 p-2 rounded-2xl border border-white/20">
               <i className="fas fa-home-user text-white"></i>
             </div>
             <div>
               <h1 className="text-xl font-black tracking-tight">Family Daily Cost</h1>
               <div className="flex items-center gap-2">
                 <p className="text-indigo-200 text-[9px] font-black uppercase tracking-widest">{user.email}</p>
                 <span className="bg-emerald-500 w-1.5 h-1.5 rounded-full"></span>
               </div>
             </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSyncClick} className="bg-white/10 hover:bg-white/20 p-3 rounded-2xl transition-all border border-white/10" title="Cloud Sync">
              <i className="fas fa-sync-alt text-xs"></i>
            </button>
            <button onClick={handleLogout} className="bg-white/10 hover:bg-white/20 p-3 rounded-2xl transition-all border border-white/10">
              <i className="fas fa-sign-out-alt text-xs"></i>
            </button>
          </div>
        </div>
      </header>

      {showSyncModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl animate-in zoom-in-95 duration-300">
             <div className="text-center mb-6">
                <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-cloud-upload-alt text-2xl"></i>
                </div>
                <h2 className="text-xl font-black text-slate-800">Cloud Sync Token</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Use this to login on another phone</p>
             </div>
             <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200 mb-6">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Your Secret Sync Key</p>
                <div className="bg-white p-3 rounded-2xl border border-slate-100 overflow-hidden">
                  <p className="text-[10px] font-mono break-all text-slate-600 line-clamp-3">{currentSyncToken}</p>
                </div>
             </div>
             <div className="space-y-3">
               <button onClick={copySyncToken} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-indigo-100 flex items-center justify-center gap-2">
                 <i className="fas fa-copy"></i> COPY SYNC KEY
               </button>
               <button onClick={() => setShowSyncModal(false)} className="w-full bg-slate-100 text-slate-600 py-4 rounded-2xl font-black">
                 CLOSE
               </button>
             </div>
             <p className="text-[9px] text-center text-rose-500 font-black uppercase tracking-widest mt-6 leading-tight">Keep this secret! It contains your account access.</p>
           </div>
        </div>
      )}

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
            onDelete={handleDeleteEntry} 
            onEdit={handleEditRequest} 
          />
        )}
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