import React, { useState } from 'react';
import { AuthUser } from '../types';
import { getRegisteredUsers, registerUser, saveUser } from '../storage';

interface LoginProps {
  onLogin: (user: AuthUser) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isRegistering) {
      if (!email || !password) return setError('Fill all fields');
      const users = getRegisteredUsers();
      if (users[email]) return setError('Email already exists');
      registerUser(email, password);
      const user = { email, id: crypto.randomUUID() };
      saveUser(user);
      onLogin(user);
    } else {
      const users = getRegisteredUsers();
      if (users[email] && users[email] === password) {
        const user = { email, id: crypto.randomUUID() };
        saveUser(user);
        onLogin(user);
      } else {
        setError('Invalid email or password');
      }
    }
  };

  const handleForgot = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Reset link sent to ${email}`);
    setIsForgot(false);
  };

  if (isForgot) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-white p-8 rounded-[40px] shadow-2xl border border-slate-100">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Reset Password</h2>
            <p className="text-slate-400 text-xs font-bold mt-2">Enter your email to receive a link</p>
          </div>
          <form onSubmit={handleForgot} className="space-y-4">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="Email Address" className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-3xl outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold" />
            <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-3xl font-black shadow-lg shadow-indigo-100 uppercase tracking-widest text-sm">Send Reset Link</button>
            <button type="button" onClick={() => setIsForgot(false)} className="w-full text-slate-400 text-[10px] font-black uppercase tracking-widest">Back to Login</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-indigo-700 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-indigo-600 rounded-full blur-3xl opacity-50 animate-pulse"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-indigo-800 rounded-full blur-3xl opacity-50"></div>

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-[30px] flex items-center justify-center mx-auto mb-6 border border-white/30 shadow-2xl">
            <i className="fas fa-wallet text-white text-3xl"></i>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tighter">Family Daily Cost</h1>
          <p className="text-indigo-200 text-xs font-black uppercase tracking-widest mt-2 opacity-80">Track your fleet & bazar</p>
        </div>

        <div className="bg-white p-8 rounded-[40px] shadow-2xl border border-indigo-100/20">
          <form onSubmit={handleAuth} className="space-y-4">
            {error && <div className="bg-rose-50 text-rose-500 text-[10px] font-black p-3 rounded-2xl border border-rose-100 uppercase tracking-widest text-center">{error}</div>}
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-3xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 font-bold transition-all" />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-3xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 font-bold transition-all" />
            </div>

            {!isRegistering && (
              <div className="text-right">
                <button type="button" onClick={() => setIsForgot(true)} className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-700 transition-colors">Forgot Password?</button>
              </div>
            )}

            <button type="submit" className="w-full bg-indigo-600 text-white py-5 rounded-3xl font-black shadow-xl shadow-indigo-100 uppercase tracking-[0.2em] text-sm mt-4 hover:bg-indigo-700 active:scale-[0.98] transition-all">
              {isRegistering ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-50 text-center">
            <button onClick={() => setIsRegistering(!isRegistering)} className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {isRegistering ? 'Already have an account? Sign In' : "Don't have an account? Register"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;