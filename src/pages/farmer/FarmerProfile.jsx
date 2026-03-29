import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

export default function FarmerProfile({ user, onLogout, onNav, activeLang = 'en' }) {
  const { t } = useLanguage();
  const langDisplayMap = { en: 'English', kn: 'ಕನ್ನಡ', hi: 'हिंदी', te: 'తెలుగు', mr: 'मराठी' };
  const currentLangDisplay = langDisplayMap[activeLang] || 'English';

  return (
    <>
      <div className="prof-header">
        <div className="pf-av">👨‍🌾</div>
        <div className="pf-name">{user.name}</div>
        <div className="pf-sub">{user.district} · 🥈 {user.badge || 'Silver Farmer'}</div>
        <div className="pf-id">{user.id}</div>
        <div style={{ marginTop: '11px', display: 'flex', gap: '7px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <span className="pill" style={{ background: 'rgba(255,255,255,.18)', color: '#fff' }}>✅ Verified</span>
          <span className="pill" style={{ background: 'rgba(249,168,37,.25)', color: 'var(--gold-l)' }}>⭐ 4.8</span>
          <span className="pill" style={{ background: 'rgba(255,255,255,.12)', color: '#fff' }}>📍 {user.district}</span>
        </div>
      </div>

      {/* DigiLocker Info */}
      {user.digilockerData && user.digilockerData.land && (
        <div className="card" style={{ borderLeft: '4px solid var(--green)' }}>
          <div style={{ fontWeight: 700, fontSize: '.86rem', marginBottom: '10px' }}>🔵 {t('digilocker_verified')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {[
              { label: 'Aadhaar', val: user.digilockerData.aadhaarMasked },
              { label: 'Land Area', val: user.digilockerData.land },
              { label: 'Land Record ID', val: user.digilockerData.landOwnershipDoc },
              { label: 'District', val: user.digilockerData.district },
            ].map(i => (
              <div key={i.label} style={{ background: 'var(--bg)', borderRadius: '9px', padding: '10px' }}>
                <div style={{ fontSize: '.7rem', color: 'var(--light)' }}>{i.label}</div>
                <div style={{ fontSize: '.84rem', fontWeight: 700 }}>{i.val || '—'}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {[
        { icon: '🌐', label: t('language_select'), sub: null, right: <span style={{ background: 'var(--blue-bg)', color: 'var(--blue)', padding: '3px 9px', borderRadius: '6px', fontSize: '.72rem', fontWeight: 600 }}>{currentLangDisplay}</span>, onClick: () => onNav('language') },
        { icon: '🏦', label: t('bank'), sub: 'SBI ××××4821 — Linked', right: '›', onClick: () => onNav('bank') },
        { icon: '📋', label: t('records'), sub: `${user.digilockerData?.land || '2.5 acres'} · ${user.district}`, right: '›', onClick: () => onNav('land') },
        { icon: '📊', label: t('deals'), sub: '48 completed deals', right: '›', onClick: () => onNav('transactions') },
        { icon: '📈', label: t('dashboard'), sub: 'View your analytics', right: '›', onClick: () => onNav && onNav('growth') },
        { icon: '🆘', label: t('support'), sub: '1800-180-1551', right: '›', onClick: () => onNav('support') },
      ].map((item, i) => (
        <div className="pm-item" key={i} onClick={item.onClick}>
          <span className="pm-icon">{item.icon}</span>
          <div style={{ flex: 1 }}>
            <div className="pm-label">{item.label}</div>
            {item.sub && <div className="pm-kn">{item.sub}</div>}
          </div>
          <span className="pm-arrow">{item.right}</span>
        </div>
      ))}

      <div className="pm-item" style={{ background: '#FFEBEE', border: '1.5px solid #FFCDD2' }} onClick={onLogout}>
        <span className="pm-icon">🚪</span>
        <div style={{ flex: 1 }}>
          <div className="pm-label" style={{ color: 'var(--red)' }}>{t('logout')}</div>
          <div className="pm-kn">Sign out from Namma Raitha</div>
        </div>
        <span className="pm-arrow" style={{ color: 'var(--red)' }}>›</span>
      </div>

      <div style={{ textAlign: 'center', padding: '14px 0', fontSize: '.7rem', color: 'var(--light)' }}>
        Namma Raitha v2.0 · Karnataka Agriculture Platform
      </div>
    </>
  );
}
