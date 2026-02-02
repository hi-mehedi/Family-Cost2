import React, { useState } from 'react';
import { AuthUser } from '../types';
import { validateAdmin, saveUser, importState } from '../storage';

interface LoginProps {
  onLogin: (user: AuthUser) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isImporting, setIsImporting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [syncToken, setSyncToken] = useState('');
  const [error, setError] = useState('');

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isImporting) {
      if (!syncToken) return setError('Please paste your Sync Token');
      const success = importState(syncToken);
      if (success) {
        const user = { email, id: 'admin-1' };
        onLogin(user);
      } else {
        setError('Invalid Sync Token. Check and try again.');
      }
      return;
    }

    if (validateAdmin(email, password)) {
      const user = { email, id: 'admin-1' };
      saveUser(user);
      onLogin(user);
    } else {
      setError('Invalid admin credentials. Access denied.');
    }
  };

  return (
    <div className="min-h-screen bg-indigo-700 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-indigo-600 rounded-full blur-3xl opacity-50 animate-pulse"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-indigo-800 rounded-full blur-3xl opacity-50"></div>

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-[30px] flex items-center justify-center mx-auto mb-6 border border-white/30 shadow-2xl">
            <i className="fas fa-user-shield text-white text-3xl"></i>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tighter">Family Cost</h1>
          <p className="text-indigo-200 text-[10px] font-black uppercase tracking-widest mt-2 opacity-80">Admin Access Only</p>
        </div>

        <div className="bg-white p-8 rounded-[40px] shadow-2xl border border-indigo-100/20 relative">
          <form onSubmit={handleAuth} className="space-y-4">
            {error && <div className="bg-rose-50 text-rose-500 text-[10px] font-black p-3 rounded-2xl border border-rose-100 uppercase tracking-widest text-center">{error}</div>}
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Admin Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="admin@email.com" className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-3xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 font-bold transition-all" />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-3xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 font-bold transition-all" />
            </div>

            {isImporting && (
              <div className="space-y-2 animate-in slide-in-from-top-2">
                <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-4">Sync Token (Restores Data)</label>
                <textarea value={syncToken} onChange={e => setSyncToken(e.target.value)} required placeholder="Paste your sync token from another phone..." className="w-full px-6 py-4 bg-indigo-50 border border-indigo-200 rounded-3xl outline-none focus:ring-4 focus:ring-indigo-500/10 font-mono text-[10px] h-24" />
              </div>
            )}

            <button type="submit" className="w-full bg-indigo-600 text-white py-5 rounded-3xl font-black shadow-xl shadow-indigo-100 uppercase tracking-[0.2em] text-sm mt-4 hover:bg-indigo-700 active:scale-[0.98] transition-all">
              {isImporting ? 'Import & Access' : 'Admin Sign In'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-50 flex flex-col gap-3 text-center">
            <button onClick={() => setIsImporting(!isImporting)} className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 py-2 rounded-xl">
              {isImporting ? 'Back to login' : 'Sync data from other phone?'}
            </button>
          </div>
          
          <div className="mt-8 text-center opacity-40">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Developed by Mehedi Hasan Soumik</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;