import React, { useState } from 'react';
import { marketItems, cropRates } from '../../data/appData';
import { apiUrl } from '../../lib/api';

function AIBadge({ fromAI }) {
  return <span className={`ai-badge ${fromAI ? '' : 'mock'}`} style={{ fontSize: '.65rem' }}>🤖 {fromAI ? 'Gemini AI' : 'Smart AI'}</span>;
}

function PriceChart({ history }) {
  if (!history || history.length === 0) return null;
  const max = Math.max(...history.map(h => h.price));
  const min = Math.min(...history.map(h => h.price));
  return (
    <div>
      <div className="price-chart">
        {history.map((h, i) => (
          <div key={i} className="pc-bar" style={{ height: `${((h.price - min) / (max - min)) * 90 + 10}%` }} title={`${h.month}: ₹${h.price}`} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.58rem', color: 'var(--light)' }}>
        {history.filter((_, i) => i % Math.ceil(history.length / 6) === 0).map(h => <span key={h.month}>{h.month}</span>)}
      </div>
    </div>
  );
}

export default function FarmerMarket() {
  const [tab, setTab] = useState('Buy');
  const [aiInsight, setAiInsight] = useState(null);
  const [loadingInsight, setLoadingInsight] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showPostForm, setShowPostForm] = useState(false);
  const [postForm, setPostForm] = useState({ crop: '', qty: '', price: '', quality: 'A Grade' });

  const getMarketInsight = async (cropName) => {
    setLoadingInsight(cropName);
    setAiInsight(null);
    setShowModal(true);
    try {
      const token = localStorage.getItem('nr_token');
      const res = await fetch(apiUrl('/api/ai/market-insight'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ cropName })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setAiInsight(data);
    } catch (e) {
      setAiInsight({ error: 'Could not load AI insight. Check backend connection.' });
    } finally {
      setLoadingInsight('');
    }
  };

  const trendClass = (t) => ({ Rising: 'trend-rising', Falling: 'trend-falling', Stable: 'trend-stable' }[t] || 'trend-stable');
  const trendIcon = (t) => ({ Rising: '📈', Falling: '📉', Stable: '➡️' }[t] || '➡️');

  const allCrops = cropRates?.length > 0 ? cropRates : [
    { icon: '🌾', name: 'Ragi', price: '₹3,900/qt', change: '+₹120', up: true },
    { icon: '🌽', name: 'Maize', price: '₹2,100/qt', change: '+₹80', up: true },
    { icon: '🫘', name: 'Toor Dal', price: '₹7,200/qt', change: '-₹50', up: false },
    { icon: '🌱', name: 'Paddy', price: '₹2,200/qt', change: '+₹30', up: true },
    { icon: '🥜', name: 'Groundnut', price: '₹5,600/qt', change: '+₹200', up: true },
    { icon: '🌿', name: 'Cotton', price: '₹7,100/qt', change: '-₹120', up: false },
  ];

  return (
    <>
      <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px' }}>🛒 Marketplace · ಮಾರುಕಟ್ಟೆ</div>

      {/* Post Crop CTA */}
      <div className="post-card" onClick={() => setShowPostForm(!showPostForm)}>
        <div style={{ fontSize: '.96rem', fontWeight: 700, marginBottom: '3px' }}>
          {showPostForm ? '✕ Cancel' : '+ Post Your Crop · ನಿಮ್ಮ ಬೆಳೆ ಮಾರಿ'}
        </div>
        {!showPostForm && <div style={{ fontSize: '.76rem', opacity: .88 }}>List produce → Get bids → Instant UPI payment</div>}
      </div>

      {showPostForm && (
        <div className="form-box" style={{ marginTop: '-5px' }}>
          <div className="fl">Crop <span>ಬೆಳೆ</span></div>
          <input className="inp" placeholder="e.g. Ragi, Paddy..." value={postForm.crop} onChange={e => setPostForm(f => ({ ...f, crop: e.target.value }))} />
          <div className="fl">Quantity (Quintals) <span>ಕ್ವಿಂಟಾಲ್</span></div>
          <input className="inp" type="number" placeholder="e.g. 20" value={postForm.qty} onChange={e => setPostForm(f => ({ ...f, qty: e.target.value }))} />
          <div className="fl">Your Price (₹/qt) <span>ಬೆಲೆ</span></div>
          <input className="inp" type="number" placeholder="e.g. 3900" value={postForm.price} onChange={e => setPostForm(f => ({ ...f, price: e.target.value }))} />
          <div className="fl">Quality Grade <span>ಗುಣಮಟ್ಟ</span></div>
          <select className="sel" value={postForm.quality} onChange={e => setPostForm(f => ({ ...f, quality: e.target.value }))} style={{ marginBottom: '16px' }}>
            {['A Grade · Premium', 'B Grade · Standard', 'C Grade · Commercial'].map(q => <option key={q}>{q}</option>)}
          </select>
          <button className="btn-green" onClick={() => { alert('🌾 Crop listed! Buyers will contact you soon. (Demo mode)'); setShowPostForm(false); setPostForm({ crop: '', qty: '', price: '', quality: 'A Grade' }); }}>
            📢 List for Bidding · ಹರಾಜಿಗೆ ಹಾಕಿ
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="mktabs">
        {['🛒 Buy', '📦 Sell', '📋 My Orders'].map(t => (
          <button key={t} className={`mktab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {/* Live Rates with AI Insight buttons */}
      <div className="sec-head"><span className="sec-title">📊 Live Rates · ಜೀವಂತ ದರ</span></div>
      {allCrops.map((c, i) => (
        <div className="mkt-item" key={i}>
          <span className="mi-icon">{c.icon}</span>
          <div className="mi-info">
            <div className="mi-name">{c.name}</div>
            <div className="mi-detail">Karnataka APMC · Updated 15 min ago</div>
          </div>
          <div className="mi-price">
            <div className="mi-val">{c.price}</div>
            <div className={`mi-ch ${c.up ? 'up' : 'dn'}`}>{c.change}</div>
          </div>
          <button
            className="btn-sm btn-sm-blue"
            style={{ marginLeft: '8px', padding: '5px 10px', fontSize: '.68rem' }}
            onClick={() => getMarketInsight(c.name)}
          >
            🤖 AI
          </button>
        </div>
      ))}

      {/* Marketplace listings */}
      {marketItems && marketItems.length > 0 && (
        <>
          <div className="sec-head" style={{ marginTop: '4px' }}><span className="sec-title">📦 Available Lots · ಲಭ್ಯ ಸರಕು</span></div>
          {marketItems.map((item, i) => (
            <div className="mkt-item" key={i}>
              <span className="mi-icon">{item.icon}</span>
              <div className="mi-info">
                <div className="mi-name">{item.name}</div>
                <div className="mi-detail">{item.detail}</div>
              </div>
              <div className="mi-price">
                <div className="mi-val">{item.price}</div>
                <div className={`mi-ch ${item.up ? 'up' : 'dn'}`}>{item.unit}</div>
              </div>
            </div>
          ))}
        </>
      )}

      {/* Payment Bridge */}
      <div className="pay-steps" style={{ marginTop: '8px' }}>
        <div style={{ fontWeight: 700, marginBottom: '13px', color: 'var(--blue)' }}>💳 Payment Bridge · ಪಾವತಿ</div>
        {[
          { n: 1, c: 'pnb', title: 'Farmer Lists Crop', desc: 'Upload quantity, price & quality' },
          { n: 2, c: 'pnb', title: 'Buyer Bids · ಖರೀದಿದಾರ ಬಿಡ್', desc: 'Verified buyers place competitive bids' },
          { n: 3, c: 'png', title: 'Deal Confirmed · ಒಪ್ಪಂದ', desc: 'Escrow payment secured instantly' },
          { n: 4, c: 'png', title: 'UPI Transfer · ತಕ್ಷಣ ಹಣ', desc: 'After delivery — money in 2 hours' },
        ].map(s => (
          <div className="ps" key={s.n} style={s.n === 4 ? { marginBottom: 0 } : {}}>
            <div className={`ps-num ${s.c}`}>{s.n}</div>
            <div><div className="ps-title">{s.title}</div><div className="ps-desc">{s.desc}</div></div>
          </div>
        ))}
        <div className="fee-box">
          <div><div className="fee-label">Platform Fee · ಶುಲ್ಕ</div><div style={{ fontSize: '.68rem', color: 'var(--light)' }}>Transparent · No hidden charges</div></div>
          <div className="fee-val">1%</div>
        </div>
      </div>

      {/* AI Market Insight Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setShowModal(false)}>
          <div style={{ background: '#fff', borderRadius: '20px', padding: '22px', maxWidth: '480px', width: '100%', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,.25)', animation: 'fi .25s ease' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>🤖 AI Market Insight</div>
              <button style={{ background: 'var(--bg)', border: 'none', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontWeight: 600 }} onClick={() => setShowModal(false)}>✕</button>
            </div>

            {loadingInsight && (
              <div style={{ textAlign: 'center', padding: '30px' }}>
                <span className="ai-spinner dark" style={{ width: '32px', height: '32px', borderWidth: '3px' }} />
                <div style={{ marginTop: '12px', fontSize: '.84rem', color: 'var(--mid)' }}>Analyzing {loadingInsight} market...</div>
              </div>
            )}

            {aiInsight?.error && (
              <div style={{ color: 'var(--red)', padding: '12px', background: '#FFEBEE', borderRadius: '8px', fontSize: '.82rem' }}>⚠️ {aiInsight.error}</div>
            )}

            {aiInsight && !aiInsight.error && (
              <>
                <AIBadge fromAI={aiInsight.fromAI} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '12px 0' }}>
                  <div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--blue)' }}>{aiInsight.avgPrice}</div>
                    <div style={{ fontSize: '.7rem', color: 'var(--light)' }}>{aiInsight.crop} · Average Price</div>
                  </div>
                  <span className={`pill ${trendClass(aiInsight.trend)}`}>{trendIcon(aiInsight.trend)} {aiInsight.trend} {aiInsight.forecast}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '9px', marginBottom: '14px' }}>
                  {[
                    { label: 'Week High', val: aiInsight.weekHigh, c: 'var(--green)' },
                    { label: 'Week Low', val: aiInsight.weekLow, c: 'var(--red)' },
                    { label: 'Active Buyers', val: aiInsight.buyerCount, c: 'var(--blue)' },
                    { label: 'Demand Score', val: `${aiInsight.demandScore}%`, c: 'var(--orange)' },
                  ].map(s => (
                    <div key={s.label} style={{ background: 'var(--bg)', borderRadius: '9px', padding: '10px' }}>
                      <div style={{ fontSize: '.92rem', fontWeight: 800, color: s.c }}>{s.val}</div>
                      <div style={{ fontSize: '.65rem', color: 'var(--light)' }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {aiInsight.priceHistory && <PriceChart history={aiInsight.priceHistory} />}

                <div style={{ background: 'var(--blue-bg)', borderRadius: '10px', padding: '13px', marginTop: '10px' }}>
                  <div style={{ fontSize: '.8rem', fontWeight: 700, color: 'var(--blue)', marginBottom: '5px' }}>📋 Sell Advice</div>
                  <div style={{ fontSize: '.78rem', color: 'var(--mid)', lineHeight: 1.5 }}>{aiInsight.sellAdvice}</div>
                </div>

                <div style={{ marginTop: '10px', background: 'var(--green-bg)', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ fontSize: '.8rem', fontWeight: 700, color: 'var(--green)', marginBottom: '4px' }}>🏪 Best Market</div>
                  <div style={{ fontSize: '.76rem', color: 'var(--mid)' }}>{aiInsight.bestMarket}</div>
                </div>

                {aiInsight.tip && (
                  <div style={{ marginTop: '10px', fontSize: '.74rem', color: 'var(--mid)', borderTop: '1px solid var(--border)', paddingTop: '10px', lineHeight: 1.5 }}>
                    💡 {aiInsight.tip}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
