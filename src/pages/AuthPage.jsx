import React, { useState, useEffect } from 'react';
import './AuthPage.css';
import { apiUrl } from '../lib/api';

// Toast notification component
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  return <div className={`toast ${type}`}>{message}</div>;
}

export default function AuthPage({ onLogin }) {
  const [role, setRole] = useState(null); // 'farmer' | 'buyer'
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [step, setStep] = useState(1); // signup steps 1-4
  const [toast, setToast] = useState(null);

  // Login fields
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Signup fields
  const [phone, setPhone] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [digiData, setDigiData] = useState(null);
  const [demoOtp, setDemoOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const showToast = (message, type = 'info') => setToast({ message, type });

  const postJson = async (path, payload) => {
    const res = await fetch(apiUrl(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const raw = await res.text();
    if (!raw) return { res, data: {} };
    try {
      return { res, data: JSON.parse(raw) };
    } catch {
      return { res, data: { error: raw } };
    }
  };

  const postJsonWithFallback = async (paths, payload) => {
    for (let i = 0; i < paths.length; i++) {
      const result = await postJson(paths[i], payload);
      if (result.res.ok || result.res.status !== 404 || i === paths.length - 1) return result;
    }
    return { res: { ok: false, status: 500 }, data: { error: 'Request failed' } };
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginPhone || !loginPass) return showToast('Enter phone and password', 'error');
    setLoginLoading(true);
    try {
      const res = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: loginPhone, password: loginPass })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(`Welcome back, ${data.user.name}! 🌾`, 'success');
      setTimeout(() => onLogin(data.user, data.token), 800);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoginLoading(false);
    }
  };

  const sendOtp = async () => {
    if (!phone || phone.length !== 10) return showToast('Enter valid 10-digit phone number', 'error');
    if (!aadhaar || aadhaar.length !== 12) return showToast('Enter valid 12-digit Aadhaar number', 'error');
    setLoading(true);
    try {
      const { res, data } = await postJsonWithFallback(
        ['/api/auth/send-otp', '/api/auth/digilocker/send-otp'],
        { phone, aadhaar, role }
      );
      if (!res.ok) throw new Error(data.error || data.message || `Unable to send OTP (${res.status})`);
      setDemoOtp(data.demoOtp || '');
      const toastMsg = data.demoOtp
        ? `OTP sent to +91-XXXXXX${phone.slice(-4)} | Demo OTP: ${data.demoOtp}`
        : `OTP sent to +91-XXXXXX${phone.slice(-4)}`;
      showToast(toastMsg, 'success');
      setStep(3);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    const otp = otpDigits.join('');
    if (otp.length !== 6) return showToast('Enter complete 6-digit OTP', 'error');
    setLoading(true);
    try {
      const { res, data } = await postJsonWithFallback(
        ['/api/auth/digilocker/verify', '/api/auth/verify-otp'],
        { phone, otp }
      );
      if (!res.ok) throw new Error(data.error || data.message || `Unable to verify OTP (${res.status})`);

      let resolvedDigiData = data.data;
      if (!resolvedDigiData) {
        resolvedDigiData = role === 'farmer'
          ? {
              name: `Farmer ${phone.slice(-4)}`,
              district: 'Karnataka',
              land: 'Self-declared',
              landOwnershipDoc: 'Pending verification',
              type: 'farmer_data'
            }
          : {
              name: `Buyer ${phone.slice(-4)}`,
              city: 'Karnataka',
              business: 'Verified Buyer',
              gst: 'Pending',
              gstn: 'Pending',
              type: 'buyer_data'
            };
      }
      if (!resolvedDigiData.aadhaarMasked) resolvedDigiData.aadhaarMasked = `XXXX-XXXX-${aadhaar.slice(-4)}`;
      if (!resolvedDigiData.role) resolvedDigiData.role = role;
      if (resolvedDigiData.gstn && !resolvedDigiData.gst) resolvedDigiData.gst = resolvedDigiData.gstn;

      setDigiData(resolvedDigiData);
      showToast('✅ DigiLocker verified successfully!', 'success');
      setStep(4);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const completeSignup = async () => {
    if (!password || password.length < 6) return showToast('Password must be at least 6 characters', 'error');
    if (password !== confirmPass) return showToast('Passwords do not match', 'error');
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/auth/signup'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone, password, role,
          name: digiData.name,
          district: digiData.district || digiData.city,
          aadhaarMasked: digiData.aadhaarMasked,
          digilockerData: digiData
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(`🎉 Welcome to Namma Raitha, ${data.user.name}!`, 'success');
      setTimeout(() => onLogin(data.user, data.token), 1000);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpInput = (val, idx) => {
    const next = [...otpDigits];
    next[idx] = val.replace(/\D/g, '').slice(-1);
    setOtpDigits(next);
    if (val && idx < 5) {
      document.getElementById(`otp-${idx + 1}`)?.focus();
    }
  };

  const handleOtpKey = (e, idx) => {
    if (e.key === 'Backspace' && !otpDigits[idx] && idx > 0) {
      document.getElementById(`otp-${idx - 1}`)?.focus();
    }
  };

  // Role selection landing
  if (!role) {
    return (
      <div className="auth-bg">
        {toast && <Toast {...toast} onClose={() => setToast(null)} />}
        <div className="auth-splash">
          <div className="splash-logo">🌾</div>
          <h1 className="splash-title">Namma Raitha</h1>
          <p className="splash-kn">ನಮ್ಮ ರೈತ — Karnataka's Smart Farm Platform</p>
          <div className="role-card">
            <h3 className="role-card-title">Who are you? · ನೀವು ಯಾರು?</h3>
            <p className="role-card-sub">Select your role to continue</p>
            <div className="role-btns">
              <button className="role-btn farmer" onClick={() => setRole('farmer')}>
                <span className="role-btn-icon">👨‍🌾</span>
                <span>I am a Farmer</span>
                <span className="role-btn-kn">ರೈತ</span>
              </button>
              <button className="role-btn buyer" onClick={() => setRole('buyer')}>
                <span className="role-btn-icon">🏪</span>
                <span>I am a Buyer</span>
                <span className="role-btn-kn">ಖರೀದಿದಾರ</span>
              </button>
            </div>
          </div>
          <div className="auth-floating">
            <span>🌾</span><span>🌽</span><span>☕</span><span>🌶</span>
            <span>🌻</span><span>🥥</span><span>🌾</span><span>🍅</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-bg">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <div className="auth-container">

        {/* Header */}
        <div className="auth-header" style={{ background: role === 'farmer' ? 'linear-gradient(135deg,#2E7D32,#1B5E20)' : 'linear-gradient(135deg,#0D47A1,#1565C0)' }}>
          <button className="auth-back" onClick={() => { setRole(null); setStep(1); setMode('login'); }}>← Back</button>
          <div className="auth-header-logo">{role === 'farmer' ? '👨‍🌾' : '🏪'}</div>
          <div className="auth-header-title">Namma Raitha</div>
          <div className="auth-header-sub">{role === 'farmer' ? 'Farmer Portal · ರೈತ ಪೋರ್ಟಲ್' : 'Buyer Portal · ಖರೀದಿದಾರ ಪೋರ್ಟಲ್'}</div>
        </div>

        {/* Tabs */}
        <div className="auth-tabs">
          <button className={`auth-tab ${mode === 'login' ? 'active' : ''}`} onClick={() => { setMode('login'); setStep(1); }} >
            🔑 Login
          </button>
          <button className={`auth-tab ${mode === 'signup' ? 'active' : ''}`} onClick={() => { setMode('signup'); setStep(1); }} >
            ✨ Sign Up
          </button>
        </div>

        {/* ── LOGIN ── */}
        {mode === 'login' && (
          <form className="auth-form" onSubmit={handleLogin}>
            <div className="auth-form-title">
              Welcome Back!
              <div className="auth-form-sub">Login with your phone number</div>
            </div>
            <div className="auth-field">
              <label>📱 Phone Number</label>
              <div className="phone-input-wrap">
                <span className="phone-prefix">+91</span>
                <input
                  type="tel" maxLength={10} placeholder="10-digit mobile number"
                  value={loginPhone}
                  onChange={e => setLoginPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="phone-input"
                  required
                />
              </div>
            </div>
            <div className="auth-field">
              <label>🔒 Password</label>
              <div className="pass-wrap">
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={loginPass}
                  onChange={e => setLoginPass(e.target.value)}
                  className="inp"
                  style={{ marginBottom: 0 }}
                  required
                />
                <button type="button" className="show-pass" onClick={() => setShowPass(!showPass)}>
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
            </div>
            <button type="submit" className="auth-submit-btn" style={{ background: role === 'farmer' ? '#2E7D32' : '#1565C0' }} disabled={loginLoading}>
              {loginLoading ? '⏳ Logging in...' : '→ Login to ' + (role === 'farmer' ? 'Farmer' : 'Buyer') + ' Dashboard'}
            </button>
            <p className="auth-switch">
              Don't have an account?{' '}
              <button type="button" onClick={() => setMode('signup')} className="auth-switch-link">Sign Up with DigiLocker</button>
            </p>
          </form>
        )}

        {/* ── SIGNUP ── */}
        {mode === 'signup' && (
          <div className="auth-form">
            {/* Progress Steps */}
            <div className="signup-progress">
              {['Role', 'Aadhaar', 'OTP Verify', 'Set Password'].map((s, i) => (
                <div key={i} className={`progress-step ${step > i + 1 ? 'done' : step === i + 1 ? 'active' : ''}`}>
                  <div className="prog-circle">{step > i + 1 ? '✓' : i + 1}</div>
                  <div className="prog-label">{s}</div>
                </div>
              ))}
            </div>

            {/* Step 1: Phone */}
            {step === 1 && (
              <div>
                <div className="auth-form-title">
                  Step 1: Phone Number
                  <div className="auth-form-sub">Enter your mobile number to begin</div>
                </div>
                <div className="auth-field">
                  <label>📱 Mobile Number</label>
                  <div className="phone-input-wrap">
                    <span className="phone-prefix">+91</span>
                    <input
                      type="tel" maxLength={10} placeholder="10-digit mobile number"
                      value={phone}
                      onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="phone-input"
                    />
                  </div>
                </div>
                <div className="digi-info-box">
                  <span className="digi-info-icon">🔵</span>
                  <div>
                    <div className="digi-info-title">DigiLocker Verification Required</div>
                    <div className="digi-info-desc">
                      {role === 'farmer'
                        ? 'You need to verify with your Aadhaar linked to DigiLocker. This ensures only genuine farmers register on the platform.'
                        : 'Buyers must verify identity via Aadhaar/DigiLocker for secure trading. Your GST details from DigiLocker will be auto-filled.'}
                    </div>
                  </div>
                </div>
                <button className="auth-submit-btn" style={{ background: role === 'farmer' ? '#2E7D32' : '#1565C0' }}
                  onClick={() => { if (phone.length === 10) setStep(2); else showToast('Enter valid 10-digit phone number', 'error'); }}>
                  Continue →
                </button>
              </div>
            )}

            {/* Step 2: DigiLocker Aadhaar */}
            {step === 2 && (
              <div>
                <div className="auth-form-title">
                  Step 2: DigiLocker Verification
                  <div className="auth-form-sub">Verify identity with Aadhaar</div>
                </div>
                <div className="digilocker-card">
                  <div className="digi-header">
                    <div className="digi-logo">
                      <span className="digi-logo-icon">🔵</span>
                      <div>
                        <div className="digi-logo-title">DigiLocker</div>
                        <div className="digi-logo-sub">Ministry of Electronics & IT, Govt. of India</div>
                      </div>
                    </div>
                    <div className="digi-badge">🔒 Secure</div>
                  </div>
                  <div className="digi-divider" />
                  <div className="digi-body">
                    <p className="digi-consent">
                      By verifying, you consent to share your Aadhaar details with Namma Raitha platform as per <strong>DPDP Act 2023</strong>.
                    </p>
                    <div className="auth-field">
                      <label>🪪 Aadhaar Number (12 digits)</label>
                      <input
                        type="text" maxLength={12} placeholder="XXXX XXXX XXXX"
                        value={aadhaar}
                        onChange={e => setAadhaar(e.target.value.replace(/\D/g, '').slice(0, 12))}
                        className="inp aadhaar-input"
                        style={{ letterSpacing: '0.15em', fontFamily: 'monospace', fontSize: '1.1rem' }}
                      />
                    </div>
                    <div className="digi-features">
                      <span>✅ 100% Secure</span>
                      <span>✅ Govt. Verified</span>
                      <span>✅ Instant</span>
                    </div>
                    <button className="digi-verify-btn" onClick={sendOtp} disabled={loading}>
                      {loading ? '⏳ Sending...' : '🔵 Verify with DigiLocker — OTP to Phone'}
                    </button>
                  </div>
                </div>
                <button className="auth-back-step" onClick={() => setStep(1)}>← Back</button>
              </div>
            )}

            {/* Step 3: OTP */}
            {step === 3 && (
              <div>
                <div className="auth-form-title">
                  Step 3: Enter OTP
                  <div className="auth-form-sub">6-digit OTP sent to +91-XXXXXX{phone.slice(-4)}</div>
                </div>
                {demoOtp && (
                  <div className="demo-otp-box">
                    <span>📱 Demo Mode — Your OTP: <strong>{demoOtp}</strong></span>
                  </div>
                )}
                <div className="otp-grid">
                  {otpDigits.map((d, i) => (
                    <input
                      key={i}
                      id={`otp-${i}`}
                      type="text" maxLength={1}
                      value={d}
                      onChange={e => handleOtpInput(e.target.value, i)}
                      onKeyDown={e => handleOtpKey(e, i)}
                      className="otp-box"
                    />
                  ))}
                </div>
                <div className="otp-actions">
                  <button className="auth-submit-btn" style={{ background: role === 'farmer' ? '#2E7D32' : '#1565C0' }}
                    onClick={verifyOtp} disabled={loading}>
                    {loading ? '⏳ Verifying...' : '✅ Verify Aadhaar OTP'}
                  </button>
                  <button className="resend-otp" onClick={() => { setStep(2); setOtpDigits(['', '', '', '', '', '']); }}>
                    Resend OTP
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Set Password */}
            {step === 4 && digiData && (
              <div>
                <div className="auth-form-title">
                  Step 4: Complete Registration
                  <div className="auth-form-sub">DigiLocker verified · Set your password</div>
                </div>
                <div className="verified-user-card">
                  <div className="verified-badge">✅ Aadhaar Verified via DigiLocker</div>
                  <div className="verified-name">{digiData.name}</div>
                  <div className="verified-details">
                    {role === 'farmer' ? (
                      <>
                        <span>📍 {digiData.district}, Karnataka</span>
                        <span>🌾 {digiData.land}</span>
                        <span>🪪 {digiData.aadhaarMasked}</span>
                      </>
                    ) : (
                      <>
                        <span>🏢 {digiData.business}</span>
                        <span>📍 {digiData.city}</span>
                        <span>📋 GST: {digiData.gst}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="auth-field">
                  <label>🔒 Set Password (min 6 characters)</label>
                  <div className="pass-wrap">
                    <input
                      type={showPass ? 'text' : 'password'}
                      placeholder="Create a strong password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="inp" style={{ marginBottom: 0 }}
                    />
                    <button type="button" className="show-pass" onClick={() => setShowPass(!showPass)}>
                      {showPass ? '🙈' : '👁'}
                    </button>
                  </div>
                </div>
                <div className="auth-field" style={{ marginTop: '8px' }}>
                  <label>🔒 Confirm Password</label>
                  <input
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPass}
                    onChange={e => setConfirmPass(e.target.value)}
                    className="inp"
                    style={{ marginBottom: 0 }}
                  />
                </div>
                <button className="auth-submit-btn" style={{ background: role === 'farmer' ? '#2E7D32' : '#1565C0', marginTop: '16px' }}
                  onClick={completeSignup} disabled={loading}>
                  {loading ? '⏳ Creating Account...' : '🎉 Create Account & Enter Dashboard'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
