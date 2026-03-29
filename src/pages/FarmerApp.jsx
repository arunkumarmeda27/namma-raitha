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

import { LanguageProvider, useLanguage } from '../contexts/LanguageContext';

export default function FarmerApp({ user, onLogout }) {
  const [activeLang, setActiveLang] = useState('en');
  return (
    <LanguageProvider currentLang={activeLang} setLang={setActiveLang}>
      <FarmerAppInner user={user} onLogout={onLogout} activeLang={activeLang} setActiveLang={setActiveLang} />
    </LanguageProvider>
  );
}

function FarmerAppInner({ user, onLogout, activeLang, setActiveLang }) {
  const [page, setPage] = useState('home');
  const isDesktop = useIsDesktop();

  const { t } = useLanguage();

  const pages = {
    home: <FarmerHome user={user} onNav={setPage} />,
    map: <FarmerMap />,
    crop: <FarmerCrop />,
    market: <FarmerMarket />,
    growth: <FarmerGrowth user={user} />,
    solutions: <FarmerSolutions onNav={setPage} />,
    profile: <FarmerProfile user={user} onLogout={onLogout} onNav={setPage} activeLang={activeLang} />,
    language: (
      <div className="card" style={{ margin: '20px', padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '20px', background: 'var(--blue-d)', color: '#fff' }}>
          <h3 style={{ margin: '0' }}>🌐 {t('language_select')}</h3>
        </div>
        <div style={{ padding: '20px' }}>
          {['en', 'kn', 'hi', 'te', 'mr'].map(key => {
            const isSelected = activeLang === key;
            const nativeName = t(key === 'en' ? 'English' : key === 'kn' ? 'Kannada' : key === 'hi' ? 'Hindi' : key === 'te' ? 'Telugu' : 'Marathi');
            return (
              <div key={key} onClick={() => setActiveLang(key)} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', margin: '8px 0', borderRadius: '12px',
                border: isSelected ? '2px solid var(--blue)' : '1px solid var(--border)', background: isSelected ? 'var(--blue-bg)' : 'var(--bg)', cursor: 'pointer', transition: 'all 0.2s ease'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: isSelected ? '7px solid var(--blue)' : '2px solid var(--border)', background: '#fff' }} />
                  <div style={{ fontWeight: '700', fontSize: '1.05rem', color: isSelected ? 'var(--blue-d)' : 'var(--text)' }}>{nativeName}</div>
                </div>
                {isSelected && <span style={{ color: 'var(--blue)', fontWeight: 'bold' }}>✓</span>}
              </div>
            );
          })}
          <button className="auth-submit-btn" style={{ marginTop: '20px', background: 'var(--blue)' }} onClick={() => setPage('profile')}>Save Selection & Go Back</button>
        </div>
      </div>
    ),
    bank: (
      <div className="card" style={{ margin: '20px' }}>
        <h3 style={{ marginBottom: '15px' }}>🏦 {t('bank')}</h3>
        <button className="auth-submit-btn" style={{ marginTop: '20px' }} onClick={() => setPage('profile')}>Back to Profile</button>
      </div>
    ),
    land: (
      <div className="card" style={{ margin: '20px' }}>
        <h3 style={{ marginBottom: '15px' }}>📋 {t('records')}</h3>
        <button className="auth-submit-btn" style={{ marginTop: '20px' }} onClick={() => setPage('profile')}>Back to Profile</button>
      </div>
    ),
    transactions: (
      <div className="card" style={{ margin: '20px', textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: '3rem', marginBottom: '15px' }}>💸</div>
        <h3>{t('deals')}</h3>
        <button className="auth-submit-btn" style={{ marginTop: '20px' }} onClick={() => setPage('profile')}>Back to Profile</button>
      </div>
    ),
    support: (
      <div className="card" style={{ margin: '20px', textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🆘</div>
        <h3>{t('support')}</h3>
        <button className="auth-submit-btn" style={{ marginTop: '20px' }} onClick={() => setPage('profile')}>Back to Profile</button>
      </div>
    ),
  };

  const navItems = [
    { id: 'home', icon: '🏠', label: 'home' },
    { id: 'map', icon: '🛰', label: 'satellite' },
    null,
    { id: 'market', icon: '🛒', label: 'market' },
    { id: 'solutions', icon: '🆘', label: 'support' },
  ];

  const desktopExtras = [
    { id: 'growth', icon: '📊', label: 'dashboard' },
    { id: 'profile', icon: '👤', label: 'profile' },
  ];

  return (
    <div className="app-shell">
      <Ticker />
      <div className="topbar">
        <div className="tb-row">
          <div className="tb-brand">
            <div className="tb-icon">🌾</div>
            <div>
              <div className="tb-name">Namma Raitha — {t('farmer')}</div>
              <div className="tb-loc">📍 {user.district || 'Karnataka'}</div>
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
              <span className="ni-cen-label">{t('crop_ai')}</span>
            </div>
          ) : (
            <div key={item.id} className={`ni ${page === item.id ? 'act' : ''}`} onClick={() => setPage(item.id)}>
              <span className="ni-icon">{item.icon}</span>
              <span className="ni-label" style={page === item.id ? { color: 'var(--blue)' } : {}}>{t(item.label)}</span>
            </div>
          )
        )}
        {isDesktop && desktopExtras.map(item => (
          <div key={item.id} className={`ni ${page === item.id ? 'act' : ''}`} onClick={() => setPage(item.id)}>
            <span className="ni-icon">{item.icon}</span>
            <span className="ni-label" style={page === item.id ? { color: 'var(--blue)' } : {}}>{t(item.label)}</span>
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
