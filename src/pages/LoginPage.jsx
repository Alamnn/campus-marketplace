import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, ArrowLeft, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { 
  login, 
  loginWithPassword, 
  validateEmail, 
  userExists, 
  getUser 
} from '../services/marketplaceStore';

export default function LoginPage({ onLogin }) {
  const nav = useNavigate();
  const [authMethod, setAuthMethod] = useState('password'); // 'password' | 'otp'
  
  // Password login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // OTP login state
  const [step, setStep] = useState('email'); // 'email' | 'otp'
  const [otp, setOtp] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [otpTimer, setOtpTimer] = useState(0);
  const [timerInterval, setTimerInterval] = useState(null);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const startTimer = () => {
    setOtpTimer(60);
    const iv = setInterval(() => {
      setOtpTimer(t => {
        if (t <= 1) { clearInterval(iv); return 0; }
        return t - 1;
      });
    }, 1000);
    setTimerInterval(iv);
  };

  // 1. Password-based Login
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setError('');
    const trimmedEmail = email.trim().toLowerCase();
    const v = validateEmail(trimmedEmail);
    if (!v.ok) {
      setError(v.msg);
      return;
    }

    if (!userExists(trimmedEmail)) {
      setError(`No account found for "${trimmedEmail}". Redirecting to sign up...`);
      setTimeout(() => {
        nav(`/register?email=${encodeURIComponent(trimmedEmail)}`);
      }, 1500);
      return;
    }

    setLoading(true);

    try {
      const user = loginWithPassword(trimmedEmail, password);
      onLogin(user);
      nav('/');
    } catch (err) {
      setError(err.message || 'Incorrect credentials.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Email OTP Login: Send code
  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError('');
    const trimmed = email.trim().toLowerCase();
    const v = validateEmail(trimmed);
    if (!v.ok) {
      setError(v.msg);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, action: 'login' })
      }).catch(() => null);

      const data = await res?.json().catch(() => null);

      if (!res || !res.ok || !data?.delivered) {
        throw new Error(data?.message || 'Could not send verification code to this inbox. Please sign in with your password.');
      }

      if (data?.verificationToken) {
        setVerificationToken(data.verificationToken);
      }

      setStep('otp');
      startTimer();
    } catch (err) {
      setError(err.message || 'Unable to dispatch verification code. Please sign in with your password.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Email OTP Login: Verify code
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const trimmed = email.trim().toLowerCase();
    const code = otp.trim();

    try {
      const res = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, code, token: verificationToken })
      }).catch(() => null);

      const data = await res?.json().catch(() => null);

      if (!res || !res.ok || !data?.valid) {
        throw new Error(data?.message || 'Incorrect or expired verification code. Please try again.');
      }

      const user = login(trimmed);
      onLogin(user);
      nav('/');
    } catch (err) {
      setError(err.message || 'Verification failed. Please try again.');
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

        {/* Method Switcher Tabs */}
        {step === 'email' && (
          <div style={{
            display: 'flex',
            background: '#F1F5F9',
            borderRadius: '10px',
            padding: '4px',
            marginBottom: '20px'
          }}>
            <button
              type="button"
              onClick={() => { setAuthMethod('password'); setError(''); }}
              style={{
                flex: 1,
                padding: '8px 12px',
                border: 'none',
                borderRadius: '8px',
                background: authMethod === 'password' ? '#ffffff' : 'transparent',
                color: authMethod === 'password' ? '#0D2C6C' : '#64748B',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: authMethod === 'password' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              Password
            </button>
            <button
              type="button"
              onClick={() => { setAuthMethod('otp'); setError(''); }}
              style={{
                flex: 1,
                padding: '8px 12px',
                border: 'none',
                borderRadius: '8px',
                background: authMethod === 'otp' ? '#ffffff' : 'transparent',
                color: authMethod === 'otp' ? '#0D2C6C' : '#64748B',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: authMethod === 'otp' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              Email Code (OTP)
            </button>
          </div>
        )}

        {/* Header Title */}
        <div className="auth-clean-header">
          <h1>Sign In</h1>
          <p>
            {authMethod === 'password'
              ? 'Enter your campus email and password to access your account'
              : 'Sign in with a one-time verification code sent to your email'}
          </p>
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

        {/* Form 1: Password Login */}
        {authMethod === 'password' ? (
          <form onSubmit={handlePasswordLogin} className="auth-clean-form">
            <div className="auth-clean-field">
              <label htmlFor="login-email" className="auth-clean-label">University / Campus Email</label>
              <div className="auth-clean-input-wrap">
                <Mail size={18} className="auth-clean-input-icon" />
                <input
                  id="login-email"
                  className="auth-clean-input"
                  type="email"
                  placeholder="student@university.edu"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoFocus
                  required
                />
              </div>
            </div>

            <div className="auth-clean-field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="login-password" className="auth-clean-label">Password</label>
                <Link
                  to="/forgot-password"
                  style={{ fontSize: '0.785rem', color: '#0D2C6C', fontWeight: 600, textDecoration: 'none' }}
                >
                  Forgot password?
                </Link>
              </div>
              <div className="auth-clean-input-wrap">
                <Lock size={18} className="auth-clean-input-icon" />
                <input
                  id="login-password"
                  className="auth-clean-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
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

            <button type="submit" className="auth-clean-btn-primary" disabled={loading}>
              {loading ? <span>Signing in…</span> : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        ) : step === 'email' ? (
          /* Form 2: Email OTP Login - Step 1 */
          <form onSubmit={handleSendOTP} className="auth-clean-form">
            <div className="auth-clean-field">
              <label htmlFor="otp-email" className="auth-clean-label">University / Campus Email</label>
              <div className="auth-clean-input-wrap">
                <Mail size={18} className="auth-clean-input-icon" />
                <input
                  id="otp-email"
                  className="auth-clean-input"
                  type="email"
                  placeholder="student@university.edu"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <span className="auth-clean-hint">A 6-digit verification code will be dispatched to your inbox.</span>
            </div>

            <button type="submit" className="auth-clean-btn-primary" disabled={loading}>
              {loading ? <span>Sending code…</span> : (
                <>
                  <span>Send Verification Code</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        ) : (
          /* Form 2: Email OTP Login - Step 2 (6-digit code entry) */
          <div>
            <div className="auth-clean-alert auth-clean-alert-success">
              <CheckCircle2 size={16} />
              <span>Verification code sent to <strong>{email}</strong>. Check your inbox.</span>
            </div>

            <form onSubmit={handleVerifyOTP} className="auth-clean-form">
              <div className="auth-clean-field">
                <label htmlFor="otp-input" className="auth-clean-label">Enter 6-Digit Code</label>
                <input
                  id="otp-input"
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
              </div>

              <button type="submit" className="auth-clean-btn-primary" disabled={loading || otp.length !== 6}>
                {loading ? <span>Verifying…</span> : <span>Verify & Sign In</span>}
              </button>
            </form>

            <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '0.8125rem', color: '#64748B' }}>
              Didn't receive code?{' '}
              <button
                type="button"
                onClick={handleSendOTP}
                disabled={loading || otpTimer > 0}
                style={{
                  background: 'none',
                  border: 'none',
                  color: otpTimer > 0 ? '#94A3B8' : '#0D2C6C',
                  fontWeight: 600,
                  cursor: otpTimer > 0 ? 'default' : 'pointer',
                  padding: 0
                }}
              >
                {otpTimer > 0 ? `Resend code in ${otpTimer}s` : 'Resend Code'}
              </button>
            </div>

            <button
              type="button"
              className="auth-clean-btn-back"
              onClick={() => { setStep('email'); setOtp(''); setError(''); }}
            >
              <ArrowLeft size={15} />
              <span>Use different email or switch to password</span>
            </button>
          </div>
        )}


        <div className="auth-clean-footer">
          Don't have an account? <Link to="/register">Create an account</Link>
        </div>
      </div>
    </div>
  );
}
