import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck, ArrowRight } from 'lucide-react';
import { validateEmail, loginWithOutlook } from '../services/marketplaceStore';

export default function OutlookSSOPage({ onLogin }) {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState('email'); // 'email' | 'password' | 'authenticating'
  const [error, setError] = useState('');

  const handleNext = (e) => {
    e.preventDefault();
    setError('');
    const trimmed = email.trim().toLowerCase();
    const v = validateEmail(trimmed);
    if (!v.ok) {
      setError(v.msg);
      return;
    }
    setStep('password');
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    if (!password || password.trim().length < 4) {
      setError('Please enter your university account password.');
      return;
    }

    setStep('authenticating');

    setTimeout(() => {
      try {
        const user = loginWithOutlook(email.trim().toLowerCase());
        if (onLogin) onLogin(user);

        // If opened inside popup window, send message to parent and close
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage({ type: 'OUTLOOK_SSO_SUCCESS', email: user.email }, window.location.origin);
          window.close();
        } else {
          nav('/');
        }
      } catch (err) {
        setError(err.message || 'Authentication failed.');
        setStep('password');
      }
    }, 900);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f2f4f8',
      fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: '#ffffff',
        boxShadow: '0 8px 30px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
        border: '1px solid #e1dfdd',
        padding: '40px 44px',
        boxSizing: 'border-box'
      }}>
        {/* Microsoft Logo Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="2" width="9.5" height="9.5" fill="#F25022"/>
            <rect x="12.5" y="2" width="9.5" height="9.5" fill="#7FBA00"/>
            <rect x="2" y="12.5" width="9.5" height="9.5" fill="#00A4EF"/>
            <rect x="12.5" y="12.5" width="9.5" height="9.5" fill="#FFB900"/>
          </svg>
          <span style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1b1b1b', letterSpacing: '-0.3px' }}>
            Microsoft 365
          </span>
        </div>

        {/* Institution Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: '#f3f2f1',
          padding: '4px 10px',
          borderRadius: '4px',
          fontSize: '0.75rem',
          color: '#323130',
          fontWeight: 600,
          marginBottom: '20px'
        }}>
          <ShieldCheck size={14} color="#0D2C6C" />
          <span>Campus Microsoft 365 Single Sign-On</span>
        </div>

        {step === 'authenticating' ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid #0078d4',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              margin: '0 auto 20px',
              animation: 'spin 0.8s linear infinite'
            }} />
            <h2 style={{ fontSize: '1.15rem', color: '#1b1b1b', margin: '0 0 8px' }}>Authenticating...</h2>
            <p style={{ fontSize: '0.875rem', color: '#605e5c', margin: 0 }}>
              Connecting to Campus Marketplace with your university identity.
            </p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : step === 'email' ? (
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1b1b1b', margin: '0 0 8px', letterSpacing: '-0.4px' }}>
              Sign in
            </h1>
            <p style={{ fontSize: '0.925rem', color: '#605e5c', margin: '0 0 24px', lineHeight: 1.4 }}>
              to continue to <strong>Campus Marketplace</strong>
            </p>

            {error && (
              <div style={{
                background: '#fde7e9',
                color: '#a80000',
                padding: '10px 14px',
                fontSize: '0.85rem',
                borderRadius: '2px',
                marginBottom: '16px',
                borderLeft: '3px solid #a80000'
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleNext}>
              <div style={{ marginBottom: '24px' }}>
                <input
                  type="email"
                  placeholder="student@university.edu"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoFocus
                  required
                  style={{
                    width: '100%',
                    height: '40px',
                    border: '1px solid #8a8886',
                    padding: '0 12px',
                    fontSize: '0.9375rem',
                    color: '#1b1b1b',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ fontSize: '0.8125rem', color: '#605e5c', marginBottom: '24px' }}>
                Sign in with your official university Office 365 student or staff account.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  style={{
                    background: '#0067b8',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 28px',
                    fontSize: '0.9375rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    minWidth: '100px'
                  }}
                >
                  Next
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <span style={{ fontSize: '0.875rem', color: '#323130' }}>{email}</span>
              <button
                onClick={() => setStep('email')}
                style={{ background: 'none', border: 'none', color: '#0067b8', fontSize: '0.8125rem', cursor: 'pointer', padding: 0 }}
              >
                Change
              </button>
            </div>

            <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1b1b1b', margin: '0 0 16px', letterSpacing: '-0.4px' }}>
              Enter password
            </h1>

            {error && (
              <div style={{
                background: '#fde7e9',
                color: '#a80000',
                padding: '10px 14px',
                fontSize: '0.85rem',
                borderRadius: '2px',
                marginBottom: '16px',
                borderLeft: '3px solid #a80000'
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSignIn}>
              <div style={{ position: 'relative', marginBottom: '24px' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoFocus
                  required
                  style={{
                    width: '100%',
                    height: '40px',
                    border: '1px solid #8a8886',
                    padding: '0 40px 0 12px',
                    fontSize: '0.9375rem',
                    color: '#1b1b1b',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#605e5c',
                    cursor: 'pointer'
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  style={{
                    background: '#e1dfdd',
                    color: '#323130',
                    border: 'none',
                    padding: '8px 20px',
                    fontSize: '0.9375rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Back
                </button>
                <button
                  type="submit"
                  style={{
                    background: '#0067b8',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 28px',
                    fontSize: '0.9375rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    minWidth: '100px'
                  }}
                >
                  Sign in
                </button>
              </div>
            </form>
          </div>
        )}

        <div style={{ marginTop: '36px', paddingTop: '16px', borderTop: '1px solid #edebe9', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#605e5c' }}>
          <span>University • Microsoft 365 SSO</span>
          <span>Terms of use</span>
        </div>
      </div>
    </div>
  );
}
