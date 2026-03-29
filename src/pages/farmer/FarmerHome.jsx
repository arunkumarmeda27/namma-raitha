import React from 'react';
import { cropRates } from '../../data/appData';

export default function FarmerHome({ user, onNav }) {
  return (
    <>
      {/* Hero Card */}
      <div className="hero-card blue">
        <div className="hc-head">
          <div>
            <div className="hc-name">Good Morning · ನಮಸ್ಕಾರ</div>
            <div className="hc-main">{user.name} 👨‍🌾</div>
          </div>
          <div className="hc-badge badge-gold">🥈 {user.badge || 'Silver Farmer'}</div>
        </div>
        <div className="hc-stats">
          <div><div className="hs-val">82%</div><div className="hs-sub">Growth Score</div><div className="hs-inc">▲+5% month</div></div>
          <div><div className="hs-val">₹1.84L</div><div className="hs-sub">This Season</div><div className="hs-inc">▲+24% vs last</div></div>
          <div><div className="hs-val">Ragi</div><div className="hs-sub">Best Crop</div><div className="hs-inc">★ High Demand</div></div>
        </div>
      </div>

      {/* Live Rates */}
      <div className="sec-head">
        <span className="sec-title">📈 Live Rates · ಮಾರುಕಟ್ಟೆ ದರ</span>
        <button className="sec-link" onClick={() => onNav('market')}>View All</button>
      </div>
      <div className="rates-scroll">
        {cropRates.map((r, i) => (
          <div className="rc" key={i}>
            <span className="rc-icon">{r.icon}</span>
            <div className="rc-crop">{r.name}</div>
            <div className="rc-price">{r.price}</div>
            <div className={`rc-ch ${r.up ? 'up' : 'dn'}`}>{r.change}</div>
          </div>
        ))}
      </div>

      {/* AI Crop Advice */}
      <div className="sec-head" style={{ marginTop: '16px' }}>
        <span className="sec-title">🌱 AI Crop Advice · ಬೆಳೆ ಸಲಹೆ</span>
        <button className="sec-link" onClick={() => onNav('crop')}>Details</button>
      </div>
      <div className="card" style={{ borderLeft: '4px solid var(--green)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
          <span style={{ fontSize: '1.9rem' }}>🌾</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '.9rem' }}>Ragi is best this season</div>
            <div style={{ fontSize: '.68rem', color: 'var(--light)', fontFamily: "'Noto Sans Kannada',sans-serif" }}>ಈ ಋತುವಿನಲ್ಲಿ ರಾಗಿ ಅತ್ಯುತ್ತಮ</div>
            <div style={{ marginTop: '7px', display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
              <span className="pill pg">✓ Low Risk</span>
              <span className="pill pb">18 qt/acre</span>
              <span className="pill pgld">₹55,000 profit</span>
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--green)' }}>88%</div>
            <div style={{ fontSize: '.58rem', color: 'var(--light)' }}>AI Score</div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div className="sec-head"><span className="sec-title">⚠️ Alerts · ಎಚ್ಚರಿಕೆ</span></div>
      <div className="alert warn"><span className="al-icon">🐛</span><div><div className="al-title">Fall Armyworm in Maize — Haveri</div><div className="al-kn">ಮೆಕ್ಕೆಜೋಳದಲ್ಲಿ ಕೀಟ ಪತ್ತೆ</div><div className="al-desc">Use Chlorpyrifos 2ml/L. Act within 3 days.</div></div></div>
      <div className="alert good"><span className="al-icon">🌧</span><div><div className="al-title">Good rainfall forecast — next 7 days</div><div className="al-kn">ಉತ್ತಮ ಮಳೆ ನಿರೀಕ್ಷೆ</div><div className="al-desc">Ideal for Paddy sowing in Dharwad.</div></div></div>
      <div className="alert info"><span className="al-icon">💰</span><div><div className="al-title">New Buyer Offer: ₹3,900/qt for Ragi</div><div className="al-kn">ಹೊಸ ಖರೀದಿದಾರ ಕೊಡುಗೆ</div><div className="al-desc">Bengaluru buyer · 10 qt order. Tap to accept.</div></div></div>
      <div className="alert danger"><span className="al-icon">🌡</span><div><div className="al-title">Heat Wave Warning — Kalaburagi region</div><div className="al-kn">ಶಾಖದ ಅಲೆ ಎಚ್ಚರಿಕೆ</div><div className="al-desc">Protect crops with mulching. Irrigate early morning.</div></div></div>

      {/* Farmer Solutions */}
      <div className="sec-head" style={{ marginTop: '4px' }}>
        <span className="sec-title">🆘 Farmer Solutions · ರೈತ ಸಮಸ್ಯೆ ಪರಿಹಾರ</span>
        <button className="sec-link" onClick={() => onNav('solutions')}>All</button>
      </div>
      <div className="help-grid">
        {[['🌿', 'Pest Control', 'ಕೀಟ ನಿಯಂತ್ರಣ'], ['💧', 'Irrigation', 'ನೀರಾವರಿ'], ['🏛', 'Govt Schemes', 'ಸರ್ಕಾರಿ ಯೋಜನೆ'], ['💊', 'Pesticides', 'ಕೀಟನಾಶಕ']].map(([icon, title, kn]) => (
          <div className="hg-card" key={title} onClick={() => onNav('solutions')}>
            <span className="hg-icon">{icon}</span>
            <div className="hg-title">{title}</div>
            <div className="hg-kn">{kn}</div>
          </div>
        ))}
      </div>
    </>
  );
}
