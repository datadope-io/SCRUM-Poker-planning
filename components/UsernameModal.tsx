import { useState, useEffect } from 'react';

export function UsernameModal({ onSave, onClose }) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username.trim().length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }
    if (username.trim().length > 20) {
      setError('Name must be less than 20 characters');
      return;
    }
    onSave(username.trim());
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-white mb-2">Welcome! 👋</h2>
        <p className="text-slate-400 mb-6">Enter your name to join the planning poker session.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-slate-300 mb-2">
              Your Name
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError('');
              }}
              placeholder="e.g., John Doe"
              maxLength={20}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              autoFocus
            />
            {error && <p className="text-rose-400 text-sm mt-2">{error}</p>}
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg transition-colors shadow-lg hover:shadow-indigo-500/25"
          >
            Join Room
          </button>
        </form>

        <p className="text-xs text-slate-500 mt-4 text-center">
          Your name will be saved for future sessions
        </p>
      </div>
    </div>
  );
}

export function useUsername() {
  const [username, setUsername] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Load username from localStorage on mount
    const saved = localStorage.getItem('poker_username');
    if (saved) {
      setUsername(saved);
    }
    setIsLoaded(true);
  }, []);

  const saveUsername = (name: string) => {
    setUsername(name);
    localStorage.setItem('poker_username', name);
  };

  return { username, saveUsername, isLoaded };
}
