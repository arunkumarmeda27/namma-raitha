import React, { useState, useEffect } from 'react';
import Ticker from '../components/Ticker';
import FarmerHome from './farmer/FarmerHome';
import FarmerMap from './farmer/FarmerMap';
import FarmerCrop from './farmer/FarmerCrop';
import FarmerMarket from './farmer/FarmerMarket';
import FarmerGrowth from './farmer/FarmerGrowth';
import FarmerSolutions from './farmer/FarmerSolutions';
import FarmerProfile from './farmer/FarmerProfile';

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const handler = (e) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    setIsDesktop(mq.matches);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isDesktop;
}

export default function FarmerApp({ user, onLogout }) {
  const [page, setPage] = useState('home');
  const isDesktop = useIsDesktop();

  const pages = {
    home: <FarmerHome user={user} onNav={setPage} />,
    map: <FarmerMap />,
    crop: <FarmerCrop />,
    market: <FarmerMarket />,
    growth: <FarmerGrowth user={user} />,
    solutions: <FarmerSolutions onNav={setPage} />,
    profile: <FarmerProfile user={user} onLogout={onLogout} onNav={setPage} />,
  };

  const navItems = [
    { id: 'home', icon: '🏠', label: 'Home' },
    { id: 'map', icon: '🛰', label: 'Satellite' },
    null, // center button → Crop AI
    { id: 'market', icon: '🛒', label: 'Market' },
    { id: 'solutions', icon: '🆘', label: 'Solutions' },
  ];

  // Desktop sidebar also shows growth and profile
  const desktopExtras = [
    { id: 'growth', icon: '📊', label: 'Growth' },
    { id: 'profile', icon: '👤', label: 'Profile' },
  ];

  return (
    <div className="app-shell">
      <Ticker />
      {/* TOPBAR */}
      <div className="topbar">
        <div className="tb-row">
          <div className="tb-brand">
            <div className="tb-icon">🌾</div>
            <div>
              <div className="tb-name">Namma Raitha</div>
              <div className="tb-loc">📍 {user.district || 'Karnataka'} · Farmer</div>
            </div>
          </div>
          <div className="tb-actions">
            {!isDesktop && <button className="tb-btn" onClick={() => setPage('profile')}>👤</button>}
            <button className="tb-btn" title="Notifications">🔔</button>
            {isDesktop && (
              <div style={{ background: 'rgba(255,255,255,.15)', padding: '5px 12px', borderRadius: '10px', fontSize: '.75rem', color: '#fff', fontWeight: 600 }}>
                👨‍🌾 {user.name}
              </div>
            )}
          </div>
        </div>
        {/* Weather widget — hide on desktop to save space */}
        {!isDesktop && (
          <div className="wx">
            <div className="wx-main">
              <span style={{ fontSize: '1.5rem' }}>⛅</span>
              <div><div className="wx-temp">28°C</div><div className="wx-desc">Partly Cloudy · ಭಾಗಶಃ ಮೋಡ</div></div>
            </div>
            <div className="wx-stats">
              <div className="ws"><div className="ws-v">74%</div><div className="ws-l">Humidity</div></div>
              <div className="ws"><div className="ws-v">12km</div><div className="ws-l">Wind</div></div>
              <div className="ws"><div className="ws-v">6mm</div><div className="ws-l">Rain</div></div>
            </div>
          </div>
        )}
      </div>

      {/* CURRENT PAGE */}
      <div key={page} className="page">
        {pages[page] || pages.home}
      </div>

      {/* NAVIGATION — bottom on mobile, sidebar on desktop */}
      <div className="bnav">
        {navItems.map((item, i) =>
          item === null ? (
            <div key="center" className="ni-cen" onClick={() => setPage('crop')}>
              <div className="ni-cen-btn">🌾</div>
              <span className="ni-cen-label">Crop AI</span>
            </div>
          ) : (
            <div key={item.id} className={`ni ${page === item.id ? 'act' : ''}`} onClick={() => setPage(item.id)}>
              <span className="ni-icon">{item.icon}</span>
              <span className="ni-label" style={page === item.id ? { color: 'var(--blue)' } : {}}>{item.label}</span>
            </div>
          )
        )}
        {/* Extra nav items visible only in desktop sidebar */}
        {isDesktop && desktopExtras.map(item => (
          <div key={item.id} className={`ni ${page === item.id ? 'act' : ''}`} onClick={() => setPage(item.id)}>
            <span className="ni-icon">{item.icon}</span>
            <span className="ni-label" style={page === item.id ? { color: 'var(--blue)' } : {}}>{item.label}</span>
          </div>
        ))}
        {isDesktop && (
          <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', padding: '16px 20px' }}>
            <div style={{ fontSize: '.74rem', color: 'var(--light)', marginBottom: '4px' }}>{user.badge || 'Silver Farmer'}</div>
            <div style={{ fontSize: '.8rem', fontWeight: 700, color: 'var(--text)' }}>{user.name}</div>
            <div style={{ fontSize: '.68rem', color: 'var(--light)' }}>{user.district}</div>
            <button onClick={onLogout} style={{ marginTop: '10px', width: '100%', padding: '7px', background: '#FFEBEE', border: 'none', borderRadius: '8px', color: 'var(--red)', fontSize: '.76rem', fontWeight: 600, cursor: 'pointer' }}>🚪 Logout</button>
          </div>
        )}
      </div>
    </div>
  );
}
