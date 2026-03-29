import React, { useState, useEffect } from 'react';
import { districts, modeColors, modeLegends, modeKey } from '../../data/appData';

export default function FarmerMap() {
  const [mode, setMode] = useState('water');
  const [selected, setSelected] = useState(null);

  const selectDistrict = (i) => {
    setSelected(i);
    setTimeout(() => {
      document.getElementById('borewell-result')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const d = selected !== null ? districts[selected] : null;
  const lvl = d ? d.bw : 0;
  const lvlWords = ['', 'Very Low', 'Low', 'Moderate', 'Good', 'Excellent'];
  const successPct = [0, 15, 35, 55, 72, 90];
  const lvlColor = lvl >= 4 ? '#2E7D32' : lvl === 3 ? '#F9A825' : '#C62828';
  const zoneLabels = { 5: 'Excellent Zone ✓', 4: 'Good Zone ✓', 3: 'Moderate Zone', 2: 'Poor Zone', 1: 'Very Poor Zone ✗' };
  const pillClass = lvl >= 4 ? 'pg' : lvl === 3 ? 'pgld' : 'pr';

  return (
    <>
      <div className="sat-map-wrap">
        <div className="sat-title">🛰 Satellite Water Intelligence Map</div>
        <div className="sat-sub">All 31 Karnataka Districts · Tap district for Borewell AI</div>
        <div className="sat-controls">
          {[['water', '💧 Water Level'], ['borewell', '🔵 Borewell Zone'], ['soil', '🟤 Soil Moisture'], ['crop', '🌾 Crop Yield']].map(([m, label]) => (
            <button key={m} className={`sat-ctrl ${mode === m ? 'active' : ''}`} onClick={() => setMode(m)}>{label}</button>
          ))}
        </div>
        <div className="dist-grid">
          {districts.map((dist, i) => {
            const lvlVal = dist[modeKey[mode]];
            const color = modeColors[mode][lvlVal];
            return (
              <div key={i} className={`dc ${selected === i ? 'sel' : ''}`}
                style={{ background: color }}
                onClick={() => selectDistrict(i)}>
                <div className="dc-tooltip">{dist.name}</div>
              </div>
            );
          })}
        </div>
        <div className="map-legend">
          {modeLegends[mode].map((item, i) => (
            <div className="leg" key={i}>
              <div className="leg-sq" style={{ background: item.c }} />
              {item.l}
            </div>
          ))}
        </div>
      </div>

      {/* District Detail */}
      <div className="dist-detail">
        <div className="dd-header">
          <div className="dd-name">{d ? `📍 ${d.name} — ${d.kn}` : '📍 Tap any district above'}</div>
          <div className="dd-sub">{d ? `${d.type} Soil · ${d.rain} Annual Rainfall` : 'Select a district to see water & borewell data'}</div>
        </div>
        <div className="dd-body">
          <div className="dd-grid">
            {d ? (
              <>
                <div className="dd-stat"><div className="dd-val" style={{ color: lvlColor }}>{lvlWords[d.wl]}</div><div className="dd-label">Ground Water Level</div></div>
                <div className="dd-stat"><div className="dd-val" style={{ color: lvlColor }}>{successPct[d.bw]}%</div><div className="dd-label">Borewell Success %</div></div>
                <div className="dd-stat"><div className="dd-val">{d.type}</div><div className="dd-label">Soil Type</div></div>
                <div className="dd-stat"><div className="dd-val">{d.rain}</div><div className="dd-label">Annual Rainfall</div></div>
                <div className="dd-stat"><div className="dd-val" style={{ color: '#1565C0' }}>{d.depth}</div><div className="dd-label">Recommended Depth</div></div>
                <div className="dd-stat"><div className="dd-val" style={{ color: '#2E7D32' }}>{d.yield}</div><div className="dd-label">Expected Water Yield</div></div>
              </>
            ) : (
              [1, 2, 3, 4, 5, 6].map(i => (
                <div className="dd-stat" key={i}><div className="dd-val" style={{ color: 'var(--light)' }}>—</div><div className="dd-label">—</div></div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Borewell AI Result */}
      {d && (
        <div id="borewell-result" className="bw-result">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
            <div className="bw-dial" style={{ background: 'radial-gradient(#4A148C,#6A1B9A)', color: '#fff', border: '3px solid #CE93D8' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{successPct[lvl]}%</div>
              <div style={{ fontSize: '.56rem', opacity: .8 }}>SUCCESS</div>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '.95rem', color: '#CE93D8' }}>🔵 Borewell Recommendation</div>
              <div style={{ fontSize: '.72rem', color: 'rgba(255,255,255,.65)' }}>ಕೊಳವೆ ಬಾವಿ ಶಿಫಾರಸ್ಸು</div>
              <div style={{ marginTop: '7px' }}><span className={`pill ${pillClass}`}>{zoneLabels[lvl]}</span></div>
            </div>
          </div>
          <div className="bw-detail-grid">
            <div className="bw-detail"><div className="bw-d-val">{d.depth}</div><div className="bw-d-label">Recommended Drill Depth</div></div>
            <div className="bw-detail"><div className="bw-d-val">{d.yield}</div><div className="bw-d-label">Expected Water Yield</div></div>
            <div className="bw-detail"><div className="bw-d-val">{d.season}</div><div className="bw-d-label">Water Availability</div></div>
            <div className="bw-detail"><div className="bw-d-val">{d.type}</div><div className="bw-d-label">Soil Formation</div></div>
          </div>
          <div style={{ background: 'rgba(255,255,255,.08)', borderRadius: '9px', padding: '11px', marginTop: '10px', border: '1px solid rgba(255,255,255,.12)' }}>
            <div style={{ fontSize: '.78rem', color: '#CE93D8', fontWeight: 700, marginBottom: '5px' }}>📋 Borewell Drilling Guide</div>
            <div style={{ fontSize: '.72rem', color: 'rgba(255,255,255,.72)', lineHeight: 1.6 }}>{d.guide}</div>
          </div>
        </div>
      )}
    </>
  );
}
