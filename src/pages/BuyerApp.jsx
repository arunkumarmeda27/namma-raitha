import React, { useState, useEffect } from 'react';
import Ticker from '../components/Ticker';
import BuyerHome from './buyer/BuyerHome';
import BuyerBrowse from './buyer/BuyerBrowse';
import BuyerOrders from './buyer/BuyerOrders';
import BuyerProfile from './buyer/BuyerProfile';

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

export default function BuyerApp({ user, onLogout }) {
  const [page, setPage] = useState('home');
  const isDesktop = useIsDesktop();

  const pages = {
    home: <BuyerHome user={user} onNav={setPage} />,
    browse: <BuyerBrowse />,
    orders: <BuyerOrders />,
    profile: <BuyerProfile user={user} onLogout={onLogout} />,
  };

  const navItems = [
    { id: 'home', icon: '🏠', label: 'Home' },
    { id: 'browse', icon: '🔍', label: 'Browse' },
    null,
    { id: 'orders', icon: '📦', label: 'Orders' },
    { id: 'profile', icon: '👤', label: 'Profile' },
  ];

  return (
    <div className="app-shell">
      <Ticker />
      <div className="topbar buyer-top">
        <div className="tb-row">
          <div className="tb-brand">
            <div className="tb-icon" style={{ background: 'var(--blue-bg)' }}>🏪</div>
            <div>
              <div className="tb-name">Namma Raitha — Buyer</div>
              <div className="tb-loc">📍 {user.district || 'Karnataka'}</div>
            </div>
          </div>
          <div className="tb-actions">
            {!isDesktop && <button className="tb-btn" onClick={() => setPage('profile')}>👤</button>}
            <button className="tb-btn" title="Notifications">🔔</button>
            {isDesktop && (
              <div style={{ background: 'rgba(255,255,255,.15)', padding: '5px 12px', borderRadius: '10px', fontSize: '.75rem', color: '#fff', fontWeight: 600 }}>
                🏪 {user.name}
              </div>
            )}
          </div>
        </div>
        {!isDesktop && (
          <div className="wx">
            <div className="wx-main">
              <span style={{ fontSize: '1.3rem' }}>🏪</span>
              <div>
                <div style={{ fontSize: '.9rem', fontWeight: 700 }}>{user.name}</div>
                <div className="wx-desc">{user.digilockerData?.business || 'Verified Buyer'}</div>
              </div>
            </div>
            <div className="wx-stats">
              <div className="ws"><div className="ws-v">24</div><div className="ws-l">Farmers</div></div>
              <div className="ws"><div className="ws-v">12</div><div className="ws-l">Lots</div></div>
              <div className="ws"><div className="ws-v">3</div><div className="ws-l">Orders</div></div>
            </div>
          </div>
        )}
      </div>

      <div key={page} className="page">
        {pages[page] || pages.home}
      </div>

      <div className="bnav buyer-nav">
        {navItems.map((item, i) =>
          item === null ? (
            <div key="center" className="ni-cen" onClick={() => setPage('browse')}>
              <div className="ni-cen-btn">🛒</div>
              <span className="ni-cen-label">Buy Now</span>
            </div>
          ) : (
            <div key={item.id} className={`ni ${page === item.id ? 'act' : ''}`} onClick={() => setPage(item.id)}>
              <span className="ni-icon">{item.icon}</span>
              <span className="ni-label" style={page === item.id ? { color: 'var(--blue-d)' } : {}}>{item.label}</span>
            </div>
          )
        )}
        {isDesktop && (
          <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', padding: '16px 20px' }}>
            <div style={{ fontSize: '.74rem', color: 'var(--light)', marginBottom: '4px' }}>{user.badge || 'Verified Buyer'}</div>
            <div style={{ fontSize: '.8rem', fontWeight: 700, color: 'var(--text)' }}>{user.name}</div>
            <div style={{ fontSize: '.68rem', color: 'var(--light)' }}>{user.digilockerData?.business || user.district}</div>
            <button onClick={onLogout} style={{ marginTop: '10px', width: '100%', padding: '7px', background: '#FFEBEE', border: 'none', borderRadius: '8px', color: 'var(--red)', fontSize: '.76rem', fontWeight: 600, cursor: 'pointer' }}>🚪 Logout</button>
          </div>
        )}
      </div>
    </div>
  );
}
