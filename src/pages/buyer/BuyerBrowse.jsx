import React, { useState } from 'react';
import { browseItems } from '../../data/appData';

export default function BuyerBrowse() {
  const [activeFilter, setActiveFilter] = useState('All');
  const filters = ['All', '🌾 Cereals', '🫘 Pulses', '🥜 Oil Seeds', '🍎 Fruits', '☕ Plantation', '🥦 Vegetables'];

  return (
    <>
      <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px' }}>🔍 Browse Crops · ಬೆಳೆ ಹುಡುಕಿ</div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '11px' }}>
        <input className="inp" style={{ flex: 1, marginBottom: 0 }} placeholder="🔍 Search crop, district..." />
        <button className="btn-sm btn-sm-blue">Filter</button>
      </div>
      <div className="filter-row">
        {filters.map(f => (
          <div key={f} className={`fchip ${activeFilter === f ? 'active' : ''}`} onClick={() => setActiveFilter(f)}>{f}</div>
        ))}
      </div>
      {browseItems.map((item, i) => (
        <div className="browse-card" key={i}>
          <span className="bc-icon">{item.icon}</span>
          <div className="bc-info">
            <div className="bc-name">{item.name}</div>
            <div className="bc-farmer">{item.farmer}</div>
            <div className="bc-location">{item.loc}</div>
          </div>
          <div className="bc-right">
            <div className="bc-price">{item.price}</div>
            <div className="bc-qty">{item.qty}</div>
            <button className="btn-sm btn-sm-green" style={{ marginTop: '5px' }}>Bid Now</button>
          </div>
        </div>
      ))}
    </>
  );
}
