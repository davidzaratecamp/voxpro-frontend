import { useState } from 'react';

const CONFIG_PASSWORD = 'Asiste2026@@';

export default function PasswordGate({ children, sessionKey = 'voxpro_config_unlocked' }) {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(sessionKey) === '1');
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  if (unlocked) return children;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input === CONFIG_PASSWORD) {
      sessionStorage.setItem(sessionKey, '1');
      setUnlocked(true);
    } else {
      setError('Contraseña incorrecta');
      setInput('');
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-20 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-50 text-amber-600 mb-4">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-slate-800 mb-1">Acceso protegido</h2>
      <p className="text-sm text-slate-500 mb-4">Esta sección requiere contraseña.</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="password"
          value={input}
          onChange={(e) => { setInput(e.target.value); setError(''); }}
          autoFocus
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Contraseña"
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          type="submit"
          className="w-full bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Entrar
        </button>
      </form>
    </div>
  );
}
