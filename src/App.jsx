import React, { useState, useEffect } from 'react';
import AuthPage from './pages/AuthPage';
import FarmerApp from './pages/FarmerApp';
import BuyerApp from './pages/BuyerApp';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing login
    const token = localStorage.getItem('nr_token');
    const storedUser = localStorage.getItem('nr_user');
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('nr_token');
        localStorage.removeItem('nr_user');
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData, token) => {
    localStorage.setItem('nr_token', token);
    localStorage.setItem('nr_user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('nr_token');
    localStorage.removeItem('nr_user');
    setUser(null);
  };

  if (loading) {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        background: 'linear-gradient(150deg,#0D47A1,#1565C0,#1E88E5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: '16px'
      }}>
        <div style={{ fontSize: '3rem', animation: 'spin 1s linear infinite' }}>🌾</div>
        <div style={{ color: '#fff', fontSize: '1.1rem', fontFamily: 'Poppins,sans-serif', fontWeight: 700 }}>
          Namma Raitha
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage onLogin={handleLogin} />;
  }

  if (user.role === 'farmer') {
    return <FarmerApp user={user} onLogout={handleLogout} />;
  }

  return <BuyerApp user={user} onLogout={handleLogout} />;
}

export default App;
