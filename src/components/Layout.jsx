import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Heart, Plus, User, LogOut, ChevronDown, X, Menu, Cookie, ShieldCheck, MessageSquare, Settings } from 'lucide-react';
import { logout, getCookieConsent, setCookieConsent, getUnreadChatCount, getOrCreateChat } from '../services/marketplaceStore';
import ChatMessenger from './ChatMessenger';
import OnboardingModal from './OnboardingModal';

export default function Layout({ children, user, onUserChange }) {
  const nav = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [consent, setConsent] = useState(() => getCookieConsent());
  const [showCookieModal, setShowCookieModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [activeChatId, setActiveChatId] = useState(null);
  const [unreadChats, setUnreadChats] = useState(() => getUnreadChatCount(user?.userId));

  useEffect(() => {
    const handleConsent = () => setConsent(getCookieConsent());
    window.addEventListener('cookie_consent_update', handleConsent);
    return () => window.removeEventListener('cookie_consent_update', handleConsent);
  }, []);

  useEffect(() => {
    const updateUnread = () => {
      setUnreadChats(getUnreadChatCount(user?.userId));
    };
    updateUnread();
    window.addEventListener('chat_update', updateUnread);
    window.addEventListener('store_update', updateUnread);
    return () => {
      window.removeEventListener('chat_update', updateUnread);
      window.removeEventListener('store_update', updateUnread);
    };
  }, [user?.userId]);

  useEffect(() => {
    if (user && user.onboardingCompleted !== true) {
      const alreadyDone = typeof localStorage !== 'undefined' && localStorage.getItem(`campus_onboarding_completed_${user.userId}`);
      if (!alreadyDone) {
        setShowOnboarding(true);
      } else {
        setShowOnboarding(false);
      }
    } else {
      setShowOnboarding(false);
    }
  }, [user?.userId, user?.onboardingCompleted]);

  useEffect(() => {
    const handleOpenOnboarding = () => setShowOnboarding(true);
    window.addEventListener('open_onboarding', handleOpenOnboarding);
    return () => window.removeEventListener('open_onboarding', handleOpenOnboarding);
  }, []);

  useEffect(() => {
    const handleOpenChat = (e) => {
      const detail = e.detail || {};
      if (detail.chatId) {
        setActiveChatId(detail.chatId);
      } else if (detail.buyerId && detail.sellerId && detail.productId) {
        const chat = getOrCreateChat({
          buyerId: detail.buyerId,
          sellerId: detail.sellerId,
          productId: detail.productId
        });
        setActiveChatId(chat.id);
      }
      setChatOpen(true);
    };
    window.addEventListener('open_chat', handleOpenChat);
    return () => window.removeEventListener('open_chat', handleOpenChat);
  }, []);

  // If on admin routes, render dedicated full-screen admin layout without consumer storefront navbar
  if (location.pathname.startsWith('/admin')) {
    return <main style={{ minHeight: '100vh', background: '#0F172A' }}>{children}</main>;
  }

  // If on Microsoft Outlook SSO window, render clean full-screen without storefront navbar
  if (location.pathname.startsWith('/outlook-sso')) {
    return <main style={{ minHeight: '100vh', background: '#f2f4f8' }}>{children}</main>;
  }

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) {
      nav(`/?q=${encodeURIComponent(search.trim())}`);
      setShowMobileSearch(false);
    }
  };

  const handleLogout = () => {
    logout();
    onUserChange(null);
    setShowDropdown(false);
    nav('/');
  };

  const wishlistCount = user?.wishlist?.length || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Navbar */}
      <nav className="navbar">
        <div className="container navbar-inner">
          {/* Brand Logo */}
          <Link to="/" className="navbar-logo" title="Campus Marketplace">
            <img
              src="/assets/campus-logo.svg"
              alt="Campus Marketplace"
              className="navbar-logo-img"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div className="navbar-logo-text">
              <span className="navbar-campus-word">Campus </span><span>Marketplace</span>
            </div>
          </Link>

          {/* Desktop search */}
          <form className="navbar-search" onSubmit={handleSearch}>
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search items, services..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button type="button" onClick={() => setSearch('')}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)', background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={14} />
              </button>
            )}
          </form>

          {/* Nav actions */}
          <div className="navbar-actions">
            {/* Mobile search toggle */}
            <button className="nav-link" onClick={() => setShowMobileSearch(!showMobileSearch)}
              style={{ display: 'none' }} id="mobile-search-toggle">
              <Search size={20} />
            </button>
            <style>{`@media (max-width: 639px) { #mobile-search-toggle { display: inline-flex !important; } }`}</style>

            {user ? (
              <>

                <button
                  type="button"
                  className="nav-link"
                  onClick={() => setChatOpen(true)}
                  title="Campus Messages & Offers"
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <span className="nav-link-icon">
                    <MessageSquare size={20} />
                    {unreadChats > 0 && <span className="nav-badge">{unreadChats}</span>}
                  </span>
                </button>

                <Link to="/profile?tab=wishlist" className="nav-link" title="Wishlist">
                  <span className="nav-link-icon">
                    <Heart size={20} />
                    {wishlistCount > 0 && <span className="nav-badge">{wishlistCount}</span>}
                  </span>
                </Link>

                <Link to="/sell" className="btn-sell" style={{ display: 'none' }} id="desk-sell-btn">
                  <Plus size={16} />
                  <span>Sell</span>
                </Link>
                <style>{`@media (min-width: 768px) { #desk-sell-btn { display: inline-flex !important; } }`}</style>

                {/* User menu */}
                <div style={{ position: 'relative' }}>
                  <button className="nav-link" onClick={() => setShowDropdown(!showDropdown)}
                    style={{ gap: 8 }}>
                    <div className="avatar">{user.fullName?.charAt(0)}</div>
                    <ChevronDown size={14} />
                  </button>

                  {showDropdown && (
                    <>
                      <div style={{ position: 'fixed', inset: 0, zIndex: 55 }}
                        onClick={() => setShowDropdown(false)} />
                      <div className="dropdown">
                        <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--gray-200)', marginBottom: 4 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--gray-900)' }}>
                            {user.fullName}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                            {user.email}
                          </div>
                        </div>
                        <button className="dropdown-item" onClick={() => { setShowDropdown(false); nav('/profile'); }}>
                          <User size={16} /> My Profile
                        </button>
                        <button className="dropdown-item" onClick={() => { setShowDropdown(false); nav('/profile?tab=listings'); }}>
                          <Menu size={16} /> My Listings
                        </button>
                        <button className="dropdown-item" onClick={() => { setShowDropdown(false); nav('/profile?tab=wishlist'); }}>
                          <Heart size={16} /> Saved Items
                        </button>
                        <button className="dropdown-item" onClick={() => { setShowDropdown(false); nav('/settings'); }}>
                          <Settings size={16} /> Account Settings
                        </button>
                        {Boolean(user?.role === 'admin' || user?.isAdmin || user?.email?.toLowerCase() === 'admin@university.edu') && (
                          <button className="dropdown-item" onClick={() => { setShowDropdown(false); nav('/admin'); }} style={{ color: 'var(--blue-900)', fontWeight: 600 }}>
                            <ShieldCheck size={16} /> Admin Portal
                          </button>
                        )}

                        <div className="dropdown-divider" />
                        <button className="dropdown-item danger" onClick={handleLogout}>
                          <LogOut size={16} /> Sign Out
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="nav-link" style={{ fontWeight: 600 }}>Sign In</Link>
                <Link to="/register" className="btn-sell">Join Now</Link>
              </>
            )}
          </div>
        </div>

        {/* Mobile search bar */}
        {showMobileSearch && (
          <div style={{ padding: '0 16px 12px' }}>
            <form onSubmit={handleSearch} style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)', pointerEvents: 'none' }} />
              <input type="text" placeholder="Search items, services..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', height: 40, padding: '0 16px 0 40px', border: '1px solid var(--gray-300)', borderRadius: 9999, fontSize: '0.875rem' }}
                autoFocus />
            </form>
          </div>
        )}
      </nav>

      {/* Page content */}
      <main style={{ flex: 1 }}>
        {children}
      </main>

      {/* Mobile FAB */}
      {user && (
        <div className="mobile-fab">
          <button onClick={() => nav('/sell')}>
            <Plus size={18} />
            <span>Sell</span>
          </button>
        </div>
      )}

      {/* Footer */}
      <footer className="site-footer">
        <div className="container">
          <div className="footer-grid">
            <div>
              <div className="footer-brand" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--blue-900)' }}>Campus Marketplace</span>
              </div>
              <p style={{ lineHeight: 1.6, marginBottom: 12, marginTop: 10 }}>
                Open-source peer-to-peer campus commerce platform for students, faculty, and university clubs.
                Buy, sell, order student bakes, and book freelance student services.
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                Open-source community project • Self-hostable for any college or university.
              </p>
            </div>
            <div>
              <div className="footer-heading">Browse Campus</div>
              <div className="footer-links">
                <Link to="/?cat=food">Food & Homebakes</Link>
                <Link to="/?cat=plants">Plants & Greenery</Link>
                <Link to="/?cat=adoption">Pet Adoption & Free</Link>
                <Link to="/?cat=textbooks">Textbooks & Notes</Link>
                <Link to="/?cat=tech">Laptops & Tech</Link>
                <Link to="/?cat=services">Services & Freelance</Link>
              </div>
            </div>
            <div>
              <div className="footer-heading">Quick Links</div>
              <div className="footer-links">
                <Link to="/sell">Sell an Item / Service</Link>
                <Link to="/login">Sign In</Link>
                <Link to="/register">Create Account</Link>
                <button
                  type="button"
                  style={{ textAlign: 'left', color: 'var(--gray-600)', fontSize: '0.875rem', padding: 0 }}
                  onClick={() => setShowCookieModal(true)}
                >
                  Cookie & Recommendation Settings
                </button>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} Campus Marketplace</span>
            <span>Open-Source Peer-to-Peer Campus Commerce</span>
          </div>
        </div>
      </footer>

      {/* Floating Cookie & Personalization Banner */}
      {!consent && (
        <div className="cookie-banner" role="dialog" aria-label="Cookie and recommendation preferences">
          <div className="cookie-banner-inner">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <Cookie size={20} style={{ color: 'var(--gray-700)' }} />
              <strong style={{ fontSize: '0.9375rem', color: 'var(--gray-900)' }}>
                Save Cookies & Personalized Recommendations
              </strong>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--gray-600)', lineHeight: 1.45, marginBottom: 12 }}>
              We use cookies and your campus browsing activity (faculty, viewed categories, and search interests) to save your preferences and power smart recommendations for textbooks, food, and dorm items.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                className="btn-primary"
                style={{ height: 36, padding: '0 16px', fontSize: '0.8125rem' }}
                onClick={() => {
                  const c = setCookieConsent({ recommendations: true });
                  setConsent(c);
                }}
              >
                Accept All & Personalize
              </button>
              <button
                className="btn-outline"
                style={{ height: 36, padding: '0 12px', fontSize: '0.8125rem' }}
                onClick={() => {
                  const c = setCookieConsent({ recommendations: false });
                  setConsent(c);
                }}
              >
                Essential Only
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cookie Settings Modal */}
      {showCookieModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, maxWidth: 480, width: '100%', padding: 24, boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Campus Privacy & Cookies</h3>
              <button className="btn-ghost" onClick={() => setShowCookieModal(false)}><X size={18} /></button>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--gray-600)', lineHeight: 1.5, marginBottom: 16 }}>
              Control how Campus Marketplace stores cookies and local data on your device:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              <div style={{ padding: 12, border: '1px solid var(--gray-200)', borderRadius: 8, background: 'var(--gray-50)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: '0.875rem' }}>
                  <span>Essential Cookies & Auth</span>
                  <span style={{ color: 'var(--green-600)' }}>Required</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: 4 }}>
                  Maintains your active student login session, CSRF safety, and saved wishlist items.
                </div>
              </div>
              <div style={{ padding: 12, border: '1px solid var(--gray-200)', borderRadius: 8, background: '#F8FAFC' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: '0.875rem' }}>
                  <span>Recommendation Engine & Preferences</span>
                  <span style={{ color: 'var(--blue-800)' }}>Active</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: 4 }}>
                  Remembers your faculty and viewed categories to rank relevant listings higher on your feed.
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn-outline" onClick={() => setShowCookieModal(false)}>Close</button>
              <button className="btn-primary" onClick={() => {
                setCookieConsent({ recommendations: true });
                setShowCookieModal(false);
              }}>Save Preferences</button>
            </div>
          </div>
        </div>
      )}
      {/* Global In-App Chat Messenger & Offer Drawer */}
      <ChatMessenger
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        activeChatId={activeChatId}
        onSelectChat={(id) => setActiveChatId(id)}
      />

      {/* Welcome Onboarding Modal for New Students */}
      {showOnboarding && user && (
        <OnboardingModal
          user={user}
          onClose={() => setShowOnboarding(false)}
        />
      )}
    </div>
  );
}
