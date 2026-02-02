import React, { useState } from 'react';
import { AuthUser } from '../types';
import { validateAdmin, saveUser } from '../storage';

interface LoginProps {
  onLogin: (user: AuthUser) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [syncToken, setSyncToken] = useState('');
  const [error, setError] = useState('');

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!syncToken || syncToken.length < 3) {
      return setError('Sync Token must be at least 3 characters');
    }

    if (validateAdmin(email, password)) {
      const user: AuthUser = { 
        email, 
        id: 'admin-1',
        syncToken: syncToken.trim().toLowerCase() 
      };
      saveUser(user);
      onLogin(user);
    } else {
      setError('Incorrect admin credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-indigo-700 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-80 h-80 bg-indigo-600 rounded-full blur-3xl opacity-50"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-80 h-80 bg-indigo-800 rounded-full blur-3xl opacity-50"></div>

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-white/10 backdrop-blur-xl rounded-3xl flex items-center justify-center mx-auto mb-6 border border-white/20 shadow-2xl">
            <i className="fas fa-wallet text-white text-3xl"></i>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter italic">Family Cost</h1>
          <p className="text-indigo-200 text-[10px] font-black uppercase tracking-[0.3em] mt-3 opacity-80 leading-relaxed">
            Personal Fleet & Daily Bazar Tracker<br/>
            Secure Cloud Sync
          </p>
        </div>

        <div className="bg-white p-8 pb-10 rounded-[40px] shadow-2xl">
          <form onSubmit={handleAuth} className="space-y-5">
            {error && (
              <div className="bg-rose-50 text-rose-500 text-[10px] font-black p-4 rounded-2xl border border-rose-100 uppercase tracking-widest text-center">
                <i className="fas fa-exclamation-circle mr-2"></i>
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Sync Token (Your Private Key)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-indigo-400">
                  <i className="fas fa-fingerprint"></i>
                </div>
                <input 
                  type="text" 
                  value={syncToken} 
                  onChange={e => setSyncToken(e.target.value)} 
                  required 
                  placeholder="e.g. Mehedi2025" 
                  className="w-full pl-14 pr-6 py-4 bg-indigo-50/50 border border-indigo-100 rounded-3xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 font-bold text-indigo-700 transition-all placeholder:text-indigo-200" 
                />
              </div>
              <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest text-center mt-1">
                *Use this exact token on all devices to share data.
              </p>
            </div>

            <div className="h-px bg-slate-100 mx-4"></div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Email</label>
              <input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required 
                placeholder="mehedi.admin@gmail.com" 
                className="w-full px-7 py-4 bg-slate-50 border border-slate-200 rounded-3xl outline-none focus:border-indigo-600 font-bold transition-all" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Password</label>
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
                placeholder="••••••••" 
                className="w-full px-7 py-4 bg-slate-50 border border-slate-200 rounded-3xl outline-none focus:border-indigo-600 font-bold transition-all" 
              />
            </div>

            <button type="submit" className="w-full bg-indigo-600 text-white py-5 rounded-3xl font-black shadow-lg uppercase tracking-[0.2em] text-sm mt-6 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-3">
              <span>Secure Login</span>
              <i className="fas fa-arrow-right text-xs"></i>
            </button>
          </form>

          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mt-8 text-center">Developed by Mehedi Hasan Soumik</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
