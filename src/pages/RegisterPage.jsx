import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, User, IdCard, GraduationCap, MapPin, Phone, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { register, validateEmail, userExists, getUser } from '../services/marketplaceStore';
import { FACULTIES, CAMPUSES } from '../data/seedData';

export default function RegisterPage({ onLogin }) {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const initialEmail = searchParams.get('email') || '';

  const [step, setStep] = useState('form'); // 'form' | 'otp'
  const [form, setForm] = useState({
    fullName: '',
    email: initialEmail,
    studentId: '',
    password: '',
    confirmPassword: '',
    faculty: 'FOEBEIT',
    campus: 'Kota Damansara',
    whatsapp: ''
  });

  const [otp, setOtp] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [otpTimer, setOtpTimer] = useState(0);
  const [timerInterval, setTimerInterval] = useState(null);

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);


  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const startTimer = () => {
    setOtpTimer(60);
    if (timerInterval) clearInterval(timerInterval);
    const iv = setInterval(() => {
      setOtpTimer(t => {
        if (t <= 1) { clearInterval(iv); return 0; }
        return t - 1;
      });
    }, 1000);
    setTimerInterval(iv);
  };

  // Step 1: Submit Details & Dispatch Verification Code
  const handleInitiateRegistration = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = form.email.trim().toLowerCase();
    const v = validateEmail(trimmedEmail);
    if (!v.ok) {
      setError(v.msg);
      return;
    }

    if (!form.fullName || form.fullName.trim().length < 2) {
      setError('Please enter your full name.');
      return;
    }

    if (!form.password || form.password.trim().length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    if (userExists(trimmedEmail)) {
      setError(`An account with "${trimmedEmail}" already exists. Please sign in instead.`);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, action: 'register' })
      }).catch(() => null);

      const data = await res?.json().catch(() => null);

      if (!res || !res.ok) {
        throw new Error(data?.message || 'Could not dispatch verification code to this address. Please verify your email.');
      }

      if (data?.verificationToken) {
        setVerificationToken(data.verificationToken);
      }

      setStep('otp');
      startTimer();
    } catch (err) {
      setError(err.message || 'Unable to dispatch verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify Code & Finalize Account Creation
  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (otp.trim().length !== 6) {
      setError('Please enter the 6-digit verification code sent to your email.');
      return;
    }

    setLoading(true);
    const trimmedEmail = form.email.trim().toLowerCase();

    try {
      const res = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail,
          code: otp.trim(),
          token: verificationToken
        })
      }).catch(() => null);

      const data = await res?.json().catch(() => null);

      if (!res || !res.ok || !data?.valid) {
        throw new Error(data?.message || 'Incorrect or expired verification code. Please check your inbox and try again.');
      }

      const user = register({
        fullName: form.fullName.trim(),
        email: trimmedEmail,
        studentId: form.studentId.trim(),
        password: form.password.trim(),
        faculty: form.faculty,
        campus: form.campus,
        whatsapp: form.whatsapp.trim()
      });

      onLogin(user);
      nav('/');
    } catch (err) {
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Resend Verification Code
  const handleResendCode = async () => {
    if (otpTimer > 0) return;
    setError('');
    setLoading(true);
    const trimmedEmail = form.email.trim().toLowerCase();

    try {
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, action: 'register' })
      }).catch(() => null);

      const data = await res?.json().catch(() => null);

      if (!res || !res.ok) {
        throw new Error(data?.message || 'Could not resend code. Please try again later.');
      }

      if (data?.verificationToken) {
        setVerificationToken(data.verificationToken);
      }

      startTimer();
    } catch (err) {
      setError(err.message || 'Failed to resend code.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="auth-clean-container">
      <div className="auth-clean-card">
        {/* Brand Header */}
        <div className="auth-clean-brand">
          <div className="auth-clean-logo">
            <img
              src="/assets/campus-logo.svg"
              alt="Campus Marketplace"
              style={{ height: 42, width: 'auto', objectFit: 'contain' }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
          <div>
            <div className="auth-clean-title">Campus Marketplace</div>
            <div className="auth-clean-subtitle">Peer-to-Peer Campus Commerce</div>
          </div>
        </div>

        {step === 'form' ? (
          <>
            <div className="auth-clean-header">
              <h1>Create an Account</h1>
              <p>Join the verified peer-to-peer campus marketplace</p>
            </div>

            {error && (
              <div className="auth-clean-alert auth-clean-alert-error">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M8 5v3M8 11h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form className="auth-clean-form" onSubmit={handleInitiateRegistration}>
              <div className="auth-clean-field">
                <label className="auth-clean-label" htmlFor="reg-name">Full Name</label>
                <div className="auth-clean-input-wrap">
                  <User size={18} className="auth-clean-input-icon" />
                  <input
                    id="reg-name"
                    className="auth-clean-input"
                    type="text"
                    placeholder="e.g. Danial Haziq"
                    value={form.fullName}
                    onChange={e => update('fullName', e.target.value)}
                    autoFocus
                    required
                  />
                </div>
              </div>

              <div className="auth-clean-field">
                <label className="auth-clean-label" htmlFor="reg-email">University / Campus Email</label>
                <div className="auth-clean-input-wrap">
                  <Mail size={18} className="auth-clean-input-icon" />
                  <input
                    id="reg-email"
                    className="auth-clean-input"
                    type="email"
                    placeholder="student@university.edu"
                    value={form.email}
                    onChange={e => update('email', e.target.value)}
                    required
                  />
                </div>
                <span className="auth-clean-hint">Use your university or institutional email address.</span>
              </div>

              <div className="auth-clean-grid-2">
                <div className="auth-clean-field">
                  <label className="auth-clean-label" htmlFor="reg-password">Password</label>
                  <div className="auth-clean-input-wrap">
                    <Lock size={18} className="auth-clean-input-icon" />
                    <input
                      id="reg-password"
                      className="auth-clean-input"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min 6 characters"
                      value={form.password}
                      onChange={e => update('password', e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        background: 'none',
                        border: 'none',
                        color: '#94A3B8',
                        cursor: 'pointer'
                      }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="auth-clean-field">
                  <label className="auth-clean-label" htmlFor="reg-confirm">Confirm Password</label>
                  <div className="auth-clean-input-wrap">
                    <Lock size={18} className="auth-clean-input-icon" />
                    <input
                      id="reg-confirm"
                      className="auth-clean-input"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Re-enter password"
                      value={form.confirmPassword}
                      onChange={e => update('confirmPassword', e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="auth-clean-field">
                <label className="auth-clean-label" htmlFor="reg-sid">
                  Student / Staff ID <span style={{ color: '#94A3B8', fontWeight: 400 }}>(optional)</span>
                </label>
                <div className="auth-clean-input-wrap">
                  <IdCard size={18} className="auth-clean-input-icon" />
                  <input
                    id="reg-sid"
                    className="auth-clean-input"
                    type="text"
                    placeholder="e.g. STU2024001 (auto-generated if empty)"
                    value={form.studentId}
                    onChange={e => update('studentId', e.target.value)}
                  />
                </div>
              </div>

              <div className="auth-clean-grid-2">
                <div className="auth-clean-field">
                  <label className="auth-clean-label" htmlFor="reg-faculty">Faculty</label>
                  <div className="auth-clean-input-wrap">
                    <GraduationCap size={16} className="auth-clean-input-icon" />
                    <select
                      id="reg-faculty"
                      className="auth-clean-input auth-clean-select"
                      value={form.faculty}
                      onChange={e => update('faculty', e.target.value)}
                    >
                      {FACULTIES.filter(f => f.id !== 'all').map(f => (
                        <option key={f.code} value={f.code}>{f.code} - {f.name.split(',')[0]}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="auth-clean-field">
                  <label className="auth-clean-label" htmlFor="reg-campus">Campus</label>
                  <div className="auth-clean-input-wrap">
                    <MapPin size={16} className="auth-clean-input-icon" />
                    <select
                      id="reg-campus"
                      className="auth-clean-input auth-clean-select"
                      value={form.campus}
                      onChange={e => update('campus', e.target.value)}
                    >
                      {CAMPUSES.filter(c => c.id !== 'all').map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="auth-clean-field">
                <label className="auth-clean-label" htmlFor="reg-wa">
                  WhatsApp Contact <span style={{ color: '#94A3B8', fontWeight: 400 }}>(optional)</span>
                </label>
                <div className="auth-clean-input-wrap">
                  <Phone size={18} className="auth-clean-input-icon" />
                  <input
                    id="reg-wa"
                    className="auth-clean-input"
                    type="tel"
                    placeholder="+6012-3456789"
                    value={form.whatsapp}
                    onChange={e => update('whatsapp', e.target.value)}
                  />
                </div>
                <span className="auth-clean-hint">Facilitates seamless peer buyer-seller meetup coordination on campus.</span>
              </div>

              <button type="submit" className="auth-clean-btn-primary" disabled={loading}>
                {loading ? <span>Sending verification code…</span> : (
                  <>
                    <span>Continue to Verification</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>


            <div className="auth-clean-footer">
              Already have an account? <Link to="/login">Sign in</Link>
            </div>
          </>
        ) : (
          /* Step 2: Verification Code Input */
          <>
            <div className="auth-clean-header">
              <h1>Verify Your Email</h1>
              <p>We've dispatched a 6-digit verification code to <strong>{form.email}</strong>. Enter it below to activate your account.</p>
            </div>

            {error && (
              <div className="auth-clean-alert auth-clean-alert-error">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M8 5v3M8 11h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleVerifyAndRegister} className="auth-clean-form">
              <div className="auth-clean-field">
                <label className="auth-clean-label" htmlFor="reg-otp">6-Digit Verification Code</label>
                <input
                  id="reg-otp"
                  className="auth-clean-input auth-clean-input-otp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="000000"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  autoFocus
                  required
                />
                <span className="auth-clean-hint">Check your student inbox. Code is valid for 10 minutes.</span>
              </div>

              <button type="submit" className="auth-clean-btn-primary" disabled={loading || otp.length !== 6}>
                {loading ? <span>Activating account…</span> : (
                  <>
                    <span>Verify & Create Account</span>
                    <CheckCircle2 size={16} />
                  </>
                )}
              </button>
            </form>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
              <button
                type="button"
                className="auth-clean-btn-back"
                onClick={() => { setStep('form'); setOtp(''); setError(''); }}
                style={{ margin: 0 }}
              >
                <ArrowLeft size={15} />
                <span>Back to edit details</span>
              </button>

              <button
                type="button"
                onClick={handleResendCode}
                disabled={otpTimer > 0 || loading}
                style={{
                  background: 'none',
                  border: 'none',
                  color: otpTimer > 0 ? '#94A3B8' : '#0D2C6C',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: otpTimer > 0 ? 'default' : 'pointer'
                }}
              >
                {otpTimer > 0 ? `Resend code in ${otpTimer}s` : 'Resend Code'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
