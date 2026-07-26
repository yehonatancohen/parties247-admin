"use client"
import React, { useState, FormEvent } from 'react';
import LoadingSpinner from './LoadingSpinner';
import * as api from '../services/api';

interface AuthProps {
  onAuthSuccess: () => void;
}

const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const pass = password.trim();
    if (!pass) return;

    setIsLoading(true);
    setError(null);

    try {
      await api.login(pass);
      onAuthSuccess();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Login failed: ${errorMessage}`);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <form onSubmit={handleSubmit} className="bg-jungle-surface p-8 rounded-xl shadow-lg border border-wood-brown">
          <h2 className="text-center text-2xl font-display font-bold mb-6 text-jungle-text">Admin Access</h2>
          <div className="mb-4">
            <label htmlFor="password" className="block text-sm font-medium text-jungle-text/70 mb-2">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-jungle-deep text-jungle-text p-2.5 rounded-md border border-wood-brown focus:ring-2 focus:ring-jungle-accent focus:border-jungle-accent focus:outline-none"
              disabled={isLoading}
              aria-describedby="error-message"
            />
          </div>
          {error && <p id="error-message" className="text-red-400 text-sm mb-4 text-center">{error}</p>}
          <button
            type="submit"
            className="w-full bg-jungle-accent text-white font-bold py-2.5 px-4 rounded-md hover:opacity-90 transition-opacity flex justify-center items-center h-10 disabled:bg-slate-600 disabled:cursor-not-allowed"
            disabled={isLoading || !password.trim()}
          >
            {isLoading ? <LoadingSpinner /> : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Auth;