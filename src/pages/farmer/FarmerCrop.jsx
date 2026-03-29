import React, { useState, useRef } from 'react';

const DISTRICTS = ['Dharwad','Gadag','Bellary','Haveri','Bidar','Kalaburagi','Kodagu','Hassan','Mysuru','Bengaluru Urban','Shivamogga','Chitradurga','Tumkur','Raichur','Koppal','Yadgir','Bagalkot','Vijayapura'];
const SOIL_TYPES = ['Red Sandy · ಕೆಂಪು','Black Cotton · ಕಪ್ಪು','Laterite · ಮುರಮ್','Alluvial · ಮೆಕ್ಕಲು'];
const SEASONS = ['Kharif (Jun–Oct) · ಮುಂಗಾರು','Rabi (Nov–Mar) · ಹಿಂಗಾರು','Zaid (Mar–Jun) · ಬೇಸಿಗೆ'];
const IRRIGATION = ['Rainfed · ಮಳೆ ಆಧಾರಿತ','Drip · ತುಂತುರು','Canal · ಕಾಲುವೆ','Borewell · ಕೊಳವೆ ಬಾವಿ'];

function AIBadge({ fromAI }) {
  return (
    <span className={`ai-badge ${fromAI ? '' : 'mock'}`}>
      🤖 {fromAI ? 'Gemini AI' : 'Smart AI'}
    </span>
  );
}

export default function FarmerCrop() {
  const [form, setForm] = useState({ district: 'Dharwad', soilType: 'Red Sandy · ಕೆಂಪು', season: 'Kharif (Jun–Oct) · ಮುಂಗಾರು', irrigation: 'Rainfed · ಮಳೆ ಆಧಾರಿತ', landSize: '2.5' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const resultRef = useRef(null);

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const getAdvice = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const token = localStorage.getItem('nr_token');
      const res = await fetch('http://localhost:3001/api/ai/crop-advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ district: form.district, soilType: form.soilType, season: form.season, irrigation: form.irrigation, landSize: parseFloat(form.landSize) })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'AI analysis failed');
      setResult(data);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (e) {
      setError(e.message.includes('fetch') ? 'Cannot connect to server. Make sure backend is running.' : e.message);
    } finally {
      setLoading(false);
    }
  };

  const getRiskClass = (r) => r === 'Low' ? 'pg' : r === 'Medium' ? 'pgld' : 'pr';

  return (
    <>
      <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '4px' }}>
        🌾 AI Crop Advisor
        <div style={{ fontSize: '.72rem', color: 'var(--light)', fontFamily: "'Noto Sans Kannada',sans-serif", fontWeight: 400, marginTop: '2px' }}>ಬೆಳೆ ಆಯ್ಕೆ ಸಲಹೆ</div>
      </div>
      <div style={{ fontSize: '.75rem', color: 'var(--mid)', marginBottom: '13px', background: 'var(--blue-bg)', padding: '8px 12px', borderRadius: '8px' }}>
        🤖 Powered by AI — Enter your farm details for personalized crop recommendations
      </div>

      <div className="form-box">
        <div className="fl">District <span>ಜಿಲ್ಲೆ</span></div>
        <select className="sel" name="district" value={form.district} onChange={handleChange}>
          {DISTRICTS.map(d => <option key={d}>{d}</option>)}
        </select>
        <div className="fl">Land Size (Acres) <span>ಜಮೀನಿನ ಗಾತ್ರ</span></div>
        <input className="inp" type="number" name="landSize" value={form.landSize} onChange={handleChange} min="0.5" max="100" step="0.5" />
        <div className="fl">Soil Type <span>ಮಣ್ಣಿನ ಪ್ರಕಾರ</span></div>
        <select className="sel" name="soilType" value={form.soilType} onChange={handleChange}>
          {SOIL_TYPES.map(s => <option key={s}>{s}</option>)}
        </select>
        <div className="fl">Season <span>ಋತು</span></div>
        <select className="sel" name="season" value={form.season} onChange={handleChange}>
          {SEASONS.map(s => <option key={s}>{s}</option>)}
        </select>
        <div className="fl">Irrigation <span>ನೀರಾವರಿ</span></div>
        <select className="sel" name="irrigation" value={form.irrigation} onChange={handleChange} style={{ marginBottom: '16px' }}>
          {IRRIGATION.map(i => <option key={i}>{i}</option>)}
        </select>
        {error && <div style={{ color: 'var(--red)', fontSize: '.8rem', marginBottom: '10px', background: '#FFEBEE', padding: '10px', borderRadius: '8px' }}>⚠️ {error}</div>}
        <button className="btn-green" onClick={getAdvice} disabled={loading}>
          {loading ? <><span className="ai-spinner" />Analyzing your farm...</> : '🤖 Get AI Recommendation · ಸಲಹೆ ಪಡೆಯಿರಿ'}
        </button>
      </div>

      {result && (
        <div ref={resultRef}>
          <AIBadge fromAI={result.fromAI} />

          {/* Summary */}
          <div className="ai-result-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '12px' }}>
              <span style={{ fontSize: '1.6rem' }}>🤖</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '.92rem', color: 'var(--green)' }}>AI Analysis Complete · ವಿಶ್ಲೇಷಣೆ ಸಿದ್ಧ</div>
                <div style={{ fontSize: '.72rem', color: 'var(--mid)', marginTop: '2px' }}>{result.summary}</div>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'center' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--green)' }}>{result.aiConfidence}%</div>
                <div style={{ fontSize: '.58rem', color: 'var(--light)' }}>AI Confidence</div>
              </div>
            </div>
            <div className="pred-grid">
              <div className="pred-item"><div className="pv g">{result.topCrops?.[0]?.yieldPerAcre || '15 Qt'}</div><div className="pl">Expected Yield/Acre · ಇಳುವರಿ</div></div>
              <div className="pred-item"><div className="pv gld">₹{(result.topCrops?.[0]?.profitPerAcre / 1000).toFixed(0)}K</div><div className="pl">Est. Profit/Acre · ಲಾಭ</div></div>
              <div className="pred-item"><div className="pv g">{result.topCrops?.[0]?.waterRequirement}</div><div className="pl">Water Need · ನೀರಿನ ಅಗತ್ಯ</div></div>
              <div className="pred-item"><div className="pv">{result.topCrops?.[0]?.risk}</div><div className="pl">Risk Level · ಅಪಾಯ</div></div>
            </div>
            {result.weatherForecast && (
              <div style={{ marginTop: '10px', fontSize: '.75rem', color: 'var(--blue)', background: 'rgba(21,101,192,.06)', padding: '8px', borderRadius: '8px' }}>
                🌤 {result.weatherForecast}
              </div>
            )}
          </div>

          {/* Top Recommendations */}
          <div className="sec-head"><span className="sec-title">🏆 Top Recommendations · ಶಿಫಾರಸುಗಳು</span></div>
          {result.topCrops?.map((c, idx) => (
            <div className="cr-card" key={c.name} style={{ borderLeftColor: idx === 0 ? 'var(--orange)' : idx === 1 ? 'var(--blue)' : 'var(--green)' }}>
              <span className="cr-icon">{c.icon}</span>
              <div className="cr-info">
                <div className="cr-name">{c.name}</div>
                <div className="cr-kn">{c.kannadaName} · ₹{(c.profitPerAcre / 1000).toFixed(0)}K/acre</div>
                <div className="yb-bg"><div className="yb-fill" style={{ width: `${c.aiScore}%`, background: idx === 0 ? 'linear-gradient(90deg,var(--orange),#FFA726)' : idx === 1 ? 'linear-gradient(90deg,var(--blue),#42A5F5)' : 'linear-gradient(90deg,var(--green),#66BB6A)' }} /></div>
                <div className="cr-chips">
                  <span className={`chip ${getRiskClass(c.risk)}`}>Risk: {c.risk}</span>
                  <span className="chip chip-b">Yield: {c.yieldPerAcre}</span>
                  <span className="chip chip-gld">{c.msPrice}</span>
                </div>
                {c.advice && <div style={{ fontSize: '.69rem', color: 'var(--mid)', marginTop: '5px', lineHeight: 1.4 }}>💡 {c.advice}</div>}
              </div>
              <div className="cr-rank">
                <div className={`rk rk${idx + 1}`}>{idx + 1}</div>
                <div style={{ fontSize: '.6rem', color: idx === 0 ? 'var(--orange)' : idx === 1 ? 'var(--blue)' : 'var(--green)' }}>{idx === 0 ? '★ Best' : idx === 1 ? 'Good' : 'Safe'}</div>
              </div>
            </div>
          ))}

          {/* General Advice */}
          {result.generalAdvice && (
            <div className="card" style={{ borderLeft: '4px solid var(--blue)', marginTop: '4px' }}>
              <div style={{ fontSize: '.82rem', fontWeight: 700, marginBottom: '6px' }}>💡 AI Farm Strategy</div>
              <div style={{ fontSize: '.76rem', color: 'var(--mid)', lineHeight: 1.5 }}>{result.generalAdvice}</div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
