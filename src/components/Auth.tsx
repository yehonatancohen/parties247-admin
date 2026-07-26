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
    <div className="max-w-sm mx-auto mt-16">
      <form onSubmit={handleSubmit} className="bg-jungle-surface p-8 rounded-lg shadow-lg border border-wood-brown/50">
        <h2 className="text-center text-3xl font-display mb-6 text-white">Admin Access</h2>
        <div className="mb-4">
          <label htmlFor="password" className="block text-sm font-medium text-jungle-text/80 mb-2">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-jungle-deep text-white p-2 rounded-md border border-wood-brown focus:ring-2 focus:ring-jungle-lime focus:outline-none"
            disabled={isLoading}
            aria-describedby="error-message"
          />
        </div>
        {error && <p id="error-message" className="text-red-500 text-sm mb-4 text-center">{error}</p>}
        <button 
          type="submit" 
          className="w-full bg-jungle-lime text-jungle-deep font-bold py-2 px-4 rounded-md hover:bg-opacity-80 transition-colors flex justify-center items-center h-10 disabled:bg-gray-600 disabled:cursor-not-allowed"
          disabled={isLoading || !password.trim()}
        >
          {isLoading ? <LoadingSpinner /> : 'Login'}
        </button>
      </form>
    </div>
  );
};

export default Auth;