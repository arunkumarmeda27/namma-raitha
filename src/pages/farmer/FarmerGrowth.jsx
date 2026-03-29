import React, { useEffect, useRef } from 'react';

const months = ['J','F','M','A','M','J','J','A','S','O','N','D'];
const incomeVals = [22,18,25,30,28,35,42,48,38,44,52,55];

function BarChart({ vals, isGold }) {
  const max = Math.max(...vals);
  return (
    <div className="bar-chart">
      {vals.map((v, i) => {
        const h = (v / max) * 100;
        const gold = isGold && i === vals.length - 1;
        return (
          <div className="bc" key={i}>
            <span className="bv">{v}k</span>
            <div className={`bf ${gold ? 'gld' : ''}`} style={{ height: `${h}%` }} />
            <span className="bl">{months[i]}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function FarmerGrowth({ user }) {
  return (
    <>
      <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px' }}>📊 Growth Dashboard · ರೈತ ಬೆಳವಣಿಗೆ</div>
      <div className="hero-card blue">
        <div style={{ display: 'flex', alignItems: 'center', gap: '11px', marginBottom: '13px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>👨‍🌾</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '.98rem' }}>{user.name}</div>
            <div style={{ fontSize: '.7rem', opacity: .75 }}>{user.district} · {user.id}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.7rem', fontWeight: 800 }}>82%</div>
            <div style={{ fontSize: '.6rem', opacity: .72 }}>Growth Score</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {['🥈 ' + (user.badge || 'Silver Farmer'), '⭐ 48 Deals', '✅ KYC', '4.8★'].map(b => (
            <span key={b} style={{ background: 'rgba(255,255,255,.12)', padding: '5px 10px', borderRadius: '8px', fontSize: '.7rem', fontWeight: 600 }}>{b}</span>
          ))}
        </div>
      </div>
      <div className="card">
        <div style={{ fontSize: '.86rem', fontWeight: 700, marginBottom: '12px' }}>Monthly Income · ಮಾಸಿಕ ಆದಾಯ (₹'000)</div>
        <BarChart vals={incomeVals} isGold={true} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '13px' }}>
        {[
          { val: '₹1.84L', label: 'This Season · ಈ ಋತು', trend: '▲ +24% vs last', c: 'var(--blue)' },
          { val: '₹6.2L', label: 'Lifetime · ಒಟ್ಟು', trend: '▲ Steady growth', c: 'var(--gold)' },
          { val: '48', label: 'Deals Done · ಒಪ್ಪಂದ', trend: '▲ 12 this year', c: 'var(--green)' },
          { val: '4.8★', label: 'Buyer Rating', trend: 'Top 5% farmers', c: 'var(--text)' },
        ].map(s => (
          <div className="card" key={s.val} style={{ marginBottom: 0 }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: s.c }}>{s.val}</div>
            <div style={{ fontSize: '.66rem', color: 'var(--light)' }}>{s.label}</div>
            <div style={{ fontSize: '.68rem', color: 'var(--green)', fontWeight: 600, marginTop: '3px' }}>{s.trend}</div>
          </div>
        ))}
      </div>
      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: '13px' }}>🏆 Achievement Badges · ಸಾಧನೆ</div>
        <div style={{ display: 'flex', gap: '9px' }}>
          {[
            { icon: '🥉', label: 'Silver', sub: 'Achieved ✓', bg: 'var(--green-bg)', border: 'var(--green-mid)', c: 'var(--green)', active: 0 },
            { icon: '🥈', label: 'Gold', sub: 'Current ●', bg: 'var(--blue-bg)', border: 'var(--blue)', c: 'var(--blue)', active: 2 },
            { icon: '🥇', label: 'Elite', sub: '100 deals', bg: 'var(--bg)', border: 'var(--border)', c: 'var(--mid)', active: 0 },
          ].map(b => (
            <div key={b.label} style={{ flex: 1, background: b.bg, border: `${b.active === 2 ? 2 : 1.5}px ${b.active === 0 && b.label === 'Elite' ? 'dashed' : 'solid'} ${b.border}`, borderRadius: '10px', padding: '12px', textAlign: 'center', opacity: b.label === 'Elite' ? .5 : 1 }}>
              <div style={{ fontSize: '1.4rem' }}>{b.icon}</div>
              <div style={{ fontSize: '.7rem', fontWeight: 700, color: b.c, marginTop: '3px' }}>{b.label}</div>
              <div style={{ fontSize: '.58rem', color: b.active === 2 ? b.c : 'var(--light)' }}>{b.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
