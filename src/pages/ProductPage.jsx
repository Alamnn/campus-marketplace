import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Heart, ArrowLeft, MapPin, Calendar, Eye, Share2, Flag, MessageCircle, Briefcase, Utensils, Leaf, Cat, ShieldCheck, Search as SearchIcon, CheckCircle, RotateCcw, Trash2, Tag, MessageSquare, X, Sparkles, Camera, Clock } from 'lucide-react';
import { InstagramIcon, TelegramIcon, LinkedInIcon, PortfolioIcon } from '../components/SocialIcons';
import ProductCard from '../components/ProductCard';
import { getProducts, getSellerForProduct, getUser, toggleWishlist, logView, submitReport, toggleStatus, toggleNegotiable, deleteProduct, getOrCreateChat, makeOffer } from '../services/marketplaceStore';

function timeSince(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 3600) return Math.floor(s / 60) + ' min ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  if (s < 604800) return Math.floor(s / 86400) + 'd ago';
  return new Date(date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
}

const FALLBACK_CATEGORY_IMAGES = {
  textbooks: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
  tech: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80',
  stationery: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
  'lab-equip': 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80',
  dorm: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80',
  fashion: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80',
  transport: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=800&q=80',
  services: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=800&q=80',
  food: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=800&q=80',
  plants: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=800&q=80',
  adoption: 'https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&w=800&q=80',
};

export default function ProductPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [tick, setTick] = useState(0);
  const [selectedImg, setSelectedImg] = useState(0);
  const products = useMemo(() => getProducts(), [tick]);
  const user = useMemo(() => getUser(), [tick]);
  const product = useMemo(() => products.find(p => p.id === id), [products, id]);

  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('');

  // Make an Offer state
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerPriceInput, setOfferPriceInput] = useState('');
  const [offerLocationInput, setOfferLocationInput] = useState('Campus Library (2nd Floor)');
  const [offerNoteInput, setOfferNoteInput] = useState('');

  useEffect(() => {
    const handler = () => setTick(t => t + 1);
    window.addEventListener('store_update', handler);
    return () => window.removeEventListener('store_update', handler);
  }, []);

  useEffect(() => {
    if (product) logView(product.id);
    window.scrollTo(0, 0);
    setSelectedImg(0);
  }, [id, product?.id]);

  const seller = product ? getSellerForProduct(product) : null;
  const isSaved = user?.wishlist?.includes(product?.id);
  const isOwner = user?.userId === product?.sellerId;
  const isService = product?.isService || product?.category === 'services';
  const isAdoption = product?.category === 'adoption';
  const isFood = product?.category === 'food';
  const isPlant = product?.category === 'plants';
  const isFree = isAdoption || product?.price === 0 || product?.isFree;

  // Similar items (same category)
  const similar = useMemo(() => {
    if (!product) return [];
    return products
      .filter(p => p.id !== product.id && p.category === product.category && p.status === 'available')
      .slice(0, 4);
  }, [products, product]);

  if (!product) {
    return (
      <div className="container" style={{ paddingTop: 60, paddingBottom: 60 }}>
        <div className="empty-state">
          <SearchIcon size={48} style={{ color: 'var(--gray-300)' }} />
          <h3>Listing not found</h3>
          <p>This item may have been removed or the link is incorrect.</p>
          <Link to="/" className="btn-primary mt-4">Back to Home</Link>
        </div>
      </div>
    );
  }

  const handleSave = () => {
    if (!user) { nav('/login'); return; }
    toggleWishlist(product.id);
    setTick(t => t + 1);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: product.title, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied!');
    }
  };

  const getWaText = () => {
    if (isAdoption) {
      return `Hi! I saw your adoption listing on Campus Marketplace for "${product.title}". I'd love to learn more and provide a loving home! Is the pet still available?`;
    }
    if (isFood) {
      return `Hi! I saw your homemade food listing on Campus Marketplace: "${product.title}" (RM ${product.price}). I'd like to check today's availability / place an order. Is it available?`;
    }
    if (isService) {
      return `Hi! I'm interested in your freelance service on Campus Marketplace: "${product.title}". Are you available for new projects?`;
    }
    if (isFree) {
      return `Hi! I saw your free item listing on Campus Marketplace: "${product.title}". Is it still available to pick up?`;
    }
    return `Hi! I'm interested in your listing on Campus Marketplace: "${product.title}" (RM ${product.price}). Is it still available?`;
  };

  const handleToggleSold = () => {
    if (!product) return;
    toggleStatus(product.id);
    setTick(t => t + 1);
  };

  const handleToggleNegotiable = () => {
    if (!product) return;
    toggleNegotiable(product.id);
    setTick(t => t + 1);
  };

  const handleDelete = () => {
    if (!product) return;
    if (window.confirm('Are you sure you want to permanently delete this listing?')) {
      deleteProduct(product.id);
      nav('/profile?tab=listings');
    }
  };

  const handleOpenChat = () => {
    if (!user) { nav('/login'); return; }
    if (!product || !seller) return;
    const chat = getOrCreateChat({
      buyerId: user.userId,
      sellerId: product.sellerId,
      productId: product.id
    });
    window.dispatchEvent(new CustomEvent('open_chat', { detail: { chatId: chat.id } }));
  };

  const handleOpenOfferModal = () => {
    if (!user) { nav('/login'); return; }
    if (!product) return;
    const suggested = Math.max(1, Math.round(product.price * 0.9));
    setOfferPriceInput(String(suggested));
    setShowOfferModal(true);
  };

  const handleSubmitOffer = (e) => {
    e.preventDefault();
    if (!user) { nav('/login'); return; }
    if (!product) return;
    const amt = parseFloat(offerPriceInput);
    if (isNaN(amt) || amt <= 0) return;

    const chat = getOrCreateChat({
      buyerId: user.userId,
      sellerId: product.sellerId,
      productId: product.id
    });

    const fullNote = `${offerLocationInput}${offerNoteInput ? ` • ${offerNoteInput.trim()}` : ''}`;
    makeOffer(chat.id, {
      buyerId: user.userId,
      amount: amt,
      note: fullNote
    });

    setShowOfferModal(false);
    window.dispatchEvent(new CustomEvent('open_chat', { detail: { chatId: chat.id } }));
  };

  const whatsappUrl = seller?.whatsapp
    ? `https://wa.me/${seller.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(getWaText())}`
    : null;

  return (
    <div className="container" style={{ paddingTop: 20, paddingBottom: 60 }}>
      {/* Back */}
      <button className="btn-ghost" onClick={() => nav(-1)} style={{ marginBottom: 16 }}>
        <ArrowLeft size={16} /> Back
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 32, maxWidth: 1080, margin: '0 auto' }}>
        {/* Desktop: 2-column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }} id="pd-layout">
          <style>{`@media (min-width: 768px) { #pd-layout { grid-template-columns: 1.2fr 1fr !important; } }`}</style>

          {/* Gallery */}
          <div>
            <div className="pd-gallery">
              <img
                src={product.images?.[selectedImg] || product.images?.[0] || (FALLBACK_CATEGORY_IMAGES[product.category] || FALLBACK_CATEGORY_IMAGES.tech)}
                alt={product.title}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = FALLBACK_CATEGORY_IMAGES[product.category] || FALLBACK_CATEGORY_IMAGES.tech;
                }}
              />
              {product.status === 'sold' && (
                <div className="pcard-sold-overlay" style={{ fontSize: '1.25rem' }}>Sold Out</div>
              )}
            </div>
            {product.images?.length > 1 && (
              <div className="pd-thumbs">
                {product.images.map((url, i) => (
                  <div
                    key={i}
                    className={`pd-thumb ${i === selectedImg ? 'active' : ''}`}
                    onClick={() => setSelectedImg(i)}
                    style={{ cursor: 'pointer' }}
                  >
                    <img
                      src={url}
                      alt=""
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = FALLBACK_CATEGORY_IMAGES[product.category] || FALLBACK_CATEGORY_IMAGES.tech;
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info panel */}
          <div>
            <div className="pd-price" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              {isService && product.priceLabel ? (
                <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--blue-800)' }}>{product.priceLabel}</span>
              ) : isFree ? (
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669', display: 'flex', alignItems: 'center', gap: 8 }}>
                  FREE <span style={{ fontSize: '0.8rem', background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0', padding: '3px 8px', borderRadius: 4, fontWeight: 700 }}>{isAdoption ? '100% Free Adoption' : 'Free Giveaway'}</span>
                </span>
              ) : (
                <><span className="rm">RM </span>{product.price?.toLocaleString()}</>
              )}

              {!isFree && (
                product.nonNegotiable ? (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: '#F1F5F9',
                      color: '#475569',
                      border: '1px solid #CBD5E1',
                      padding: '4px 10px',
                      borderRadius: 6,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    Fixed Price (Non-Negotiable)
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: '#EFF6FF',
                      color: '#1E40AF',
                      border: '1px solid #BFDBFE',
                      padding: '4px 10px',
                      borderRadius: 6,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    Price Negotiable
                  </span>
                )
              )}
            </div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, lineHeight: 1.4, marginBottom: 12 }}>
              {product.title}
            </h1>

            {/* Quick meta */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginBottom: 20, fontSize: '0.8125rem', color: 'var(--gray-500)' }}>
              {isService ? (
                <span className="pd-condition-badge" style={{ background: 'var(--blue-800)', color: '#fff' }}>
                  <Briefcase size={12} style={{ marginRight: 4 }} /> Service
                </span>
              ) : isAdoption ? (
                <span className="pd-condition-badge" style={{ background: '#059669', color: '#fff' }}>
                  <Cat size={12} style={{ marginRight: 4 }} /> {product.condition}
                </span>
              ) : isFood ? (
                <span className="pd-condition-badge" style={{ background: '#D97706', color: '#fff' }}>
                  <Utensils size={12} style={{ marginRight: 4 }} /> {product.condition || 'Fresh'}
                </span>
              ) : isPlant ? (
                <span className="pd-condition-badge" style={{ background: '#16A34A', color: '#fff' }}>
                  <Leaf size={12} style={{ marginRight: 4 }} /> {product.condition}
                </span>
              ) : (
                <span className="pd-condition-badge">{product.condition}</span>
              )}
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={12} /> {product.meetup}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Calendar size={12} /> {timeSince(product.createdAt)}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Eye size={12} /> {product.views || 0} views
              </span>
            </div>

            {/* Policy Notices for Adoption and Food */}
            {isAdoption && (
              <div style={{
                background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 'var(--radius-lg)',
                padding: '14px 16px', marginBottom: 20, display: 'flex', gap: 12
              }}>
                <Cat size={22} style={{ color: '#059669', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#065F46', marginBottom: 2 }}>
                    Campus Animal Welfare & Free Adoption Policy
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: '#047857', lineHeight: 1.5 }}>
                    Adoption on Campus Marketplace is strictly 100% free with no adoption fees. Please ensure you have pet permission from your hostel/landlord and arrange a safe public meetup on campus.
                  </p>
                </div>
              </div>
            )}

            {isFood && (
              <div style={{
                background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 'var(--radius-lg)',
                padding: '14px 16px', marginBottom: 20, display: 'flex', gap: 12
              }}>
                <Utensils size={22} style={{ color: '#D97706', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#92400E', marginBottom: 2 }}>
                    Student Homebakes & Snacks Notice
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: '#B45309', lineHeight: 1.5 }}>
                    Handcrafted in residential student kitchens. Please verify ingredients for allergens (nuts, dairy) and arrange fresh pickup at student hubs or cafeteria.
                  </p>
                </div>
              </div>
            )}

            {/* Seller Listing Controls (Owner only) */}
            {isOwner && (
              <div style={{
                background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 'var(--radius-md)',
                padding: '16px', marginBottom: 16
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#0369A1' }}>
                      Your Listing Controls
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: '#0284C7', marginTop: 2 }}>
                      Current Status: <strong>{product.status === 'available' ? 'Active & Available' : 'Sold Out'}</strong>
                    </div>
                  </div>
                  <span className={`tag ${product.status === 'available' ? 'tag-available' : 'tag-sold'}`}>
                    {product.status === 'available' ? 'Available' : 'Sold Out'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    className={product.status === 'available' ? 'btn-primary' : 'btn-outline'}
                    style={{
                      flex: 1, minWidth: 160, height: 38, fontSize: '0.8125rem',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      background: product.status === 'available' ? 'var(--blue-800)' : '#fff'
                    }}
                    onClick={handleToggleSold}
                  >
                    {product.status === 'available' ? (
                      <><CheckCircle size={15} /> Mark as Sold Out</>
                    ) : (
                      <><RotateCcw size={15} /> Re-list as Available</>
                    )}
                  </button>
                  <button
                    className="btn-outline"
                    style={{ height: 38, padding: '0 12px', fontSize: '0.8125rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    onClick={handleToggleNegotiable}
                    title="Toggle between fixed price and negotiable offers"
                  >
                    <Tag size={14} />
                    {product.nonNegotiable ? 'Set as Negotiable' : 'Set as Non-Negotiable'}
                  </button>
                  <button
                    className="btn-outline"
                    style={{ height: 38, padding: '0 14px', color: 'var(--red-600)', borderColor: '#FECACA', fontSize: '0.8125rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    onClick={handleDelete}
                  >
                    <Trash2 size={15} /> Delete
                  </button>
                </div>
              </div>
            )}

            {/* Sold Out Notice for Buyers */}
            {product.status === 'sold' && !isOwner && (
              <div style={{
                background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--radius-md)',
                padding: '14px 16px', marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 12
              }}>
                <CheckCircle size={20} style={{ color: '#DC2626', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#991B1B', marginBottom: 2 }}>
                    This listing is Sold Out
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: '#B91C1C', lineHeight: 1.45, margin: 0 }}>
                    The seller has marked this item as sold or claimed. Direct inquiries via WhatsApp are closed.
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {!isOwner && product.status === 'available' && (
                <>
                  {!isFree && !product.nonNegotiable && (
                    <button
                      className="btn-primary"
                      onClick={handleOpenOfferModal}
                      style={{
                        height: 44,
                        fontSize: '0.9375rem',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        background: 'var(--blue-900)',
                        boxShadow: 'var(--shadow-md)'
                      }}
                    >
                      <Tag size={18} /> Make an Offer
                    </button>
                  )}

                  <button
                    className={product.nonNegotiable ? "btn-primary" : "btn-outline"}
                    onClick={handleOpenChat}
                    style={{
                      height: 44,
                      fontSize: '0.9375rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      background: product.nonNegotiable ? 'var(--blue-900)' : 'transparent',
                      borderColor: 'var(--blue-800)',
                      color: product.nonNegotiable ? '#ffffff' : 'var(--blue-900)',
                      boxShadow: product.nonNegotiable ? 'var(--shadow-md)' : 'none'
                    }}
                  >
                    <MessageSquare size={18} /> Chat with Seller (In-App)
                  </button>

                  {product.nonNegotiable && !isFree && (
                    <div style={{
                      fontSize: '0.8125rem',
                      color: 'var(--gray-600)',
                      background: '#F8FAFC',
                      border: '1px solid var(--gray-200)',
                      borderRadius: 8,
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}>
                      <Tag size={14} color="var(--gray-500)" style={{ flexShrink: 0 }} />
                      <span>
                        Seller specified price is <strong>Fixed (Non-negotiable)</strong>. Inquiries & campus pickup can be arranged via chat.
                      </span>
                    </div>
                  )}
                </>
              )}

              {!isOwner && whatsappUrl && product.status === 'available' && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-whatsapp"
                  style={{ height: 44, fontSize: '0.9rem', fontWeight: 700 }}
                >
                  <MessageCircle size={18} />
                  {isService
                    ? 'Hire via WhatsApp'
                    : isAdoption
                    ? 'Inquire About Adoption (WhatsApp)'
                    : isFood
                    ? 'Order via WhatsApp'
                    : isFree
                    ? 'Claim via WhatsApp'
                    : 'Chat on WhatsApp'}
                </a>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-outline" style={{ flex: 1 }} onClick={handleSave}>
                  <Heart size={16} fill={isSaved ? 'currentColor' : 'none'}
                    color={isSaved ? 'var(--red-600)' : 'currentColor'} />
                  {isSaved ? 'Saved' : 'Save'}
                </button>
                <button className="btn-outline" style={{ flex: 1 }} onClick={handleShare}>
                  <Share2 size={16} /> Share
                </button>
              </div>
            </div>

            {/* Seller card with Social Media Profiles & Bio */}
            {seller && (
              <div className="pd-seller-card" style={{ marginBottom: 24, flexDirection: 'column', alignItems: 'stretch' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="avatar" style={{ width: 44, height: 44, fontSize: '1.1rem' }}>
                    {seller.fullName?.charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--gray-900)' }}>
                        {seller.fullName}
                      </span>
                      <span className="seller-verified-tag">
                        <ShieldCheck size={12} /> Campus Verified
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: 2 }}>
                      {seller.faculty} · {seller.campus} Campus · Joined {seller.joined}
                    </div>
                  </div>
                </div>

                {seller.bio && (
                  <div style={{ fontSize: '0.8125rem', color: 'var(--gray-600)', margin: '10px 0 6px', lineHeight: 1.45, fontStyle: 'normal' }}>
                    "{seller.bio}"
                  </div>
                )}

                {/* Social media connections */}
                {(seller.instagram || seller.telegram || seller.linkedin || seller.portfolio) && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8, paddingTop: 10, borderTop: '1px solid var(--gray-100)' }}>
                    {seller.instagram && (
                      <a
                        href={`https://instagram.com/${seller.instagram.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="seller-social-chip ig"
                        title={`Instagram: @${seller.instagram.replace('@', '')}`}
                      >
                        <InstagramIcon size={13} />
                        <span>@{seller.instagram.replace('@', '')}</span>
                      </a>
                    )}

                    {seller.telegram && (
                      <a
                        href={`https://t.me/${seller.telegram.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="seller-social-chip tg"
                        title={`Telegram: @${seller.telegram.replace('@', '')}`}
                      >
                        <TelegramIcon size={12} />
                        <span>@{seller.telegram.replace('@', '')}</span>
                      </a>
                    )}

                    {seller.linkedin && (
                      <a
                        href={seller.linkedin.startsWith('http') ? seller.linkedin : `https://${seller.linkedin}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="seller-social-chip in"
                        title="LinkedIn Profile"
                      >
                        <LinkedInIcon size={12} />
                        <span>LinkedIn</span>
                      </a>
                    )}

                    {seller.portfolio && (
                      <a
                        href={seller.portfolio.startsWith('http') ? seller.portfolio : `https://${seller.portfolio}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="seller-social-chip pf"
                        title="Portfolio / Website"
                      >
                        <PortfolioIcon size={12} />
                        <span>Portfolio</span>
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: 8 }}>Description</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--gray-600)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                {product.description}
              </p>
            </div>

            {/* Details */}
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: 12 }}>Details</h3>
              <div className="pd-specs">
                <div className="pd-spec">
                  <dt>Category</dt>
                  <dd>{product.category?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</dd>
                </div>
                <div className="pd-spec">
                  <dt>{isService ? 'Service Type' : 'Condition'}</dt>
                  <dd>{isService ? (product.serviceType || 'General') : product.condition}</dd>
                </div>
                <div className="pd-spec">
                  <dt>Campus</dt>
                  <dd>{product.campus}</dd>
                </div>
                <div className="pd-spec">
                  <dt>Meetup</dt>
                  <dd>{product.meetup}</dd>
                </div>
                {product.faculty && (
                  <div className="pd-spec">
                    <dt>Faculty</dt>
                    <dd>{product.faculty}</dd>
                  </div>
                )}
              </div>
            </div>

            {/* Tags */}
            {product.tags?.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 24 }}>
                {product.tags.map(t => (
                  <Link key={t} to={`/?q=${encodeURIComponent(t)}`}
                    style={{
                      padding: '4px 10px', background: 'var(--gray-100)', borderRadius: 'var(--radius-full)',
                      fontSize: '0.75rem', color: 'var(--gray-600)'
                    }}>
                    #{t}
                  </Link>
                ))}
              </div>
            )}

            {/* Report */}
            {!isOwner && (
              <div>
                {!showReport ? (
                  <button className="btn-ghost" style={{ color: 'var(--gray-400)', fontSize: '0.75rem' }}
                    onClick={() => setShowReport(true)}>
                    <Flag size={12} /> Report this listing
                  </button>
                ) : (
                  <div style={{
                    padding: 16, border: '1px solid var(--gray-200)',
                    borderRadius: 'var(--radius-lg)', background: 'var(--gray-50)'
                  }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 8 }}>Report listing</div>
                    <select className="form-input" value={reportReason} onChange={e => setReportReason(e.target.value)}
                      style={{ marginBottom: 8 }}>
                      <option value="">Select a reason</option>
                      <option value="spam">Spam or misleading</option>
                      <option value="prohibited">Prohibited item</option>
                      <option value="scam">Suspected scam</option>
                      <option value="inappropriate">Inappropriate content</option>
                    </select>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn-primary" style={{ height: 36, fontSize: '0.8125rem', padding: '0 16px' }}
                        onClick={() => {
                          if (reportReason) {
                            submitReport({ productId: product.id, reason: reportReason });
                            setShowReport(false);
                            alert('Report submitted. Thank you!');
                          }
                        }}>Submit</button>
                      <button className="btn-outline" style={{ height: 36, fontSize: '0.8125rem', padding: '0 16px' }}
                        onClick={() => setShowReport(false)}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Similar listings */}
        {similar.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <h3 className="section-title">More like this</h3>
            <div className="product-grid">
              {similar.map(p => <ProductCard key={p.id} product={p} onUpdate={() => setTick(t => t + 1)} />)}
            </div>
          </div>
        )}
      </div>

      {/* Make an Offer Modal Dialog */}
      {showOfferModal && product && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 140,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            padding: 16
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowOfferModal(false); }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              maxWidth: 460,
              width: '100%',
              padding: 24,
              boxShadow: 'var(--shadow-xl)',
              border: '1px solid var(--gray-200)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Tag size={18} color="var(--blue-900)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--gray-900)' }}>
                    Make an Offer
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                    Direct peer negotiation with {seller?.fullName || 'student seller'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowOfferModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Item snippet */}
            <div style={{ display: 'flex', gap: 12, padding: 12, background: 'var(--gray-50)', borderRadius: 10, marginBottom: 16, border: '1px solid var(--gray-200)' }}>
              <img
                src={product.images?.[0] || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=100&auto=format&fit=crop&q=80'}
                alt={product.title}
                style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--gray-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {product.title}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: 2 }}>
                  Listed Price: <strong style={{ color: 'var(--blue-900)' }}>RM {Number(product.price).toFixed(2)}</strong>
                </div>
              </div>
            </div>

            {/* Quick Discount Presets */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-600)', marginBottom: 6 }}>
                Quick Discount Presets:
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[5, 10, 15, 20].map((pct) => {
                  const calculated = Math.max(1, Math.round(product.price * (1 - pct / 100)));
                  const isSelected = offerPriceInput === String(calculated);
                  return (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setOfferPriceInput(String(calculated))}
                      style={{
                        flex: 1,
                        padding: '6px 0',
                        borderRadius: 6,
                        border: isSelected ? '2px solid var(--blue-800)' : '1px solid var(--gray-300)',
                        background: isSelected ? '#EFF6FF' : '#ffffff',
                        color: isSelected ? 'var(--blue-900)' : 'var(--gray-700)',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        cursor: 'pointer'
                      }}
                    >
                      -{pct}% (RM {calculated})
                    </button>
                  );
                })}
              </div>
            </div>

            <form onSubmit={handleSubmitOffer}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--gray-800)', marginBottom: 6 }}>
                  Your Offer Amount (RM) *
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: 'var(--gray-500)', fontSize: '1rem' }}>
                    RM
                  </span>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max={product.price * 2}
                    required
                    value={offerPriceInput}
                    onChange={(e) => setOfferPriceInput(e.target.value)}
                    placeholder="e.g. 38"
                    style={{
                      width: '100%',
                      height: 44,
                      paddingLeft: 48,
                      paddingRight: 14,
                      borderRadius: 8,
                      border: '1px solid var(--gray-300)',
                      fontSize: '1.05rem',
                      fontWeight: 800,
                      color: 'var(--blue-900)'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--gray-800)', marginBottom: 6 }}>
                  Campus Meetup Zone
                </label>
                <select
                  value={offerLocationInput}
                  onChange={(e) => setOfferLocationInput(e.target.value)}
                  style={{
                    width: '100%',
                    height: 40,
                    padding: '0 12px',
                    borderRadius: 8,
                    border: '1px solid var(--gray-300)',
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="Campus Library (2nd Floor)">Campus Library (2nd Floor)</option>
                  <option value="Student Hub Cafeteria">Student Hub Cafeteria</option>
                  <option value="Main Tower Entrance">Main Tower Entrance</option>
                  <option value="Faculty of Engineering Block">Faculty of Engineering Block</option>
                  <option value="Hostel / Dormitory Lobby">Hostel / Dormitory Lobby</option>
                </select>
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--gray-800)', marginBottom: 6 }}>
                  Meetup Note / Inspection Details (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Can meet tomorrow 2pm between lectures, paying via DuitNow QR or Cash."
                  value={offerNoteInput}
                  onChange={(e) => setOfferNoteInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--gray-300)',
                    fontSize: '0.8125rem',
                    resize: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setShowOfferModal(false)}
                  style={{ flex: 1, height: 42 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={!offerPriceInput || parseFloat(offerPriceInput) <= 0}
                  style={{ flex: 1, height: 42, background: 'var(--blue-900)' }}
                >
                  Submit Offer & Open Chat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
