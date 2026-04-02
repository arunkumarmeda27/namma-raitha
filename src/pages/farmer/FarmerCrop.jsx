import React, { useState, useRef, useEffect } from 'react';

import { apiUrl } from '../../lib/api';

const DISTRICTS = ['Dharwad','Gadag','Bellary','Haveri','Bidar','Kalaburagi','Kodagu','Hassan','Mysuru','Bengaluru Urban','Shivamogga','Chitradurga','Tumkur','Raichur','Koppal','Yadgir','Bagalkot','Vijayapura'];
const SOIL_TYPES = ['Red Sandy · ಕೆಂಪು','Black Cotton · ಕಪ್ಪು','Laterite · ಮುರಮ್','Alluvial · ಮೆಕ್ಕಲು'];
const SEASONS = ['Kharif (Jun–Oct) · ಮುಂಗಾರು','Rabi (Nov–Mar) · ಹಿಂಗಾರು','Zaid (Mar–Jun) · ಬೇಸಿಗೆ'];
const IRRIGATION = ['Rainfed · ಮಳೆ ಆಧಾರಿತ','Drip · ತುಂತುರು','Canal · ಕಾಲುವೆ','Borewell · ಕೊಳವೆ ಬಾವಿ'];

const QUICK_QUESTIONS = [
  '🌱 What is the best fertilizer for ragi?',
  '🐛 How to control stem borer?',
  '💧 When should I irrigate paddy?',
  '💰 What is the current MSP for wheat?',
  '🌤 When is the best time to sow cotton?',
  '🧪 How to test my soil type?',
];

function AIBadge({ fromAI }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      background: fromAI ? 'linear-gradient(135deg,#4CAF50,#2E7D32)' : 'linear-gradient(135deg,#FF9800,#E65100)',
      color: '#fff', borderRadius: '20px', padding: '3px 10px',
      fontSize: '0.68rem', fontWeight: 700, marginBottom: '10px'
    }}>
      🤖 {fromAI ? 'Gemini AI • Live' : 'Smart AI • Demo'}
    </span>
  );
}

export default function FarmerCrop() {
  const [tab, setTab] = useState('advisor'); // 'advisor' | 'chat' | 'image'
  const [form, setForm] = useState({
    district: 'Dharwad', soilType: 'Red Sandy · ಕೆಂಪು',
    season: 'Kharif (Jun–Oct) · ಮುಂಗಾರು', irrigation: 'Rainfed · ಮಳೆ ಆಧಾರಿತ', landSize: '2.5'
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const resultRef = useRef(null);

  // Chat state
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: '🌾 **Namaskara! I am Raitha AI** — your agricultural advisor.\n\nI can help you with:\n• Crop diseases & pest control\n• Market prices & selling advice\n• Government schemes & subsidies\n• Farming techniques for Karnataka\n\nYou can also **upload a photo** of your crop and I will analyze it!\n\nAsk me anything about farming! ✨', timestamp: new Date().toISOString() }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Image analysis state
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageResult, setImageResult] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);
  const fileInputRef = useRef(null);

  const token = localStorage.getItem('nr_token');

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  // ── CROP ADVISOR ────────────────────────────────────────────────────────────
  const getAdvice = async () => {
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch(apiUrl('/api/ai/crop-advice'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ district: form.district, soilType: form.soilType, season: form.season, irrigation: form.irrigation, landSize: parseFloat(form.landSize) })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'AI analysis failed');
      setResult(data);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (e) {
      setError(e.message.includes('fetch') ? 'Cannot connect to server. Make sure backend is running on port 3001.' : e.message);
    } finally { setLoading(false); }
  };

  // ── AI CHAT ──────────────────────────────────────────────────────────────────
  const sendMessage = async (message, imageBase64 = null, imageMimeType = null) => {
    if (!message.trim()) return;
    const userMsg = { role: 'user', content: message, imageBase64, imageMimeType, timestamp: new Date().toISOString() };
    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await fetch(apiUrl('/api/ai/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          messages: newMessages.slice(0, -1).map(m => ({ role: m.role, content: m.content, imageBase64: m.imageBase64, imageMimeType: m.imageMimeType })),
          newMessage: message,
          imageBase64, imageMimeType
        })
      });
      const data = await res.json();
      setChatMessages(prev => [...prev, {
        role: 'assistant', content: data.reply || '⚠️ No response. Please try again.',
        fromAI: data.fromAI, timestamp: new Date().toISOString()
      }]);
    } catch (e) {
      setChatMessages(prev => [...prev, {
        role: 'assistant', content: '⚠️ Cannot connect to server. Make sure the backend is running.',
        fromAI: false, timestamp: new Date().toISOString()
      }]);
    } finally { setChatLoading(false); }
  };

  // ── IMAGE ANALYSIS ───────────────────────────────────────────────────────────
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImageResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const analyzeCropImage = async () => {
    if (!imageFile && !imagePreview) return;
    setImageLoading(true); setImageResult(null);
    try {
      const base64 = imagePreview.split(',')[1];
      const mimeType = imageFile?.type || 'image/jpeg';
      const res = await fetch(apiUrl('/api/ai/analyze-image'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ imageBase64: base64, mimeType })
      });
      const data = await res.json();
      if (data.success) setImageResult(data.analysis);
      else throw new Error(data.error || 'Analysis failed');
    } catch (e) {
      setImageResult({ error: e.message.includes('fetch') ? 'Cannot connect to server.' : e.message });
    } finally { setImageLoading(false); }
  };

  const sendImageToChat = async () => {
    if (!imagePreview || !imageResult) return;
    const base64 = imagePreview.split(',')[1];
    const mimeType = imageFile?.type || 'image/jpeg';
    setTab('chat');
    await sendMessage(`I've uploaded a crop photo. Based on the image analysis, the crop identified is ${imageResult.cropIdentified}. Health status: ${imageResult.healthStatus}. Can you give me detailed advice?`, base64, mimeType);
  };

  const getRiskClass = (r) => r === 'Low' ? '#4CAF50' : r === 'Medium' ? '#FF9800' : '#F44336';

  // Format AI message text with markdown-like bold
  const formatMessage = (text) => {
    if (!text) return '';
    return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>');
  };

  return (
    <>
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1565C0' }}>🌾 Crop AI</div>
        <div style={{ fontSize: '0.72rem', color: '#616161', fontFamily: "'Noto Sans Kannada',sans-serif" }}>ಬೆಳೆ ಕೃತಕ ಬುದ್ಧಿಮತ್ತೆ ಸಲಹೆ</div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', background: '#F5F5F5', padding: '4px', borderRadius: '12px' }}>
        {[
          { id: 'advisor', label: '🤖 Advisor', sub: 'Crop Advice' },
          { id: 'chat', label: '💬 AI Chat', sub: 'Ask Anything' },
          { id: 'image', label: '📸 Image AI', sub: 'Photo Analysis' }
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: '8px 4px', border: 'none', borderRadius: '10px', cursor: 'pointer',
            background: tab === t.id ? '#fff' : 'transparent',
            boxShadow: tab === t.id ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
            fontWeight: tab === t.id ? 700 : 400, fontSize: '0.75rem', color: tab === t.id ? '#1565C0' : '#757575',
            transition: 'all 0.2s'
          }}>
            <div>{t.label}</div>
            <div style={{ fontSize: '0.6rem', opacity: 0.7 }}>{t.sub}</div>
          </button>
        ))}
      </div>

      {/* ── TAB: ADVISOR ─────────────────────────────────────────────────────────── */}
      {tab === 'advisor' && (
        <>
          <div style={{ background: 'linear-gradient(135deg, #E3F2FD, #BBDEFB)', padding: '10px 12px', borderRadius: '10px', fontSize: '0.75rem', color: '#1565C0', marginBottom: '14px' }}>
            🤖 Enter your farm details for personalized AI crop recommendations powered by Gemini
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
            {error && <div style={{ color: '#C62828', fontSize: '0.8rem', marginBottom: '10px', background: '#FFEBEE', padding: '10px', borderRadius: '8px' }}>⚠️ {error}</div>}
            <button className="btn-green" onClick={getAdvice} disabled={loading}>
              {loading ? <><span className="ai-spinner" /> Analyzing your farm conditions...</> : '🤖 Get AI Crop Recommendation · ಸಲಹೆ ಪಡೆಯಿರಿ'}
            </button>
          </div>

          {result && (
            <div ref={resultRef}>
              <AIBadge fromAI={result.fromAI} />
              <div className="ai-result-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '1.6rem' }}>🤖</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--green)' }}>AI Analysis Complete · ವಿಶ್ಲೇಷಣೆ ಸಿದ್ಧ</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--mid)', marginTop: '2px' }}>{result.summary}</div>
                  </div>
                  <div style={{ marginLeft: 'auto', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--green)' }}>{result.aiConfidence}%</div>
                    <div style={{ fontSize: '0.58rem', color: 'var(--light)' }}>AI Confidence</div>
                  </div>
                </div>
                <div className="pred-grid">
                  <div className="pred-item"><div className="pv g">{result.topCrops?.[0]?.yieldPerAcre || '15 Qt'}</div><div className="pl">Yield/Acre · ಇಳುವರಿ</div></div>
                  <div className="pred-item"><div className="pv gld">₹{(result.topCrops?.[0]?.profitPerAcre / 1000).toFixed(0)}K</div><div className="pl">Profit/Acre · ಲಾಭ</div></div>
                  <div className="pred-item"><div className="pv g">{result.topCrops?.[0]?.waterRequirement}</div><div className="pl">Water Need</div></div>
                  <div className="pred-item"><div className="pv">{result.topCrops?.[0]?.risk}</div><div className="pl">Risk · ಅಪಾಯ</div></div>
                </div>
                {result.weatherForecast && (
                  <div style={{ marginTop: '10px', fontSize: '0.75rem', color: 'var(--blue)', background: 'rgba(21,101,192,.06)', padding: '8px', borderRadius: '8px' }}>
                    🌤 {result.weatherForecast}
                  </div>
                )}
              </div>

              <div className="sec-head"><span className="sec-title">🏆 Top Recommendations · ಶಿಫಾರಸುಗಳು</span></div>
              {result.topCrops?.map((c, idx) => (
                <div className="cr-card" key={c.name} style={{ borderLeftColor: idx === 0 ? 'var(--orange)' : idx === 1 ? 'var(--blue)' : 'var(--green)' }}>
                  <span className="cr-icon">{c.icon}</span>
                  <div className="cr-info">
                    <div className="cr-name">{c.name}</div>
                    <div className="cr-kn">{c.kannadaName} · ₹{(c.profitPerAcre / 1000).toFixed(0)}K/acre</div>
                    <div className="yb-bg"><div className="yb-fill" style={{ width: `${c.aiScore}%`, background: idx === 0 ? 'linear-gradient(90deg,var(--orange),#FFA726)' : idx === 1 ? 'linear-gradient(90deg,var(--blue),#42A5F5)' : 'linear-gradient(90deg,var(--green),#66BB6A)' }} /></div>
                    <div className="cr-chips">
                      <span className="chip" style={{ background: `${getRiskClass(c.risk)}22`, color: getRiskClass(c.risk), border: `1px solid ${getRiskClass(c.risk)}44` }}>Risk: {c.risk}</span>
                      <span className="chip chip-b">Yield: {c.yieldPerAcre}</span>
                      <span className="chip chip-gld">{c.msPrice}</span>
                    </div>
                    {c.advice && <div style={{ fontSize: '0.69rem', color: 'var(--mid)', marginTop: '5px', lineHeight: 1.4 }}>💡 {c.advice}</div>}
                  </div>
                  <div className="cr-rank">
                    <div className={`rk rk${idx + 1}`}>{idx + 1}</div>
                    <div style={{ fontSize: '0.6rem', color: idx === 0 ? 'var(--orange)' : idx === 1 ? 'var(--blue)' : 'var(--green)' }}>{idx === 0 ? '★ Best' : idx === 1 ? 'Good' : 'Safe'}</div>
                  </div>
                </div>
              ))}

              {result.generalAdvice && (
                <div className="card" style={{ borderLeft: '4px solid var(--blue)', marginTop: '4px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: '6px' }}>💡 AI Farm Strategy</div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--mid)', lineHeight: 1.5 }}>{result.generalAdvice}</div>
                </div>
              )}

              {/* Ask AI button */}
              <button
                onClick={() => { setTab('chat'); sendMessage(`I need detailed advice about ${result.topCrops?.[0]?.name} farming in ${form.district} district with ${form.soilType.split('·')[0].trim()} soil.`); }}
                style={{ marginTop: '12px', width: '100%', padding: '10px', background: 'linear-gradient(135deg, #1565C0, #1E88E5)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
              >
                💬 Chat with AI about these crops →
              </button>
            </div>
          )}
        </>
      )}

      {/* ── TAB: AI CHAT ─────────────────────────────────────────────────────────── */}
      {tab === 'chat' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Quick questions */}
          <div>
            <div style={{ fontSize: '0.72rem', color: '#757575', fontWeight: 600, marginBottom: '8px' }}>Quick Questions:</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {QUICK_QUESTIONS.map(q => (
                <button key={q} onClick={() => sendMessage(q)} style={{
                  background: '#E3F2FD', color: '#1565C0', border: '1px solid #BBDEFB',
                  borderRadius: '20px', padding: '4px 10px', fontSize: '0.68rem', cursor: 'pointer',
                  fontWeight: 500, transition: 'all 0.2s'
                }}>
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Chat window */}
          <div style={{
            background: '#FAFAFA', borderRadius: '14px', border: '1px solid #E0E0E0',
            minHeight: '320px', maxHeight: '400px', overflowY: 'auto',
            padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px'
          }}>
            {chatMessages.map((msg, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', gap: '8px', alignItems: 'flex-end' }}>
                {msg.role === 'assistant' && (
                  <div style={{ width: '28px', height: '28px', background: 'linear-gradient(135deg,#1565C0,#1E88E5)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', flexShrink: 0 }}>🤖</div>
                )}
                <div style={{
                  maxWidth: '80%', padding: '10px 13px', borderRadius: msg.role === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                  background: msg.role === 'user' ? 'linear-gradient(135deg,#1565C0,#1E88E5)' : '#fff',
                  color: msg.role === 'user' ? '#fff' : '#212121',
                  fontSize: '0.8rem', lineHeight: 1.55,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  border: msg.role === 'assistant' ? '1px solid #E0E0E0' : 'none'
                }}>
                  {msg.imageBase64 && (
                    <img src={`data:${msg.imageMimeType || 'image/jpeg'};base64,${msg.imageBase64}`} alt="Crop" style={{ width: '100%', borderRadius: '8px', marginBottom: '8px', maxHeight: '150px', objectFit: 'cover' }} />
                  )}
                  <div dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
                  {msg.fromAI !== undefined && (
                    <div style={{ fontSize: '0.6rem', opacity: 0.6, marginTop: '4px' }}>
                      {msg.fromAI ? '✓ Gemini AI' : '✓ Demo Mode'}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                <div style={{ width: '28px', height: '28px', background: 'linear-gradient(135deg,#1565C0,#1E88E5)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>🤖</div>
                <div style={{ background: '#fff', border: '1px solid #E0E0E0', borderRadius: '4px 16px 16px 16px', padding: '10px 14px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#1565C0', animation: `bounce 1s ease-in-out ${i * 0.15}s infinite` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(chatInput)}
              placeholder="Ask anything about farming... ಯಾವುದೇ ಪ್ರಶ್ನೆ"
              style={{
                flex: 1, padding: '12px 14px', border: '2px solid #E0E0E0', borderRadius: '12px',
                fontSize: '0.85rem', outline: 'none', fontFamily: 'Poppins, sans-serif',
                transition: 'border-color 0.2s'
              }}
              onFocus={e => e.target.style.borderColor = '#1565C0'}
              onBlur={e => e.target.style.borderColor = '#E0E0E0'}
            />
            <button
              onClick={() => sendMessage(chatInput)}
              disabled={chatLoading || !chatInput.trim()}
              style={{
                padding: '12px 16px', background: chatInput.trim() ? 'linear-gradient(135deg,#1565C0,#1E88E5)' : '#E0E0E0',
                color: chatInput.trim() ? '#fff' : '#9E9E9E', border: 'none', borderRadius: '12px', cursor: chatInput.trim() ? 'pointer' : 'not-allowed',
                fontSize: '1.1rem', transition: 'all 0.2s', fontWeight: 700
              }}
            >
              ➤
            </button>
          </div>
          <div style={{ fontSize: '0.68rem', color: '#9E9E9E', textAlign: 'center' }}>
            💡 Tip: Switch to "Image AI" tab to upload a crop photo for visual analysis
          </div>
        </div>
      )}

      {/* ── TAB: IMAGE AI ────────────────────────────────────────────────────────── */}
      {tab === 'image' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ background: 'linear-gradient(135deg, #E8F5E9, #C8E6C9)', padding: '12px', borderRadius: '12px', fontSize: '0.78rem', color: '#1B5E20', fontWeight: 500 }}>
            📸 <strong>Upload a photo</strong> of your crop (leaves, stem, fruit) and AI will diagnose diseases, pests, and nutrient deficiencies instantly!
          </div>

          {/* Upload Area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '2px dashed #BBDEFB', borderRadius: '14px', padding: '28px 16px',
              textAlign: 'center', cursor: 'pointer', background: imagePreview ? 'transparent' : '#F3F9FF',
              transition: 'all 0.2s', position: 'relative', minHeight: '180px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
            }}
            onMouseOver={e => { if (!imagePreview) e.currentTarget.style.background = '#E3F2FD'; }}
            onMouseOut={e => { if (!imagePreview) e.currentTarget.style.background = '#F3F9FF'; }}
          >
            {imagePreview ? (
              <img src={imagePreview} alt="Crop preview" style={{ maxWidth: '100%', maxHeight: '220px', borderRadius: '10px', objectFit: 'contain' }} />
            ) : (
              <>
                <div style={{ fontSize: '3rem', marginBottom: '10px' }}>📷</div>
                <div style={{ fontWeight: 700, color: '#1565C0', fontSize: '0.9rem' }}>Tap to upload crop photo</div>
                <div style={{ fontSize: '0.72rem', color: '#757575', marginTop: '6px' }}>Supports JPG, PNG, HEIC · Max 10MB</div>
                <div style={{ fontSize: '0.68rem', color: '#9E9E9E', marginTop: '4px' }}>📱 Use camera for best results</div>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file" accept="image/*" capture="environment"
              onChange={handleImageSelect}
              style={{ display: 'none' }}
            />
          </div>

          {imagePreview && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={analyzeCropImage}
                disabled={imageLoading}
                className="btn-green"
                style={{ flex: 1, margin: 0 }}
              >
                {imageLoading ? <><span className="ai-spinner" />Analyzing with Gemini Vision...</> : '🔬 Analyze Crop · ಬೆಳೆ ವಿಶ್ಲೇಷಿಸಿ'}
              </button>
              <button onClick={() => { setImagePreview(null); setImageFile(null); setImageResult(null); }} style={{ padding: '10px 14px', background: '#FFEBEE', color: '#C62828', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 700 }}>✕</button>
            </div>
          )}

          {/* Image Analysis Result */}
          {imageResult && !imageResult.error && (
            <div style={{ background: '#fff', border: '1px solid #E0E0E0', borderRadius: '14px', overflow: 'hidden' }}>
              <div style={{ background: 'linear-gradient(135deg, #1565C0, #1E88E5)', padding: '12px 14px', color: '#fff' }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>🔬 AI Analysis Result</div>
                <div style={{ fontSize: '0.7rem', opacity: 0.85 }}>Confidence: {imageResult.confidence}%</div>
              </div>
              <div style={{ padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#757575' }}>Crop Identified</div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1565C0' }}>{imageResult.cropIdentified}</div>
                  </div>
                  <span style={{
                    padding: '4px 12px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700,
                    background: imageResult.urgencyLevel === 'Low' ? '#E8F5E9' : imageResult.urgencyLevel === 'Medium' ? '#FFF3E0' : '#FFEBEE',
                    color: imageResult.urgencyLevel === 'Low' ? '#2E7D32' : imageResult.urgencyLevel === 'Medium' ? '#E65100' : '#C62828'
                  }}>
                    {imageResult.urgencyLevel} Urgency
                  </span>
                </div>

                <div style={{ background: '#F5F5F5', borderRadius: '10px', padding: '10px', marginBottom: '12px' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#424242', marginBottom: '4px' }}>Health Status</div>
                  <div style={{ fontSize: '0.8rem', color: '#616161' }}>{imageResult.healthStatus}</div>
                </div>

                {imageResult.detectedIssues?.length > 0 && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#F44336', marginBottom: '6px' }}>⚠️ Detected Issues</div>
                    {imageResult.detectedIssues.map((issue, i) => (
                      <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', marginBottom: '4px' }}>
                        <span style={{ color: '#F44336', fontSize: '0.8rem', flexShrink: 0 }}>•</span>
                        <span style={{ fontSize: '0.78rem', color: '#616161' }}>{issue}</span>
                      </div>
                    ))}
                  </div>
                )}

                {imageResult.recommendations?.length > 0 && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#4CAF50', marginBottom: '6px' }}>✅ Recommendations</div>
                    {imageResult.recommendations.map((rec, i) => (
                      <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', marginBottom: '4px' }}>
                        <span style={{ color: '#4CAF50', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                        <span style={{ fontSize: '0.78rem', color: '#616161' }}>{rec}</span>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={sendImageToChat}
                  style={{ width: '100%', padding: '10px', background: 'linear-gradient(135deg,#1565C0,#1E88E5)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}
                >
                  💬 Ask AI more about this crop →
                </button>
              </div>
            </div>
          )}

          {imageResult?.error && (
            <div style={{ background: '#FFEBEE', border: '1px solid #FFCDD2', borderRadius: '12px', padding: '14px', color: '#C62828', fontSize: '0.82rem' }}>
              ⚠️ {imageResult.error}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </>
  );
}
