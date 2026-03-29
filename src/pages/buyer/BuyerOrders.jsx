import React from 'react';

const orders = [
  { id: 'NR-8821', desc: 'Ragi 30 qt · ₹1.17L', status: 'In Transit', statusClass: 'st-transit', steps: [true, true, true, false, false], note: '🚛 KA-22-AB-1234 · ETA: 4:00 PM today', noteColor: 'var(--mid)' },
  { id: 'NR-8756', desc: 'Coffee 20 qt · ₹2.52L', status: 'Delivered', statusClass: 'st-delivered', steps: [true, true, true, true, true], note: '✅ Delivered on 28 Feb · Payment released to farmer', noteColor: 'var(--green)' },
  { id: 'NR-8699', desc: 'Chilli 15 qt · ₹1.23L', status: 'Pending Dispatch', statusClass: 'st-pending', steps: [true, true, false, false, false], note: '⏳ Dispatch scheduled: 5 March 2025', noteColor: 'var(--mid)' },
];

const stepLabels = ['Placed','Packed','Transit','Arriving','Delivered'];
const stepIcons = ['✓','✓','🚛','📍','✅'];

export default function BuyerOrders() {
  return (
    <>
      <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px' }}>📋 My Orders · ನನ್ನ ಆದೇಶಗಳು</div>
      {orders.map((order) => (
        <div className="order-track" key={order.id}>
          <div className="ot-header">
            <div className="ot-id">Order #{order.id} · {order.desc}</div>
            <span className={`ot-status ${order.statusClass}`}>{order.status}</span>
          </div>
          <div className="track-steps">
            {order.steps.map((done, i) => (
              <div className="ts" key={i}>
                <div className={`ts-dot ${done ? 'done' : ''}`}>{done ? (i < 2 ? '✓' : stepIcons[i]) : stepIcons[i]}</div>
                <div className="ts-label">{stepLabels[i]}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '10px', fontSize: '.7rem', color: order.noteColor, fontWeight: order.noteColor === 'var(--green)' ? 600 : 400 }}>{order.note}</div>
        </div>
      ))}
      <div className="pay-steps">
        <div style={{ fontWeight: 700, marginBottom: '13px', color: 'var(--blue)' }}>🔐 Buyer Payment Protection</div>
        <div className="alert info" style={{ marginBottom: '9px' }}>
          <span className="al-icon">🛡</span>
          <div><div className="al-title">Escrow Payment System</div><div className="al-desc">Your payment is held safely until delivery is confirmed. 100% money-back if quality doesn't match.</div></div>
        </div>
        <div className="alert good">
          <span className="al-icon">⚡</span>
          <div><div className="al-title">Quality Guarantee</div><div className="al-desc">All farmers are KYC verified. Crop quality checked before dispatch. Dispute resolution within 24hrs.</div></div>
        </div>
      </div>
    </>
  );
}
