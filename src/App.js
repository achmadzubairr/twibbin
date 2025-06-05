import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HomePage, AdminPage } from './pages';
import CampaignPage from './pages/campaign/CampaignPage';
import ProtectedRoute from './components/ProtectedRoute';
import { Analytics } from '@vercel/analytics/react';
import './App.css';

function App() {  
  return (
    <Router>
      <Analytics />
      <Routes>
        <Route path="/admin" element={
          <ProtectedRoute>
            <AdminPage />
          </ProtectedRoute>
        } />
        <Route path="/:slug" element={<CampaignPage />} />
        <Route path="/" element={<HomePage />} />
      </Routes>
    </Router>
  );
}

export default App;