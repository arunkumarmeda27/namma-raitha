import React, { useState } from 'react';

function AIBadge({ fromAI }) {
  return <span className={`ai-badge ${fromAI ? '' : 'mock'}`}>🤖 {fromAI ? 'Gemini AI' : 'Smart AI'}</span>;
}

const staticProblems = [
  { icon: '🐛', title: 'Fall Armyworm (FAW)', kn: 'ಮೆಕ್ಕೆ ಸೈನ್ಯ ಹುಳ', desc: 'Affects Maize. Use Chlorpyrifos 2ml/L or Spinetoram 0.5ml/L. Spray at evening.', tags: ['Maize', 'Spray Guide'] },
  { icon: '🍂', title: 'Blast Disease in Paddy', kn: 'ಭತ್ತದ ಕಟ್ಟು ರೋಗ', desc: 'Use Tricyclazole 0.6g/L or Carbendazim 1g/L. Drain water before spraying.', tags: ['Paddy', 'Fungicide'] },
  { icon: '🦟', title: 'Whitefly in Cotton', kn: 'ಹತ್ತಿಯಲ್ಲಿ ಬಿಳಿ ನೊಣ', desc: 'Use Imidacloprid 0.3ml/L. Avoid during flowering. Use yellow sticky traps.', tags: ['Cotton', 'Systemic'] },
];

const govtSchemes = [
  { title: 'PM-KISAN Samman Nidhi', kn: 'ಪ್ರಧಾನ ಮಂತ್ರಿ ಕಿಸಾನ್ ಸಮ್ಮಾನ್', desc: '₹6,000/year direct to bank account for all farmers. Apply at nearest CSC or pm-kisan.gov.in', benefit: 'Benefit: ₹6,000/yr', btnColor: 'btn-sm-blue', btnText: 'Apply Now' },
  { title: 'Krishi Bhagya Yojane (Karnataka)', kn: 'ಕೃಷಿ ಭಾಗ್ಯ ಯೋಜನೆ', desc: 'Farm pond, drip irrigation, sprinkler subsidies up to 90% for small farmers in Karnataka.', benefit: 'Subsidy: up to 90%', btnColor: 'btn-sm-blue', btnText: 'Check Eligibility' },
  { title: 'Fasal Bima Yojana — Crop Insurance', kn: 'ಬೆಳೆ ವಿಮೆ ಯೋಜನೆ', desc: 'Insure your crop against natural disasters. Premium as low as 1.5% for Kharif crops.', benefit: 'Premium: from 1.5%', btnColor: 'btn-sm-green', btnText: 'Insure Now' },
];

const CROPS_LIST = ['Ragi', 'Paddy', 'Maize', 'Cotton', 'Toor Dal', 'Groundnut', 'Sunflower', 'Soybean', 'Jowar', 'Wheat', 'Chilli', 'Sugarcane', 'Other'];

export default function FarmerSolutions({ onNav }) {
  const [cropName, setCropName] = useState('Ragi');
  const [customCrop, setCustomCrop] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [error, setError] = useState('');

  const diagnose = async () => {
    const finalCrop = cropName === 'Other' ? customCrop.trim() : cropName;
    if (!finalCrop || !symptoms.trim()) {
      setError('Please enter crop name and describe the symptoms.');
      return;
    }
    setLoading(true);
    setError('');
    setAiResult(null);
    try {
      const token = localStorage.getItem('nr_token');
      const res = await fetch('http://localhost:3001/api/ai/pest-diagnosis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ cropName: finalCrop, symptoms: symptoms.trim() })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'AI diagnosis failed');
      setAiResult(data);
    } catch (e) {
      setError(e.message.includes('fetch') ? 'Cannot connect to server. Make sure backend is running.' : e.message);
    } finally {
      setLoading(false);
    }
  };

  const sevClass = (s) => ({ Low: 'sev-low', Medium: 'sev-medium', High: 'sev-high', Critical: 'sev-critical' }[s] || 'sev-low');

  return (
    <>
      <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '13px' }}>🆘 Farmer Solutions · ರೈತ ಸಮಸ್ಯೆ ಪರಿಹಾರ</div>

      {/* ─── AI Pest Diagnosis ─── */}
      <div className="sec-head"><span className="sec-title">🤖 AI Pest & Disease Diagnosis · ರೋಗ ರೋಗನಿರ್ಣಯ</span></div>
      <div className="form-box green-bg">
        <div style={{ fontSize: '.8rem', color: 'var(--green)', fontWeight: 600, marginBottom: '12px' }}>
          Describe your crop problem — AI will diagnose and suggest treatment
        </div>
        <div className="fl">Crop Name <span>ಬೆಳೆ ಹೆಸರು</span></div>
        <select className="sel" value={cropName} onChange={e => setCropName(e.target.value)}>
          {CROPS_LIST.map(c => <option key={c}>{c}</option>)}
        </select>
        {cropName === 'Other' && (
          <input className="inp" placeholder="Enter crop name..." value={customCrop} onChange={e => setCustomCrop(e.target.value)} />
        )}
        <div className="fl">Symptoms · ಲಕ್ಷಣಗಳು <span>Describe what you see on the plant</span></div>
        <textarea
          className="inp"
          style={{ minHeight: '90px', resize: 'vertical', fontFamily: "'Poppins',sans-serif" }}
          placeholder="e.g. Yellow spots on leaves, wilting stems, small holes in leaves, white powder on surface..."
          value={symptoms}
          onChange={e => setSymptoms(e.target.value)}
        />
        {error && <div style={{ color: 'var(--red)', fontSize: '.8rem', marginBottom: '10px', background: '#FFEBEE', padding: '10px', borderRadius: '8px' }}>⚠️ {error}</div>}
        <button className="btn-green" onClick={diagnose} disabled={loading}>
          {loading ? <><span className="ai-spinner" />Diagnosing...</> : '🔍 Diagnose with AI · AI ರೋಗನಿರ್ಣಯ'}
        </button>
      </div>

      {/* AI Diagnosis Result */}
      {aiResult && (
        <div>
          <AIBadge fromAI={aiResult.fromAI} />
          <div className="ai-result-card" style={{ marginTop: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '.95rem' }}>{aiResult.diagnosis?.name}</div>
                <div style={{ fontSize: '.72rem', color: 'var(--light)', fontFamily: "'Noto Sans Kannada',sans-serif", marginTop: '2px' }}>{aiResult.diagnosis?.kannadaName}</div>
                <div style={{ fontSize: '.72rem', color: 'var(--mid)', marginTop: '4px' }}>📌 {aiResult.diagnosis?.cause}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className={`pill ${sevClass(aiResult.diagnosis?.severity)}`}>{aiResult.diagnosis?.severity}</span>
                <div style={{ fontSize: '.65rem', color: 'var(--light)', marginTop: '4px' }}>{aiResult.confidence}% confident</div>
              </div>
            </div>

            {/* Treatment Steps */}
            <div style={{ fontSize: '.8rem', fontWeight: 700, color: 'var(--red)', marginBottom: '7px' }}>💊 Treatment Steps · ಚಿಕಿತ್ಸೆ</div>
            {aiResult.diagnosis?.treatment?.map((t, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '5px', alignItems: 'flex-start' }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--red)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.65rem', fontWeight: 700, flexShrink: 0, marginTop: '2px' }}>{i + 1}</div>
                <div style={{ fontSize: '.78rem', color: 'var(--mid)', lineHeight: 1.4 }}>{t}</div>
              </div>
            ))}

            {/* Prevention */}
            {aiResult.diagnosis?.prevention?.length > 0 && (
              <>
                <div style={{ fontSize: '.8rem', fontWeight: 700, color: 'var(--green)', margin: '12px 0 7px' }}>🛡️ Prevention · ತಡೆಗಟ್ಟುವಿಕೆ</div>
                {aiResult.diagnosis.prevention.map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: '7px', marginBottom: '4px', fontSize: '.76rem', color: 'var(--mid)' }}>
                    <span style={{ color: 'var(--green)' }}>✓</span> {p}
                  </div>
                ))}
              </>
            )}

            <div style={{ marginTop: '12px', background: '#FFF3E0', borderRadius: '8px', padding: '9px 12px', fontSize: '.73rem', color: '#E65100' }}>
              ⏰ {aiResult.diagnosis?.timeToTreat}
            </div>

            <div style={{ marginTop: '10px', fontSize: '.7rem', color: 'var(--mid)' }}>
              📍 {aiResult.nearbyAgriOffice} · 🆘 {aiResult.emergencyHelpline}
            </div>
          </div>
        </div>
      )}

      {/* Static Disease Guide */}
      <div className="sec-head" style={{ marginTop: '8px' }}><span className="sec-title">🌿 Common Diseases · ರೋಗ ಮಾರ್ಗದರ್ಶಿ</span></div>
      {staticProblems.map(p => (
        <div className="problem-card" key={p.title}>
          <span className="pc-icon">{p.icon}</span>
          <div style={{ flex: 1 }}>
            <div className="pc-title">{p.title}</div>
            <div className="pc-kn">{p.kn}</div>
            <div className="pc-desc">{p.desc}</div>
            <div className="pc-tags">{p.tags.map((t, i) => <span key={t} className={`chip ${i === 0 ? 'chip-g' : 'chip-b'}`}>{t}</span>)}</div>
          </div>
        </div>
      ))}

      {/* Govt Schemes */}
      <div className="sec-head" style={{ marginTop: '4px' }}><span className="sec-title">🏛 Government Schemes · ಸರ್ಕಾರಿ ಯೋಜನೆ</span></div>
      {govtSchemes.map(s => (
        <div className="scheme-card" key={s.title}>
          <div className="sc-title">{s.title}</div>
          <div className="sc-kn">{s.kn}</div>
          <div className="sc-detail">{s.desc}</div>
          <div className="sc-footer">
            <span className="sc-benefit">{s.benefit}</span>
            <button className={`btn-sm ${s.btnColor}`}>{s.btnText}</button>
          </div>
        </div>
      ))}

      {/* Irrigation */}
      <div className="sec-head" style={{ marginTop: '4px' }}><span className="sec-title">💧 Irrigation Help · ನೀರಾವರಿ</span></div>
      <div className="problem-card">
        <span className="pc-icon">💧</span>
        <div style={{ flex: 1 }}>
          <div className="pc-title">Drip Irrigation Setup</div>
          <div className="pc-kn">ತುಂತುರು ನೀರಾವರಿ</div>
          <div className="pc-desc">Save 50% water vs flood irrigation. Govt subsidy available up to ₹50,000/acre.</div>
          <div className="pc-tags"><span className="pill pg" style={{ fontSize: '.62rem' }}>50% water saving</span></div>
        </div>
      </div>
      <div className="problem-card" style={{ alignItems: 'center' }}>
        <span className="pc-icon">🔵</span>
        <div style={{ flex: 1 }}>
          <div className="pc-title">Borewell Drilling Guide</div>
          <div className="pc-kn">ಕೊಳವೆ ಬಾವಿ ಕೊರೆಯಲು</div>
          <div className="pc-desc">Check our Satellite Map for borewell zone in your district before drilling.</div>
          <div className="pc-tags"><span className="chip chip-b">Map →</span></div>
        </div>
        <button className="btn-sm btn-sm-blue" onClick={() => onNav('map')}>Open Map</button>
      </div>

      {/* Helplines */}
      <div className="sec-head" style={{ marginTop: '4px' }}><span className="sec-title">📞 Helplines · ಸಹಾಯ ಸಂಖ್ಯೆ</span></div>
      <div className="card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
          {[
            { title: 'Kisan Call Centre', sub: 'Crop & farming advice 24/7', num: '1800-180-1551', c: 'var(--blue)' },
            { title: 'Karnataka Raita Samparka', sub: 'State agri helpline', num: '155333', c: 'var(--green)' },
            { title: 'Meri Fasal Mera Byora', sub: 'Crop registration helpline', num: '1800-180-2117', c: 'var(--blue)' },
          ].map(h => (
            <div key={h.title} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px', background: 'var(--bg)', borderRadius: '9px' }}>
              <div><div style={{ fontWeight: 700, fontSize: '.84rem' }}>{h.title}</div><div style={{ fontSize: '.68rem', color: 'var(--light)' }}>{h.sub}</div></div>
              <a href={`tel:${h.num}`} style={{ fontWeight: 700, fontSize: '.9rem', color: h.c, textDecoration: 'none' }}>{h.num}</a>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
