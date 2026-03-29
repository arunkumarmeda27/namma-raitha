import React from 'react';
import { browseItems } from '../../data/appData';

const months = ['J','F','M','A','M','J','J','A','S','O','N','D'];
const buyerVals = [3.2,2.8,4.1,5.0,4.5,5.8,6.2,7.1,5.9,6.8,7.5,8.2];

function BuyerBarChart({ vals }) {
  const max = Math.max(...vals);
  return (
    <div className="bar-chart">
      {vals.map((v, i) => (
        <div className="bc" key={i}>
          <span className="bv">{v}</span>
          <div className="bf" style={{ height: `${(v/max)*100}%` }} />
          <span className="bl">{months[i]}</span>
        </div>
      ))}
    </div>
  );
}

export default function BuyerHome({ user, onNav }) {
  return (
    <>
      <div className="buyer-hero">
        <div className="bh-row">
          <div>
            <div className="bh-name">Welcome, {user.name} 🏪</div>
            <div className="bh-sub">{user.district || 'Karnataka'} · Verified Buyer</div>
          </div>
          <div className="bh-badge">⭐ {user.badge || 'Verified Buyer'}</div>
        </div>
        <div className="bh-stats">
          <div><div className="bhs-val">₹48L</div><div className="bhs-sub">Total Purchased</div></div>
          <div><div className="bhs-val">142</div><div className="bhs-sub">Orders Done</div></div>
          <div><div className="bhs-val">4.9★</div><div className="bhs-sub">Farmer Rating</div></div>
        </div>
      </div>

      <div className="sec-head">
        <span className="sec-title">🔥 Fresh Harvest Available Now</span>
        <button className="sec-link" onClick={() => onNav('browse')}>Browse All</button>
      </div>
      {browseItems.slice(0, 3).map((item, i) => (
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
            <div className="bc-freshness"><div className="fresh-dot" /><span className="fresh-label">{item.fresh}</span></div>
          </div>
        </div>
      ))}

      <div className="sec-head" style={{ marginTop: '4px' }}>
        <span className="sec-title">📦 Active Orders · ಸಕ್ರಿಯ ಆದೇಶಗಳು</span>
        <button className="sec-link" onClick={() => onNav('orders')}>All Orders</button>
      </div>
      <div className="order-track">
        <div className="ot-header">
          <div className="ot-id">Order #NR-8821 · Ragi 30 qt</div>
          <span className="ot-status st-transit">In Transit</span>
        </div>
        <div className="track-steps">
          {['Order\nPlaced','Farmer\nPacked','In\nTransit','Arriving\nToday','Delivery\nDone'].map((label, i) => (
            <div className="ts" key={i}>
              <div className={`ts-dot ${i < 3 ? 'done' : ''}`}>{i < 3 ? '✓' : i === 3 ? '📍' : '✅'}</div>
              <div className="ts-label">{label.replace('\n', '\n')}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: '11px', fontSize: '.72rem', color: 'var(--mid)' }}>🚛 KA-22-AB-1234 · Arriving by 4:00 PM · Raju Patil, Dharwad</div>
      </div>

      <div className="sec-head"><span className="sec-title">📊 Procurement Analytics</span></div>
      <div className="card">
        <div style={{ fontSize: '.84rem', fontWeight: 700, marginBottom: '12px' }}>Monthly Spend (₹ Lakhs)</div>
        <BuyerBarChart vals={buyerVals} />
      </div>
    </>
  );
}
