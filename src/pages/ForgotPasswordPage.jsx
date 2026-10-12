import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Key, ArrowRight, ArrowLeft, CheckCircle2, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { validateEmail, userExists, resetPassword } from '../services/marketplaceStore';

export default function ForgotPasswordPage() {
  const nav = useNavigate();
  // Steps: 'email' | 'otp' | 'new_password' | 'done'
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 60-second resend timer
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    let interval = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(t => (t <= 1 ? 0 : t - 1));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [resendTimer]);

  const startResendTimer = () => {
    setResendTimer(60);
  };

  // Step 1: Send Reset Verification Code
  const handleSendResetCode = async (e) => {
    e.preventDefault();
    setError('');
    const trimmed = email.trim().toLowerCase();
    const v = validateEmail(trimmed);
    if (!v.ok) {
      setError(v.msg);
      return;
    }

    if (!userExists(trimmed)) {
      setError(`No registered account found for "${trimmed}". Please verify your email or create an account.`);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, action: 'forgot_password' })
      }).catch(() => null);

      const data = await res?.json().catch(() => null);

      if (!res || !res.ok || !data?.delivered) {
        throw new Error(data?.message || 'Could not dispatch password reset code. Please check your connection.');
      }

      if (data?.verificationToken) {
        setVerificationToken(data.verificationToken);
      }

      setStep('otp');
      startResendTimer();
    } catch (err) {
      setError(err.message || 'Failed to dispatch reset code.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify Code
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError('');

    if (otp.trim().length !== 6) {
      setError('Please enter the 6-digit verification code sent to your email.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: otp.trim(),
          token: verificationToken
        })
      }).catch(() => null);

      const data = await res?.json().catch(() => null);
      if (!res || !res.ok || !data?.valid) {
        throw new Error(data?.message || 'Incorrect or expired verification code. Please check your inbox and try again.');
      }

      // Code successfully verified -> proceed to set new password!
      setStep('new_password');
    } catch (err) {
      setError(err.message || 'Verification failed. Please check your code.');
    } finally {
      setLoading(false);
    }
  };

  // Resend Code handler
  const handleResendCode = async () => {
    if (resendTimer > 0) return;
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), action: 'forgot_password' })
      }).catch(() => null);

      const data = await res?.json().catch(() => null);
      if (!res || !res.ok) {
        throw new Error(data?.message || 'Could not resend code. Please try again.');
      }

      if (data?.verificationToken) {
        setVerificationToken(data.verificationToken);
      }

      startResendTimer();
    } catch (err) {
      setError(err.message || 'Failed to resend code.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Save New Password
  const handleSaveNewPassword = (e) => {
    e.preventDefault();
    setError('');

    if (!newPassword || newPassword.trim().length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);

    try {
      resetPassword(email.trim().toLowerCase(), newPassword.trim());
      setStep('done');
    } catch (err) {
      setError(err.message || 'Failed to update password.');
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

        {/* STEP 4: SUCCESS */}
        {step === 'done' ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: '#ECFDF5',
              border: '1px solid #A7F3D0',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <CheckCircle2 size={32} />
            </div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0F172A', margin: '0 0 8px' }}>
              Password Reset Successful
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#64748B', margin: '0 0 24px', lineHeight: 1.5 }}>
              Your account password has been updated securely. You can now sign in with your new credentials.
            </p>
            <button
              onClick={() => nav('/login')}
              className="auth-clean-btn-primary"
              style={{ width: '100%' }}
            >
              Sign In Now
            </button>
          </div>
        ) : step === 'email' ? (
          /* STEP 1: ENTER EMAIL */
          <>
            <div className="auth-clean-header">
              <h1>Forgot Password</h1>
              <p>Enter your university email address and we will dispatch a 6-digit verification code to reset your password.</p>
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

            <form onSubmit={handleSendResetCode} className="auth-clean-form">
              <div className="auth-clean-field">
                <label htmlFor="reset-email" className="auth-clean-label">University Email</label>
                <div className="auth-clean-input-wrap">
                  <Mail size={18} className="auth-clean-input-icon" />
                  <input
                    id="reset-email"
                    className="auth-clean-input"
                    type="email"
                    placeholder="student@university.edu"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
                <span className="auth-clean-hint">Only registered campus accounts are eligible for password recovery.</span>
              </div>

              <button type="submit" className="auth-clean-btn-primary" disabled={loading}>
                {loading ? <span>Sending verification code…</span> : (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <div className="auth-clean-footer">
              Remember your password? <Link to="/login">Sign in</Link>
            </div>
          </>
        ) : step === 'otp' ? (
          /* STEP 2: VERIFY CODE */
          <>
            <div className="auth-clean-header">
              <h1>Verify Your Code</h1>
              <p>We've dispatched a 6-digit code to <strong>{email}</strong>. Enter it below to verify your identity.</p>
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

            <form onSubmit={handleVerifyCode} className="auth-clean-form">
              <div className="auth-clean-field">
                <label className="auth-clean-label" htmlFor="reset-code">6-Digit Verification Code</label>
                <input
                  id="reset-code"
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

              <div className="auth-clean-resend-row">
                <button
                  type="button"
                  className="auth-clean-resend-btn"
                  onClick={handleResendCode}
                  disabled={loading || resendTimer > 0}
                >
                  {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend Code'}
                </button>
              </div>

              <button type="submit" className="auth-clean-btn-primary" disabled={loading || otp.trim().length !== 6}>
                {loading ? <span>Verifying code…</span> : (
                  <>
                    <span>Verify Code</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <button type="button" className="auth-clean-btn-back" onClick={() => { setStep('email'); setOtp(''); setError(''); }}>
              <ArrowLeft size={15} />
              <span>Back to email entry</span>
            </button>
          </>
        ) : (
          /* STEP 3: SET NEW PASSWORD */
          <>
            <div className="auth-clean-header">
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#ECFDF5',
                color: '#059669',
                fontSize: '0.8rem',
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: '16px',
                marginBottom: '10px'
              }}>
                <ShieldCheck size={14} /> Identity Verified
              </div>
              <h1>Create New Password</h1>
              <p>Set a new password for <strong>{email}</strong>.</p>
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

            <form onSubmit={handleSaveNewPassword} className="auth-clean-form">
              <div className="auth-clean-field">
                <label className="auth-clean-label" htmlFor="new-password">New Password</label>
                <div className="auth-clean-input-wrap">
                  <Key size={18} className="auth-clean-input-icon" />
                  <input
                    id="new-password"
                    className="auth-clean-input"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    autoFocus
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

              <div className="auth-clean-field">
                <label className="auth-clean-label" htmlFor="confirm-password">Confirm New Password</label>
                <div className="auth-clean-input-wrap">
                  <Key size={18} className="auth-clean-input-icon" />
                  <input
                    id="confirm-password"
                    className="auth-clean-input"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      background: 'none',
                      border: 'none',
                      color: '#94A3B8',
                      cursor: 'pointer'
                    }}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="auth-clean-btn-primary" disabled={loading || !newPassword || !confirmPassword}>
                {loading ? <span>Saving new password…</span> : <span>Save New Password</span>}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
