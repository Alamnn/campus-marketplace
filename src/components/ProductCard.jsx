import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, MapPin, Briefcase, UtensilsCrossed, Flower2, PawPrint, Gift, Sparkles } from 'lucide-react';
import { getUser, toggleWishlist } from '../services/marketplaceStore';

function timeSince(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return 'Just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  if (s < 604800) return Math.floor(s / 86400) + 'd ago';
  return new Date(date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' });
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

export default function ProductCard({ product, onUpdate, showRecReason }) {
  const nav = useNavigate();
  const user = getUser();
  const isSaved = user?.wishlist?.includes(product.id);
  const isSold = product.status === 'sold';
  const isService = product.isService || product.category === 'services';
  const isAdoption = product.category === 'adoption';
  const isFood = product.category === 'food';
  const isPlant = product.category === 'plants';
  const isFree = isAdoption || product.price === 0 || product.isFree;

  const handleSave = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!user) { nav('/login'); return; }
    toggleWishlist(product.id);
    onUpdate?.();
  };

  const renderBadge = () => {
    if (isSold) return null;
    if (isService) {
      return (
        <span className="pcard-condition pcard-service-badge">
          <Briefcase size={10} style={{ marginRight: 3 }} /> Service
        </span>
      );
    }
    if (isAdoption) {
      return (
        <span className="pcard-condition pcard-adoption-badge">
          <PawPrint size={10} style={{ marginRight: 3 }} /> Free Adoption
        </span>
      );
    }
    if (isFood) {
      return (
        <span className="pcard-condition pcard-food-badge">
          <UtensilsCrossed size={10} style={{ marginRight: 3 }} /> Homemade
        </span>
      );
    }
    if (isPlant) {
      return (
        <span className="pcard-condition pcard-plant-badge">
          <Flower2 size={10} style={{ marginRight: 3 }} /> Plant
        </span>
      );
    }
    if (product.condition) {
      return <span className="pcard-condition">{product.condition}</span>;
    }
    return null;
  };

  const fallbackImg = FALLBACK_CATEGORY_IMAGES[product.category] || FALLBACK_CATEGORY_IMAGES.tech;

  return (
    <Link to={`/product/${product.id}`} className="pcard">
      <div className="pcard-img">
        <img
          src={product.images?.[0] || fallbackImg}
          alt={product.title}
          loading="lazy"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = fallbackImg;
          }}
        />

        {renderBadge()}

        <button className={`pcard-heart ${isSaved ? 'active' : ''}`} onClick={handleSave} aria-label="Save item">
          <Heart size={14} fill={isSaved ? 'currentColor' : 'none'} />
        </button>

        {isSold && (
          <div className="pcard-sold-overlay">Sold Out</div>
        )}
      </div>

      <div className="pcard-body">
        {showRecReason && product.recReason && (
          <div className="pcard-rec-pill" title={product.recReason}>
            <Sparkles size={11} style={{ marginRight: 4, flexShrink: 0 }} />
            <span>{product.recReason}</span>
          </div>
        )}

        <div className="pcard-price">
          {isService && product.priceLabel ? (
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--blue-800)' }}>
              {product.priceLabel}
            </span>
          ) : isFree ? (
            <span className="pcard-free-price">
              FREE <span className="pcard-free-tag">{isAdoption ? 'Adoption' : 'Giveaway'}</span>
            </span>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
              <span><span className="rm">RM</span>{product.price?.toLocaleString()}</span>
              {product.nonNegotiable && (
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--gray-500)', background: 'var(--gray-100)', border: '1px solid var(--gray-200)', padding: '1px 5px', borderRadius: 4 }}>
                  Fixed
                </span>
              )}
            </div>
          )}
        </div>
        <div className="pcard-title">{product.title}</div>
        <div className="pcard-meta">
          <span className="pcard-seller">
            <MapPin size={10} /> {product.campus || 'KD'}
          </span>
          <span>{timeSince(product.createdAt)}</span>
        </div>
      </div>
    </Link>
  );
}
