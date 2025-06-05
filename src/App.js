import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HomePage, AdminPage } from './pages';
import ProtectedRoute from './components/ProtectedRoute';
import { Analytics } from '@vercel/analytics/react';
import './App.css';

function App() {  
  return (
    <Router>
      <Analytics />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/admin" element={
          <ProtectedRoute>
            <AdminPage />
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;