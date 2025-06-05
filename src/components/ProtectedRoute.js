import React, { useState } from 'react';

// Simple admin protection using a password
// In a real application, you would use a proper authentication system
const adminPassword = 'admin123'; // This should be stored securely in a real app

function ProtectedRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(localStorage.getItem('adminAuthenticated') === 'true');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = () => {
    if (password === adminPassword) {
      localStorage.setItem('adminAuthenticated', 'true');
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Password salah');
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
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
          </div>
          
          {error && (
            <div className="mb-4 p-2 bg-red-100 text-red-800 rounded-md text-center">
              {error}
            </div>
          )}
          
          <button
            className="w-full h-12 font-roboto bg-[#14eb99] text-white rounded-xl hover:bg-[#10b777]"
            onClick={handleLogin}
          >
            Login
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