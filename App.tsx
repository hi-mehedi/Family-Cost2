import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, doc, setDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { DailyEntry, ActiveTab, AuthUser } from './types';
import { getUser, saveUser } from './storage';

// Component imports
import Dashboard from './components/Dashboard';
import EntryForm from './components/EntryForm';
import HistoryView from './components/HistoryView';
import Login from './components/Login';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'error' | 'syncing' | 'pushing'>('synced');

  useEffect(() => {
    const savedUser = getUser();
    setUser(savedUser);

    if (savedUser?.syncToken) {
      // Data load hoyar somoy "syncing" status dekhabe
      setSyncStatus('syncing');

      const q = query(
        collection(db, "users", savedUser.syncToken, "entries")
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const cloudData: DailyEntry[] = [];
        snapshot.forEach((doc) => {
          cloudData.push(doc.data() as DailyEntry);
        });

        // Date onujayi data sort kora
        const sortedData = cloudData.sort((a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        setEntries(sortedData);
        setSyncStatus('synced');
      }, (error) => {
        console.error("Firebase Sync Error:", error);
        setSyncStatus('error');
      });

      setIsLoaded(true);
      return () => unsubscribe();
    } else {
      setIsLoaded(true);
    }
  }, []);

  const handleAddEntry = async (entry: DailyEntry) => {
      if (!user?.syncToken) {
        alert("Pulse ID khuje paoa jachche na!");
        return;
      }

      try {
        setSyncStatus('pushing');
        console.log("Data Firebase-e pathanor chesta korchi..."); // Debug log

        await setDoc(doc(db, "users", user.syncToken, "entries", entry.id), entry);

        console.log("Data successfully chole geche!"); // Success log
        setSyncStatus('synced');
        setActiveTab('dashboard');
      } catch (e) {
        console.error("Firebase Error:", e); // Error log
        alert("Firebase pathate parchena! Console-e error dekhun.");
        setSyncStatus('error');
      }
    };

  if (!isLoaded) return <div className="bg-indigo-950 min-h-screen text-white flex items-center justify-center italic">Mehedi Sync Engine Loading...</div>;

  if (!user) return <Login onLogin={(u) => { setUser(u); saveUser(u); window.location.reload(); }} />;

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto bg-slate-50 relative pb-20">
      <header className="bg-indigo-700 text-white p-6 shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-black italic tracking-tighter leading-none">FAMILY COST</h1>
            <p className="text-[10px] text-indigo-200 mt-1">ID: {user.syncToken}</p>
          </div>
          <span className={`text-[10px] px-3 py-1 rounded-full font-bold shadow-inner ${
            syncStatus === 'synced' ? 'bg-emerald-500' :
            syncStatus === 'pushing' ? 'bg-blue-500 animate-pulse' : 'bg-rose-500'
          }`}>
            {syncStatus === 'synced' ? '● CLOUD' : syncStatus.toUpperCase()}
          </span>
        </div>
      </header>

      <main className="flex-1 p-4 overflow-y-auto">
        {activeTab === 'dashboard' && <Dashboard entries={entries.filter(e => !e.isHistory)} />}
        {activeTab === 'entry' && <EntryForm onAdd={handleAddEntry} onCancel={() => setActiveTab('dashboard')} />}
        {activeTab === 'history' && <HistoryView entries={entries} onEdit={() => {}} onDelete={() => {}} />}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex justify-around items-center z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center ${activeTab === 'dashboard' ? 'text-indigo-600' : 'text-slate-400'}`}>
          <i className="fas fa-chart-line text-xl"></i>
          <span className="text-[9px] font-bold mt-1 uppercase">Stats</span>
        </button>
        <button onClick={() => setActiveTab('entry')} className="bg-indigo-600 text-white w-14 h-14 rounded-2xl -mt-12 shadow-xl flex items-center justify-center transform active:scale-95 transition-all border-4 border-white">
          <i className="fas fa-plus text-2xl"></i>
        </button>
        <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center ${activeTab === 'history' ? 'text-indigo-600' : 'text-slate-400'}`}>
          <i className="fas fa-list-ul text-xl"></i>
          <span className="text-[9px] font-bold mt-1 uppercase">History</span>
        </button>
      </nav>
    </div>
  );
};

export default App;