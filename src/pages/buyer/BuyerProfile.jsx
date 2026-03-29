import React from 'react';

export default function BuyerProfile({ user, onLogout, onNav }) {
  return (
    <>
      <div className="prof-header" style={{ background: 'linear-gradient(135deg,var(--blue-d),#0D47A1)' }}>
        <div className="pf-av">🏪</div>
        <div className="pf-name">{user.name}</div>
        <div className="pf-sub">{user.district || 'Karnataka'} · ⭐ {user.badge || 'Verified Buyer'}</div>
        <div className="pf-id">{user.id}</div>
        <div style={{ marginTop: '11px', display: 'flex', gap: '7px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <span className="pill" style={{ background: 'rgba(255,255,255,.18)', color: '#fff' }}>✅ DigiLocker Verified</span>
          <span className="pill" style={{ background: 'rgba(249,168,37,.25)', color: 'var(--gold-l)' }}>⭐ 4.9 Rating</span>
          <span className="pill" style={{ background: 'rgba(255,255,255,.12)', color: '#fff' }}>142 Orders</span>
        </div>
      </div>

      {/* DigiLocker Business Info */}
      {user.digilockerData?.gstn && (
        <div className="card" style={{ borderLeft: '4px solid var(--blue)' }}>
          <div style={{ fontWeight: 700, fontSize: '.86rem', marginBottom: '10px' }}>🔵 DigiLocker Verified Business Details</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {[
              { label: 'Business Name', val: user.digilockerData.business },
              { label: 'City', val: user.digilockerData.city },
              { label: 'GST Number', val: user.digilockerData.gstn },
              { label: 'Aadhaar', val: user.digilockerData.aadhaarMasked },
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
        { icon: '🏦', label: 'Payment Account', sub: 'HDFC ××××8821 — GST Linked', right: '›', onClick: () => onNav && onNav('bank') },
        { icon: '📦', label: 'My Orders · ನನ್ನ ಆದೇಶ', sub: '142 total · 3 active', right: '›', onClick: () => onNav && onNav('orders') },
        { icon: '💬', label: 'Message Farmers · ರೈತರೊಂದಿಗೆ ಮಾತನಾಡಿ', sub: 'Direct connect to sellers', right: '›', onClick: () => onNav && onNav('messages') },
        { icon: '📊', label: 'Procurement Reports', sub: 'Monthly analytics & invoices', right: '›', onClick: () => onNav && onNav('reports') },
        { icon: '🆘', label: 'Help & Support', sub: '1800-180-1551', right: '›', onClick: () => onNav && onNav('support') },
      ].map((item, i) => (
        <div className="pm-item" key={i} onClick={item.onClick}>
          <span className="pm-icon">{item.icon}</span>
          <div style={{ flex: 1 }}>
            <div className="pm-label">{item.label}</div>
            <div className="pm-kn">{item.sub}</div>
          </div>
          <span className="pm-arrow">{item.right}</span>
        </div>
      ))}

      <div className="pm-item" style={{ background: '#FFEBEE', border: '1.5px solid #FFCDD2' }} onClick={onLogout}>
        <span className="pm-icon">🚪</span>
        <div style={{ flex: 1 }}>
          <div className="pm-label" style={{ color: 'var(--red)' }}>Logout</div>
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
