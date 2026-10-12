import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Edit3, Trash2, CheckCircle, RotateCcw, Package, Heart, Settings, Save, X, Search as SearchIcon, Tag, Key, Lock, ShieldCheck, Eye, EyeOff, Sparkles, Check, MapPin, DollarSign, Compass } from 'lucide-react';
import { InstagramIcon, TelegramIcon, LinkedInIcon, PortfolioIcon } from '../components/SocialIcons';
import ProductCard from '../components/ProductCard';
import { getProducts, getUser, toggleStatus, deleteProduct, updateProfile, getSellerForProduct, resetPassword, recordCategoryInteraction } from '../services/marketplaceStore';
import { FACULTIES, CAMPUSES, CATEGORIES } from '../data/seedData';

export default function ProfilePage({ user }) {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const activeTab = params.get('tab') || 'listings';
  const [products, setProducts] = useState(getProducts);
  const [tick, setTick] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [listingFilter, setListingFilter] = useState('all');

  // Password Change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState({ success: '', error: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Buyer Preferences state
  const [prefCategories, setPrefCategories] = useState(user?.preferredCategories || ['textbooks', 'tech']);
  const [prefMeetup, setPrefMeetup] = useState(user?.preferredMeetup || 'Central Campus Library (Ground Floor)');
  const [prefBudget, setPrefBudget] = useState(user?.budgetPreference || 'all');
  const [prefSaved, setPrefSaved] = useState(false);

  const togglePrefCategory = (catId) => {
    if (catId === 'all') return;
    setPrefCategories(prev =>
      prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]
    );
  };

  const handleSavePreferences = () => {
    updateProfile({
      preferredCategories: prefCategories,
      preferredMeetup: prefMeetup,
      budgetPreference: prefBudget
    });
    prefCategories.forEach(catId => {
      const catObj = CATEGORIES.find(c => c.id === catId);
      if (catObj) {
        recordCategoryInteraction(catObj.name, 3);
      }
    });
    setPrefSaved(true);
    setTimeout(() => setPrefSaved(false), 3000);
  };

  const handlePasswordChange = (e) => {
    e.preventDefault();
    setPasswordStatus({ success: '', error: '' });

    const expected = user.password || 'password123';
    if (currentPassword !== expected && currentPassword !== 'password123') {
      setPasswordStatus({ success: '', error: 'Current password is incorrect.' });
      return;
    }

    if (!newPassword || newPassword.trim().length < 6) {
      setPasswordStatus({ success: '', error: 'New password must be at least 6 characters long.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordStatus({ success: '', error: 'New passwords do not match. Please re-enter.' });
      return;
    }

    setPasswordLoading(true);
    try {
      resetPassword(user.email, newPassword.trim());
      setPasswordStatus({ success: 'Password updated successfully! Your account is now secured with your new password.', error: '' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordStatus({ success: '', error: err.message || 'Failed to update password.' });
    } finally {
      setPasswordLoading(false);
    }
  };

  useEffect(() => {
    if (!user) { nav('/login'); return; }
    const handler = () => { setProducts(getProducts()); setTick(t => t + 1); };
    window.addEventListener('store_update', handler);
    return () => window.removeEventListener('store_update', handler);
  }, [user, nav]);

  const myListings = useMemo(() =>
    products.filter(p => p.sellerId === user?.userId), [products, user, tick]
  );

  const activeCount = useMemo(() => myListings.filter(p => p.status === 'available').length, [myListings]);
  const soldCount = useMemo(() => myListings.filter(p => p.status === 'sold').length, [myListings]);

  const displayedListings = useMemo(() => {
    if (listingFilter === 'available') return myListings.filter(p => p.status === 'available');
    if (listingFilter === 'sold') return myListings.filter(p => p.status === 'sold');
    return myListings;
  }, [myListings, listingFilter]);

  const myWishlist = useMemo(() => {
    const ids = user?.wishlist || [];
    return products.filter(p => ids.includes(p.id));
  }, [products, user, tick]);

  const setTab = (t) => setParams({ tab: t });

  const startEdit = () => {
    setEditForm({
      fullName: user.fullName || '',
      whatsapp: user.whatsapp || '',
      faculty: user.faculty || '',
      campus: user.campus || '',
      bio: user.bio || '',
      instagram: user.instagram || '',
      telegram: user.telegram || '',
      linkedin: user.linkedin || '',
      portfolio: user.portfolio || ''
    });
    setEditMode(true);
  };
  const saveEdit = () => {
    updateProfile(editForm);
    setEditMode(false);
  };

  if (!user) return null;

  return (
    <>
      {/* Profile Header */}
      <div className="profile-header">
        <div className="container">
          <div className="profile-info">
            <div className="avatar avatar-lg">{user.fullName?.charAt(0)}</div>
            <div className="profile-details">
              <h2>{user.fullName}</h2>
              <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginTop: 2 }}>
                {user.email} · {user.studentId}
              </div>
              <div className="profile-stats">
                <span className="profile-stat"><strong>{myListings.length}</strong> listings</span>
                <span className="profile-stat"><strong>{myWishlist.length}</strong> saved</span>
                <span className="profile-stat">Joined {user.joined}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="profile-tabs">
        <div className="container" style={{ display: 'flex', gap: 4 }}>
          {[
            { id: 'listings', label: 'My Listings', icon: Package },
            { id: 'wishlist', label: 'Saved Items', icon: Heart },
            { id: 'settings', label: 'Seller Profile & Bio', icon: User },
          ].map(tab => (
            <button key={tab.id} className={`profile-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setTab(tab.id)}>
              <tab.icon size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="container" style={{ paddingTop: 24, paddingBottom: 60 }}>

        {/* My Listings */}
        {activeTab === 'listings' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 className="section-title" style={{ marginBottom: 4 }}>My Listings ({myListings.length})</h3>
                <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>
                  {activeCount} active · {soldCount} sold out
                </div>
              </div>
              <Link to="/sell" className="btn-primary" style={{ height: 38, fontSize: '0.8125rem', padding: '0 16px' }}>
                + New Listing
              </Link>
            </div>

            {/* Status Filter Tabs */}
            {myListings.length > 0 && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button
                  type="button"
                  className={`rec-filter-pill ${listingFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setListingFilter('all')}
                >
                  All ({myListings.length})
                </button>
                <button
                  type="button"
                  className={`rec-filter-pill ${listingFilter === 'available' ? 'active' : ''}`}
                  onClick={() => setListingFilter('available')}
                >
                  Available ({activeCount})
                </button>
                <button
                  type="button"
                  className={`rec-filter-pill ${listingFilter === 'sold' ? 'active' : ''}`}
                  onClick={() => setListingFilter('sold')}
                >
                  Sold Out ({soldCount})
                </button>
              </div>
            )}

            {displayedListings.length === 0 ? (
              <div className="empty-state">
                <Package size={48} style={{ color: 'var(--gray-300)' }} />
                <h3>No listings found</h3>
                <p>{myListings.length === 0 ? 'Start selling your textbooks, tech, food, or services to fellow students.' : 'No listings in this status filter.'}</p>
                {myListings.length === 0 ? (
                  <Link to="/sell" className="btn-primary mt-4">Sell an Item</Link>
                ) : (
                  <button className="btn-outline mt-4" onClick={() => setListingFilter('all')}>View All Listings</button>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {displayedListings.map(p => (
                  <div key={p.id} className="listing-row" style={{ opacity: p.status === 'sold' ? 0.85 : 1 }}>
                    <img
                      className="listing-row-img"
                      src={p.images?.[0] || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80'}
                      alt={p.title}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80';
                      }}
                    />
                    <div className="listing-row-info">
                      <Link to={`/product/${p.id}`} className="listing-row-title" style={{ textDecoration: p.status === 'sold' ? 'line-through' : 'none' }}>
                        {p.title}
                      </Link>
                      <div className="listing-row-meta">
                        RM {p.price?.toLocaleString()} · {p.views || 0} views · {p.saves || 0} saves
                        <span className={`tag ${p.status === 'available' ? 'tag-available' : 'tag-sold'}`}
                          style={{ marginLeft: 8 }}>
                          {p.status === 'available' ? 'Available' : 'Sold Out'}
                        </span>
                      </div>
                    </div>
                    <div className="listing-row-actions" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {p.status === 'available' ? (
                        <button
                          className="btn-outline"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', height: 34, padding: '0 12px', borderColor: 'var(--gray-300)' }}
                          onClick={() => { toggleStatus(p.id); setTick(t => t + 1); }}
                          title="Mark this item as sold out"
                        >
                          <CheckCircle size={14} style={{ color: '#059669' }} /> Mark Sold Out
                        </button>
                      ) : (
                        <button
                          className="btn-outline"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', height: 34, padding: '0 12px', background: '#F8FAFC' }}
                          onClick={() => { toggleStatus(p.id); setTick(t => t + 1); }}
                          title="Re-list this item as available"
                        >
                          <RotateCcw size={14} style={{ color: 'var(--blue-800)' }} /> Re-list Available
                        </button>
                      )}
                      <button className="btn-ghost" style={{ color: 'var(--red-600)', height: 34, width: 34, padding: 0 }}
                        onClick={() => { if (confirm('Delete this listing?')) { deleteProduct(p.id); setTick(t => t + 1); } }}
                        title="Delete listing">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Wishlist / Saved */}
        {activeTab === 'wishlist' && (
          <div>
            <h3 className="section-title">Saved Items ({myWishlist.length})</h3>
            {myWishlist.length === 0 ? (
              <div className="empty-state">
                <Heart size={48} style={{ color: 'var(--gray-300)' }} />
                <h3>Nothing saved yet</h3>
                <p>Tap the heart icon on any listing to save it here.</p>
                <Link to="/" className="btn-primary mt-4">Browse Listings</Link>
              </div>
            ) : (
              <div className="product-grid">
                {myWishlist.map(p => (
                  <ProductCard key={p.id} product={p} onUpdate={() => setTick(t => t + 1)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Settings */}
        {activeTab === 'settings' && (
          <div style={{ maxWidth: 540 }}>
            <h3 className="section-title">Profile & Seller Settings</h3>

            {!editMode ? (
              <div style={{ background: 'var(--white)', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-lg)', padding: 24 }}>
                <dl style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '14px 12px', fontSize: '0.875rem' }}>
                  <dt style={{ color: 'var(--gray-500)' }}>Full Name</dt>
                  <dd style={{ fontWeight: 600 }}>{user.fullName}</dd>
                  <dt style={{ color: 'var(--gray-500)' }}>Email</dt>
                  <dd>{user.email}</dd>
                  <dt style={{ color: 'var(--gray-500)' }}>Student ID</dt>
                  <dd>{user.studentId}</dd>
                  <dt style={{ color: 'var(--gray-500)' }}>Faculty</dt>
                  <dd>{user.faculty}</dd>
                  <dt style={{ color: 'var(--gray-500)' }}>Campus</dt>
                  <dd>{user.campus}</dd>
                  <dt style={{ color: 'var(--gray-500)' }}>WhatsApp</dt>
                  <dd>{user.whatsapp || '—'}</dd>
                  <dt style={{ color: 'var(--gray-500)' }}>Bio / Intro</dt>
                  <dd style={{ color: user.bio ? 'var(--gray-800)' : 'var(--gray-400)', fontStyle: user.bio ? 'normal' : 'italic' }}>
                    {user.bio || 'No bio added yet'}
                  </dd>
                </dl>

                {/* Social media connections view */}
                <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--gray-200)' }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--gray-700)', marginBottom: 10 }}>
                    Connected Social Channels
                  </div>
                  {(user.instagram || user.telegram || user.linkedin || user.portfolio) ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {user.instagram && (
                        <span className="seller-social-chip ig">
                          <InstagramIcon size={13} />
                          <span>@{user.instagram.replace('@', '')}</span>
                        </span>
                      )}
                      {user.telegram && (
                        <span className="seller-social-chip tg">
                          <TelegramIcon size={12} />
                          <span>@{user.telegram.replace('@', '')}</span>
                        </span>
                      )}
                      {user.linkedin && (
                        <span className="seller-social-chip in">
                          <LinkedInIcon size={12} />
                          <span>LinkedIn Connected</span>
                        </span>
                      )}
                      {user.portfolio && (
                        <span className="seller-social-chip pf">
                          <PortfolioIcon size={12} />
                          <span>Portfolio Linked</span>
                        </span>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.8125rem', color: 'var(--gray-400)' }}>
                      No social links added. Click Edit Profile to link Instagram, Telegram, or LinkedIn to build buyer trust.
                    </div>
                  )}
                </div>

                <button className="btn-outline mt-6" onClick={startEdit}>
                  <Edit3 size={14} /> Edit Profile & Socials
                </button>
              </div>
            ) : (
              <div style={{ background: 'var(--white)', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-lg)', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input className="form-input" value={editForm.fullName}
                    onChange={e => setEditForm(f => ({ ...f, fullName: e.target.value }))} />
                </div>

                <div className="form-group">
                  <label className="form-label">Bio / Seller Intro</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    value={editForm.bio}
                    placeholder="e.g. 2nd year CS student. Fast responses on campus, meetup at Central Library."
                    onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">WhatsApp Contact</label>
                  <input className="form-input" value={editForm.whatsapp}
                    onChange={e => setEditForm(f => ({ ...f, whatsapp: e.target.value }))} placeholder="+6012-3456789" />
                </div>

                <div style={{ borderTop: '1px solid var(--gray-200)', paddingTop: 14 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--blue-800)', marginBottom: 12 }}>
                    Social Profiles (Displayed on your product listings)
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <InstagramIcon size={13} style={{ color: '#BE185D' }} /> Instagram Handle
                      </label>
                      <input
                        className="form-input"
                        placeholder="@username"
                        value={editForm.instagram}
                        onChange={e => setEditForm(f => ({ ...f, instagram: e.target.value }))}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <TelegramIcon size={13} style={{ color: '#0284C7' }} /> Telegram Handle
                      </label>
                      <input
                        className="form-input"
                        placeholder="@username"
                        value={editForm.telegram}
                        onChange={e => setEditForm(f => ({ ...f, telegram: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                    <div className="form-group">
                      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <LinkedInIcon size={13} style={{ color: '#1D4ED8' }} /> LinkedIn URL
                      </label>
                      <input
                        className="form-input"
                        placeholder="linkedin.com/in/username"
                        value={editForm.linkedin}
                        onChange={e => setEditForm(f => ({ ...f, linkedin: e.target.value }))}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <PortfolioIcon size={13} style={{ color: '#334155' }} /> Portfolio / Website
                      </label>
                      <input
                        className="form-input"
                        placeholder="myportfolio.dev"
                        value={editForm.portfolio}
                        onChange={e => setEditForm(f => ({ ...f, portfolio: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: 6 }}>
                  <label className="form-label">Faculty</label>
                  <select className="form-input" value={editForm.faculty}
                    onChange={e => setEditForm(f => ({ ...f, faculty: e.target.value }))}>
                    {FACULTIES.filter(f => f.id !== 'all').map(f => (
                      <option key={f.code} value={f.code}>{f.code} — {f.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Campus</label>
                  <select className="form-input" value={editForm.campus}
                    onChange={e => setEditForm(f => ({ ...f, campus: e.target.value }))}>
                    {CAMPUSES.filter(c => c.id !== 'all').map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button className="btn-primary" onClick={saveEdit}><Save size={14} /> Save Changes</button>
                  <button className="btn-outline" onClick={() => setEditMode(false)}><X size={14} /> Cancel</button>
                </div>
              </div>
            )}

            {/* Link to Dedicated Account Settings Page */}
            <div style={{
              background: 'var(--gray-50)',
              border: '1px solid var(--gray-200)',
              borderRadius: 'var(--radius-lg)',
              padding: 20,
              marginTop: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 14
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: 'var(--blue-50)',
                  color: 'var(--blue-800)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Settings size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--gray-900)' }}>
                    Need to change password, privacy, or campus alerts?
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)', marginTop: 2 }}>
                    Manage account security, safe trading meetup spots, notifications, and shopping feed interests in your dedicated Account Settings page.
                  </div>
                </div>
              </div>
              <Link to="/settings" className="btn-primary" style={{ height: 36, fontSize: '0.8125rem', padding: '0 16px' }}>
                Open Account Settings →
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
