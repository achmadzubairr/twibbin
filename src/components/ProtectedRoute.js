import React, { useState } from 'react';
import { authenticateAdmin } from '../services/adminService';

function ProtectedRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(localStorage.getItem('adminAuthenticated') === 'true');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!password.trim()) {
      setError('Password wajib diisi');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await authenticateAdmin(password);
      
      if (result.success) {
        localStorage.setItem('adminAuthenticated', 'true');
        setIsAuthenticated(true);
        setError('');
      } else {
        setError(result.error || 'Password salah');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Terjadi kesalahan saat login');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#f2fdf5] flex flex-col items-center justify-center">
        <div className="bg-white w-[18rem] md:w-[28rem] drop-shadow-lg rounded-lg overflow-hidden p-6">
          <h1 className="text-2xl font-bold mb-6 text-center">Admin Login</h1>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              className="w-full p-2 border border-gray-300 rounded-md"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleLogin()}
              disabled={isLoading}
            />
          </div>
          
          {error && (
            <div className="mb-4 p-2 bg-red-100 text-red-800 rounded-md text-center">
              {error}
            </div>
          )}
          
          <button
            className="w-full h-12 font-roboto bg-[#14eb99] disabled:bg-[#72f3c2] text-white rounded-xl hover:bg-[#10b777] disabled:hover:bg-[#72f3c2]"
            onClick={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? 'Memverifikasi...' : 'Login'}
          </button>
          
          <div className="mt-4 border-t pt-4">
            <a
              href="/"
              className="block text-center text-blue-500 hover:underline"
            >
              Kembali ke Halaman Utama
            </a>
          </div>
        </div>
      </div>
    );
  }

  return children;
}

export default ProtectedRoute;