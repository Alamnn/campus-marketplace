import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Camera, X, ArrowLeft, Cat, Utensils, Leaf, HeartHandshake, CheckCircle, ShieldCheck, Upload } from 'lucide-react';
import { createProduct } from '../services/marketplaceStore';
import { CATEGORIES, CONDITIONS, FACULTIES, MEETUP_SPOTS, SERVICE_TYPES } from '../data/seedData';

export default function SellPage({ user }) {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const initialCategory = searchParams.get('cat') || 'textbooks';

  const [form, setForm] = useState({
    title: '', description: '', price: initialCategory === 'adoption' ? '0' : '',
    category: initialCategory, condition: 'Like New',
    faculty: user?.faculty || 'FOEBEIT', meetup: MEETUP_SPOTS[0],
    tags: '', images: [], serviceType: '', priceLabel: '',
    nonNegotiable: false
  });
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!user) {
      nav('/login');
    }
  }, [user, nav]);

  if (!user) return null;

  const isService = form.category === 'services';
  const isAdoption = form.category === 'adoption';
  const isFood = form.category === 'food';
  const isPlant = form.category === 'plants';

  const update = (k, v) => {
    setForm(f => {
      const next = { ...f, [k]: v };
      if (k === 'category' && v === 'adoption') {
        next.price = '0';
        next.condition = 'Like New';
      }
      return next;
    });
  };

  const addImage = () => {
    if (!imageUrl.trim()) return;
    if (form.images.length >= 5) return;
    update('images', [...form.images, imageUrl.trim()]);
    setImageUrl('');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (form.images.length >= 5) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        update('images', [...form.images, event.target.result]);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const removeImage = (i) => update('images', form.images.filter((_, idx) => idx !== i));

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!form.title.trim()) { setError('Please enter a title.'); return; }
    
    const parsedPrice = parseFloat(form.price);
    if (!isAdoption && (form.price === '' || isNaN(parsedPrice) || parsedPrice < 0)) {
      setError('Please enter a valid price (or 0 for free items).');
      return;
    }
    if (!form.description.trim()) { setError('Add a description so buyers know what they\'re getting.'); return; }

    createProduct({
      ...form,
      price: isAdoption ? 0 : parsedPrice,
      nonNegotiable: Boolean(form.nonNegotiable)
    }, user);
    setSuccess(true);
    setTimeout(() => nav('/profile?tab=listings'), 1500);
  };

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <CheckCircle size={48} style={{ color: 'var(--green-600)' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 8 }}>
            {isService ? 'Service published!' : isAdoption ? 'Adoption / Free listing published!' : 'Listing published!'}
          </h2>
          <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>
            {isService
              ? 'Students can now find and hire you for this service.'
              : isAdoption
              ? 'Your adoption post is live to the campus community.'
              : 'Your item is now visible to the campus community.'}
          </p>
        </div>
      </div>
    );
  }

  const getPageTitle = () => {
    if (isService) return 'Offer a Service';
    if (isAdoption) return 'Post Pet Adoption or Free Giveaway';
    if (isFood) return 'Sell Homemade Food & Snacks';
    if (isPlant) return 'Sell Plants & Greenery';
    return 'Sell an Item';
  };

  const getPageSubtitle = () => {
    if (isService) return 'Let fellow students know about your skills and services.';
    if (isAdoption) return 'Find a loving student home for a rescue pet, or give away dorm essentials for free.';
    if (isFood) return 'Share your home-baked brownies, snacks, or meal preps with fellow students.';
    if (isPlant) return 'List your rooted cuttings, indoor plants, and succulents for dorm rooms.';
    return 'List your item and let fellow students know it\'s available.';
  };

  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 60, maxWidth: 640, margin: '0 auto' }}>
      <button className="btn-ghost" onClick={() => nav(-1)} style={{ marginBottom: 16 }}>
        <ArrowLeft size={16} /> Back
      </button>

      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 4 }}>
        {getPageTitle()}
      </h1>
      <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem', marginBottom: 20 }}>
        {getPageSubtitle()}
      </p>

      {/* Helpful Policy Callouts */}
      {isAdoption && (
        <div style={{
          background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 'var(--radius-lg)',
          padding: '14px 16px', marginBottom: 20, display: 'flex', gap: 12, alignItems: 'flex-start'
        }}>
          <Cat size={20} style={{ color: '#059669', flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: '0.8125rem', color: '#065F46', lineHeight: 1.5 }}>
            <strong>100% Free Adoption Policy:</strong> Animal adoption on Campus Marketplace must be free with zero adoption fees. Please ensure you detail vaccination/deworming status and choose a safe campus meetup location for handover.
          </div>
        </div>
      )}

      {isFood && (
        <div style={{
          background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 'var(--radius-lg)',
          padding: '14px 16px', marginBottom: 20, display: 'flex', gap: 12, alignItems: 'flex-start'
        }}>
          <Utensils size={20} style={{ color: '#D97706', flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: '0.8125rem', color: '#92400E', lineHeight: 1.5 }}>
            <strong>Food & Hygiene Note:</strong> Please clearly mention dietary information (Halal, nuts, dairy), preparation date, and your preferred campus pickup location and time slots.
          </div>
        </div>
      )}

      {isPlant && (
        <div style={{
          background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 'var(--radius-lg)',
          padding: '14px 16px', marginBottom: 20, display: 'flex', gap: 12, alignItems: 'flex-start'
        }}>
          <Leaf size={20} style={{ color: '#16A34A', flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: '0.8125rem', color: '#166534', lineHeight: 1.5 }}>
            <strong>Plant Details:</strong> Mention whether the plant is rooted, pot size, indoor light requirements (direct, indirect, low light), and watering routine.
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {error && <div className="alert-banner alert-danger">{error}</div>}

        {/* Images */}
        <div className="form-group">
          <label className="form-label">{isService ? 'Portfolio / Sample (up to 5)' : 'Photos (up to 5)'}</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {form.images.map((url, i) => (
              <div key={i} style={{
                width: 80, height: 80, borderRadius: 'var(--radius-md)',
                overflow: 'hidden', position: 'relative', border: '1px solid var(--gray-200)'
              }}>
                <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button type="button" onClick={() => removeImage(i)}
                  style={{
                    position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.6)',
                    color: '#fff', width: 20, height: 20, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: 'none', cursor: 'pointer'
                  }}>
                  <X size={10} />
                </button>
              </div>
            ))}
            {form.images.length < 5 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <label className="btn-outline" style={{ height: 40, padding: '0 14px', fontSize: '0.8125rem', display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', background: '#F8FAFC' }}>
                  <Upload size={15} /> Upload Photo
                  <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                </label>
                <span style={{ fontSize: '0.8125rem', color: 'var(--gray-400)' }}>or</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input className="form-input" type="url" placeholder="Paste image URL..."
                    value={imageUrl} onChange={e => setImageUrl(e.target.value)}
                    style={{ width: 200, height: 40, fontSize: '0.8125rem' }} />
                  <button type="button" className="btn-outline" onClick={addImage}
                    style={{ height: 40, padding: '0 12px', fontSize: '0.8125rem' }}>
                    <Camera size={14} /> Add
                  </button>
                </div>
              </div>
            )}
          </div>
          <span className="form-hint">Upload photos directly from your device or paste links (up to 5 photos)</span>
        </div>

        {/* Category & Condition / Service Type */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label className="form-label" htmlFor="sell-cat">Category</label>
            <select id="sell-cat" className="form-input" value={form.category}
              onChange={e => update('category', e.target.value)}>
              {CATEGORIES.filter(c => c.id !== 'all' && c.id !== 'activities').map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          {isService ? (
            <div className="form-group">
              <label className="form-label" htmlFor="sell-stype">Service Type</label>
              <select id="sell-stype" className="form-input" value={form.serviceType}
                onChange={e => update('serviceType', e.target.value)}>
                <option value="">Select type...</option>
                {SERVICE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          ) : isFood ? (
            <div className="form-group">
              <label className="form-label" htmlFor="sell-cond">Type</label>
              <select id="sell-cond" className="form-input" value={form.condition}
                onChange={e => update('condition', e.target.value)}>
                <option value="Freshly Baked">Freshly Baked</option>
                <option value="Cooked Fresh">Cooked Fresh</option>
                <option value="Chilled Beverage">Chilled Beverage</option>
                <option value="Pre-order Batch">Pre-order Batch</option>
              </select>
            </div>
          ) : isAdoption ? (
            <div className="form-group">
              <label className="form-label" htmlFor="sell-cond">Type</label>
              <select id="sell-cond" className="form-input" value={form.condition}
                onChange={e => update('condition', e.target.value)}>
                <option value="Kitten / Cat Adoption">Kitten / Cat Adoption</option>
                <option value="Puppy / Dog Adoption">Puppy / Dog Adoption</option>
                <option value="Other Pet Adoption">Other Pet Adoption</option>
                <option value="Free Student Supplies">Free Student Supplies</option>
                <option value="Free Dorm Furniture">Free Dorm Furniture</option>
              </select>
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label" htmlFor="sell-cond">Condition</label>
              <select id="sell-cond" className="form-input" value={form.condition}
                onChange={e => update('condition', e.target.value)}>
                {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Title */}
        <div className="form-group">
          <label className="form-label" htmlFor="sell-title">
            {isService ? 'Service Title' : isAdoption ? 'Adoption / Free Item Title' : 'Title'}
          </label>
          <input id="sell-title" className="form-input"
            placeholder={
              isService ? 'e.g. Graphic Design — Posters, Logos, Social Media'
              : isAdoption ? 'e.g. 3-Month Rescued Ginger Tabby Looking for Loving Home'
              : isFood ? 'e.g. Homemade Fudgy Sea Salt Brownies (Box of 6)'
              : isPlant ? 'e.g. Monstera Deliciosa Rooted Cutting in Terracotta Pot'
              : 'e.g. Engineering Mathematics Kreyszig 10th Ed'
            }
            value={form.title} onChange={e => update('title', e.target.value)} required maxLength={120} />
          <span className="form-hint">{form.title.length}/120</span>
        </div>

        {/* Price */}
        <div className="form-group">
          <label className="form-label" htmlFor="sell-price">
            {isService ? 'Starting Price (RM)' : isAdoption ? 'Price' : 'Price (RM)'}
          </label>
          {isAdoption ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input id="sell-price" className="form-input" type="text"
                value="FREE (RM 0.00)" disabled
                style={{ maxWidth: 200, background: '#F0FDF4', color: '#047857', fontWeight: 700 }} />
              <span style={{ fontSize: '0.8125rem', color: '#059669', fontWeight: 600 }}>
                100% Free Adoption / Giveaway
              </span>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input id="sell-price" className="form-input" type="number" step="0.01" min="0"
                  placeholder="0.00" value={form.price} onChange={e => update('price', e.target.value)} required
                  disabled={form.price === '0'}
                  style={{ maxWidth: 200, background: form.price === '0' ? '#F0FDF4' : '#fff', fontWeight: form.price === '0' ? 700 : 500, color: form.price === '0' ? '#047857' : 'inherit' }} />
                {form.price === '0' && (
                  <span style={{ fontSize: '0.8125rem', color: '#059669', fontWeight: 600 }}>
                    100% Free Giveaway
                  </span>
                )}
              </div>
              {!isService && (
                <div style={{ marginTop: 8 }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form.price === '0'}
                      onChange={e => update('price', e.target.checked ? '0' : '')}
                      style={{ width: 16, height: 16, accentColor: 'var(--blue-800)' }}
                    />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--blue-800)' }}>
                      Give away this product for 100% Free (Product Adoption / Giveaway)
                    </span>
                  </label>
                </div>
              )}
              {form.price !== '0' && <span className="form-hint">Set to 0 or check above if giving away for free</span>}

              {!isService && form.price !== '0' && (
                <div style={{
                  marginTop: 12,
                  padding: '12px 14px',
                  background: form.nonNegotiable ? '#F8FAFC' : '#F0F9FF',
                  border: `1px solid ${form.nonNegotiable ? 'var(--gray-300)' : '#BAE6FD'}`,
                  borderRadius: 10,
                  transition: 'all 0.15s ease'
                }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', margin: 0 }}>
                    <input
                      type="checkbox"
                      id="sell-non-negotiable"
                      checked={Boolean(form.nonNegotiable)}
                      onChange={e => update('nonNegotiable', e.target.checked)}
                      style={{ width: 18, height: 18, marginTop: 2, accentColor: 'var(--blue-900)', cursor: 'pointer' }}
                    />
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--gray-900)' }}>
                        Fixed Price (Non-Negotiable)
                      </div>
                      <div style={{ fontSize: '0.78125rem', color: 'var(--gray-600)', marginTop: 2, lineHeight: 1.4 }}>
                        {form.nonNegotiable
                          ? 'Buyers cannot submit lower offers or bargain. The "Make an Offer" button will be disabled, and price will show as Fixed.'
                          : 'Allow students to submit fair offers and negotiate price via In-App Chat.'}
                      </div>
                    </div>
                  </label>
                </div>
              )}
            </>
          )}

          {isService && (
            <div style={{ marginTop: 8 }}>
              <label className="form-label" htmlFor="sell-pricelabel" style={{ fontSize: '0.75rem' }}>
                Price label (shown on card)
              </label>
              <input id="sell-pricelabel" className="form-input"
                placeholder="e.g. from RM 50/project or RM 40/hour"
                value={form.priceLabel} onChange={e => update('priceLabel', e.target.value)}
                style={{ maxWidth: 300 }} />
            </div>
          )}
        </div>

        {/* Faculty & Meetup */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label className="form-label" htmlFor="sell-fac">Related Faculty</label>
            <select id="sell-fac" className="form-input" value={form.faculty}
              onChange={e => update('faculty', e.target.value)}>
              {FACULTIES.filter(f => f.id !== 'all').map(f => (
                <option key={f.code} value={f.code}>{f.code}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="sell-meetup">
              {isService ? 'Availability' : isAdoption ? 'Handover Spot' : 'Meetup Spot'}
            </label>
            <select id="sell-meetup" className="form-input" value={form.meetup}
              onChange={e => update('meetup', e.target.value)}>
              {MEETUP_SPOTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Description */}
        <div className="form-group">
          <label className="form-label" htmlFor="sell-desc">Description</label>
          <textarea id="sell-desc" className="form-input" rows={5}
            placeholder={
              isService ? 'Describe your service — what you offer, your experience, turnaround time...'
              : isAdoption ? 'Describe the pet: age, personality, vet health status (dewormed/vaccinated/spayed), diet, litter habits, and your adoption criteria...'
              : isFood ? 'Describe the ingredients, allergens (nuts, dairy, gluten), halal status, batch freshness, and pickup arrangements...'
              : isPlant ? 'Describe the plant health, root status, soil type, sunlight needs, and watering requirements...'
              : 'Describe the item — why you\'re selling it, what\'s included, any flaws...'
            }
            value={form.description} onChange={e => update('description', e.target.value)} required
            style={{ resize: 'vertical' }} />
        </div>

        {/* Tags */}
        <div className="form-group">
          <label className="form-label" htmlFor="sell-tags">Tags (optional, comma-separated)</label>
          <input id="sell-tags" className="form-input"
            placeholder={
              isService ? 'e.g. design, poster, logo'
              : isAdoption ? 'e.g. cat, kitten, adoption, free, pet'
              : isFood ? 'e.g. brownies, halal, dessert, homemade'
              : isPlant ? 'e.g. monstera, indoor, dorm, succulent'
              : 'e.g. engineering, math, textbook'
            }
            value={form.tags} onChange={e => update('tags', e.target.value)} />
        </div>

        {/* Seller Trust & Social Profile Info */}
        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 20, fontSize: '0.8125rem', color: 'var(--gray-600)' }}>
          <div style={{ fontWeight: 600, color: 'var(--blue-800)', marginBottom: 2 }}>
            <ShieldCheck size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Seller Campus Identity & Social Connections
          </div>
          <div>
            Your verified student profile ({user.faculty}, {user.campus}) and your linked social channels (Instagram, Telegram, LinkedIn) will appear on this listing to help buyers contact you faster.{' '}
            <Link to="/profile?tab=settings" style={{ color: 'var(--blue-800)', fontWeight: 600, textDecoration: 'underline' }}>
              Manage social handles in Profile Settings
            </Link>
          </div>
        </div>

        <button type="submit" className="btn-primary" style={{ width: '100%', height: 48 }}>
          {isService ? 'Publish Service' : isAdoption ? 'Publish Adoption / Free Item' : isFood ? 'Publish Food Listing' : 'Publish Listing'}
        </button>
      </form>
    </div>
  );
}
