import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Compass, BookMarked, Laptop, Pencil, Microscope, Home, Shirt, Car, Briefcase, 
  X, ChevronRight, UtensilsCrossed, Flower2, PawPrint, Sparkles, TrendingUp, Search as SearchIcon,
  Gift, Zap, GraduationCap, Tag, Clock, BookOpen, Utensils
} from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { getProducts, getPersonalizedRecommendations, recordCategoryView, recordSearch, searchProducts, getPreferences } from '../services/marketplaceStore';
import { CATEGORIES } from '../data/seedData';

const CAT_ICONS = {
  Compass,
  UtensilsCrossed,
  Flower2,
  PawPrint,
  BookMarked,
  Laptop,
  Pencil,
  Microscope,
  Home,
  Shirt,
  Car,
  Briefcase
};

export default function HomePage({ user }) {
  const [params, setParams] = useSearchParams();
  const [products, setProducts] = useState(getProducts);
  const [tick, setTick] = useState(0);

  const catFilter = params.get('cat') || 'all';
  const searchQ = params.get('q') || '';
  const [sortBy, setSortBy] = useState('relevance');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [conditionFilter, setConditionFilter] = useState('all');
  const [dealFilter, setDealFilter] = useState('all');

  const userPrefs = useMemo(() => getPreferences(user?.userId), [user, tick]);
  const hasActivity = useMemo(() => {
    return Boolean(
      (user?.wishlist && user.wishlist.length > 0) ||
      (userPrefs.recentViews && userPrefs.recentViews.length > 0) ||
      (userPrefs.recentSearches && userPrefs.recentSearches.length > 0) ||
      (userPrefs.categories && Object.keys(userPrefs.categories).length > 0)
    );
  }, [user, userPrefs]);

  useEffect(() => {
    const handler = () => { setProducts(getProducts()); setTick(t => t + 1); };
    window.addEventListener('store_update', handler);
    return () => window.removeEventListener('store_update', handler);
  }, []);

  // Track search query to continuously refine recommendations
  useEffect(() => {
    if (searchQ && searchQ.trim()) {
      recordSearch(searchQ.trim());
    }
  }, [searchQ]);

  const setCategory = (id) => {
    const p = new URLSearchParams(params);
    if (id === 'all') p.delete('cat'); else p.set('cat', id);
    setParams(p);
    if (id !== 'all') {
      recordCategoryView(id);
    }
  };

  // Filter categories to exclude 'activities'
  const displayCategories = useMemo(() =>
    CATEGORIES.filter(c => c.id !== 'activities'), []);

  const activeCategory = useMemo(() =>
    displayCategories.find(c => c.id === catFilter), [displayCategories, catFilter]);

  // Unified feed logic:
  // When searchQ is present: display precise relevance-scored search results with optional sort & filters
  // When searchQ is NOT present: the ENTIRE home feed is the user's recommendation feed based on their activity
  const feedProducts = useMemo(() => {
    let list;
    if (searchQ) {
      list = searchProducts(products, searchQ);

      if (statusFilter === 'available') list = list.filter(p => p.status === 'available');
      else if (statusFilter === 'sold') list = list.filter(p => p.status === 'sold');

      if (catFilter !== 'all') list = list.filter(p => p.category === catFilter);
      if (conditionFilter !== 'all') list = list.filter(p => p.condition === conditionFilter);
      if (priceMin) list = list.filter(p => p.price >= parseFloat(priceMin));
      if (priceMax) list = list.filter(p => p.price <= parseFloat(priceMax));

      switch (sortBy) {
        case 'price-low': list.sort((a, b) => a.price - b.price); break;
        case 'price-high': list.sort((a, b) => b.price - a.price); break;
        case 'popular': list.sort((a, b) => (b.saves || b.favoritesCount || 0) - (a.saves || a.favoritesCount || 0)); break;
        case 'newest': list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); break;
        // 'relevance' (default) preserves the accurate score ranking from searchProducts
        default: break;
      }
    } else {
      // Entire home feed is user recommendation based on their activity
      list = getPersonalizedRecommendations(user, {
        filterCategory: catFilter !== 'all' ? catFilter : null,
        limit: null
      });
    }

    if (dealFilter === 'free') {
      list = list.filter(p => p.price === 0 || p.category === 'adoption' || p.isFree);
    } else if (dealFilter === 'under15') {
      list = list.filter(p => p.price > 0 && p.price <= 15);
    } else if (dealFilter === 'under50') {
      list = list.filter(p => p.price > 0 && p.price <= 50);
    } else if (dealFilter === 'graduating') {
      list = list.filter(p => (p.price <= 35) || /graduat|moving|urgent|clearance/i.test(`${p.title} ${p.description}`));
    } else if (dealFilter === 'textbooks') {
      list = list.filter(p => p.category === 'textbooks');
    } else if (dealFilter === 'tech') {
      list = list.filter(p => p.category === 'tech');
    } else if (dealFilter === 'food') {
      list = list.filter(p => p.category === 'food');
    } else if (dealFilter === 'urgent') {
      list = list.filter(p => /urgent|today|asap|fast|moving|clear/i.test(`${p.title} ${p.description}`) || p.condition === 'like_new');
    }

    return list;
  }, [products, catFilter, searchQ, sortBy, statusFilter, priceMin, priceMax, conditionFilter, dealFilter, user, tick]);

  const hasSearchFilters = searchQ && (catFilter !== 'all' || statusFilter !== 'all' || priceMin || priceMax || conditionFilter !== 'all' || sortBy !== 'newest');

  const clearFilters = () => {
    setParams({});
    setStatusFilter('all');
    setSortBy('newest');
    setPriceMin('');
    setPriceMax('');
    setConditionFilter('all');
  };

  return (
    <>
      {/* Category bar */}
      <div className="category-bar">
        <div className="container">
          <div className="category-bar-inner">
            {displayCategories.map(cat => {
              const Icon = CAT_ICONS[cat.icon] || LayoutGrid;
              return (
                <button
                  key={cat.id}
                  className={`cat-chip ${catFilter === cat.id ? 'active' : ''}`}
                  onClick={() => setCategory(cat.id)}
                >
                  <Icon size={14} />
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="container" style={{ paddingTop: 20, paddingBottom: 60 }}>

        {/* Search header & filters — ONLY shown when someone searches */}
        {searchQ ? (
          <>
            <div style={{ marginBottom: 16 }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--gray-900)', margin: 0 }}>
                Results for "{searchQ}"
              </h1>
              <p style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginTop: 4 }}>
                {feedProducts.length} {feedProducts.length === 1 ? 'item' : 'items'} found
              </p>
            </div>

            {/* Filter and Sort bar for search */}
            <div className="filter-bar">
              <select className="filter-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                <option value="relevance">Most Relevant</option>
                <option value="newest">Newest First</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="popular">Most Saved</option>
              </select>

              <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="all">All Items (Available & Sold)</option>
                <option value="available">Available Only</option>
                <option value="sold">Sold Out Only</option>
              </select>

              <select className="filter-select" value={conditionFilter} onChange={e => setConditionFilter(e.target.value)}>
                <option value="all">Any Condition</option>
                <option value="Brand New">Brand New</option>
                <option value="Like New">Like New</option>
                <option value="Lightly Used">Lightly Used</option>
                <option value="Well Used">Well Used</option>
              </select>

              <div className="filter-price-group">
                <input
                  className="filter-price-input"
                  type="number"
                  placeholder="Min RM"
                  value={priceMin}
                  onChange={e => setPriceMin(e.target.value)}
                />
                <span style={{ color: 'var(--gray-400)', fontSize: '0.75rem' }}>–</span>
                <input
                  className="filter-price-input"
                  type="number"
                  placeholder="Max RM"
                  value={priceMax}
                  onChange={e => setPriceMax(e.target.value)}
                />
              </div>

              {hasSearchFilters && (
                <button className="filter-clear" onClick={clearFilters}>
                  <X size={12} style={{ verticalAlign: 'middle', marginRight: 2 }} /> Clear
                </button>
              )}

              <span className="results-count">{feedProducts.length} listings</span>
            </div>
          </>
        ) : (
          /* Browsing mode: NO filter bar. Clean recommendation feed header */
          <>
            {/* Food banner */}
            {catFilter === 'food' && (
              <div style={{
                background: 'linear-gradient(135deg, #78350F 0%, #92400E 100%)',
                borderRadius: 12, padding: '20px 24px', marginBottom: 20,
                color: '#fff', display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', flexWrap: 'wrap', gap: 12
              }}>
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 4 }}>
                    Homemade Food, Bakes & Student Snacks
                  </div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                    Freshly prepared meals, fudgy brownies, cold brews, and snacks made by fellow students and campus cooks.
                  </div>
                </div>
                {user && (
                  <Link to="/sell?cat=food" style={{
                    padding: '8px 20px', background: 'rgba(255,255,255,0.18)',
                    border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8,
                    color: '#fff', fontWeight: 600, fontSize: '0.8rem',
                    textDecoration: 'none', whiteSpace: 'nowrap'
                  }}>
                    Sell Food / Snacks
                  </Link>
                )}
              </div>
            )}

            {/* Plants banner */}
            {catFilter === 'plants' && (
              <div style={{
                background: 'linear-gradient(135deg, #14532D 0%, #166534 100%)',
                borderRadius: 12, padding: '20px 24px', marginBottom: 20,
                color: '#fff', display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', flexWrap: 'wrap', gap: 12
              }}>
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 4 }}>
                    Dorm Plants & Greenery
                  </div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                    Rooted cuttings, low-maintenance desk succulents, and air-purifying plants for student hostels and study rooms.
                  </div>
                </div>
                {user && (
                  <Link to="/sell?cat=plants" style={{
                    padding: '8px 20px', background: 'rgba(255,255,255,0.18)',
                    border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8,
                    color: '#fff', fontWeight: 600, fontSize: '0.8rem',
                    textDecoration: 'none', whiteSpace: 'nowrap'
                  }}>
                    List a Plant
                  </Link>
                )}
              </div>
            )}

            {/* Pet adoption & free banner */}
            {catFilter === 'adoption' && (
              <div style={{
                background: 'linear-gradient(135deg, #064E3B 0%, #047857 100%)',
                borderRadius: 12, padding: '20px 24px', marginBottom: 20,
                color: '#fff', display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', flexWrap: 'wrap', gap: 12
              }}>
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 4 }}>
                    Campus Cat Adoption & Free Giveaways
                  </div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                    Rescued campus cats looking for loving forever homes and free student supplies from graduating peers. All items here are 100% FREE.
                  </div>
                </div>
                {user && (
                  <Link to="/sell?cat=adoption" style={{
                    padding: '8px 20px', background: 'rgba(255,255,255,0.18)',
                    border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8,
                    color: '#fff', fontWeight: 600, fontSize: '0.8rem',
                    textDecoration: 'none', whiteSpace: 'nowrap'
                  }}>
                    Post Adoption / Free Item
                  </Link>
                )}
              </div>
            )}

            {/* Services banner */}
            {catFilter === 'services' && (
              <div style={{
                background: 'linear-gradient(135deg, #0D2C6C 0%, #1E3A6E 100%)',
                borderRadius: 12, padding: '20px 24px', marginBottom: 20,
                color: '#fff', display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', flexWrap: 'wrap', gap: 12
              }}>
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 4 }}>
                    Freelance Services by Campus Students
                  </div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                    Graphic design, photography, tutoring, web dev, and more — hire talented students for your projects.
                  </div>
                </div>
                {user && (
                  <Link to="/sell?cat=services" style={{
                    padding: '8px 20px', background: 'rgba(255,255,255,0.15)',
                    border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8,
                    color: '#fff', fontWeight: 600, fontSize: '0.8rem',
                    textDecoration: 'none', whiteSpace: 'nowrap'
                  }}>
                    Offer a Service
                  </Link>
                )}
              </div>
            )}

            {/* Quick Deals & Student Clearance Pills */}
            <div className="quick-deals-bar">
              <span className="quick-deals-label" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap', marginRight: 4 }}>
                Quick Deals:
              </span>
              {[
                { id: 'all', label: 'All Items', icon: Sparkles },
                { id: 'free', label: 'Free & Giveaways', icon: Gift },
                { id: 'under15', label: 'Steals Under RM 15', icon: Zap },
                { id: 'under50', label: 'Budget Under RM 50', icon: Tag },
                { id: 'graduating', label: 'Move-Out Clearance', icon: GraduationCap },
                { id: 'textbooks', label: 'Textbooks', icon: BookOpen },
                { id: 'tech', label: 'Laptops & Tech', icon: Laptop },
                { id: 'food', label: 'Food & Snacks', icon: Utensils },
                { id: 'urgent', label: 'Urgent Pickup', icon: Clock }
              ].map(d => {
                const isActive = dealFilter === d.id;
                const IconComponent = d.icon;
                return (
                  <button
                    key={d.id}
                    onClick={() => setDealFilter(d.id)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 14px',
                      borderRadius: 20,
                      fontSize: '0.8rem',
                      fontWeight: isActive ? 700 : 500,
                      border: isActive ? '1.5px solid #2563EB' : '1px solid var(--gray-300)',
                      background: isActive ? '#EFF6FF' : 'var(--white)',
                      color: isActive ? '#1D4ED8' : 'var(--gray-700)',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {IconComponent && <IconComponent size={13} color={isActive ? '#2563EB' : 'currentColor'} />}
                    <span>{d.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Unified Feed Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 18,
              flexWrap: 'wrap',
              gap: 10
            }}>
              <div>
                <h1 style={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: 'var(--gray-900)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  margin: 0
                }}>
                  {catFilter === 'all' ? (
                    hasActivity ? (
                      <>
                        <Sparkles size={18} style={{ color: '#D97706' }} /> Recommended For You
                      </>
                    ) : (
                      <>
                        <TrendingUp size={18} style={{ color: '#0D2C6C' }} /> Trending on Campus
                      </>
                    )
                  ) : (
                    activeCategory?.name || 'Category'
                  )}
                </h1>
                <p style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginTop: 4 }}>
                  {catFilter === 'all'
                    ? (hasActivity
                        ? 'Curated feed based on your campus interests, saved items, and browsing'
                        : 'Explore popular student picks, verified campus essentials, and latest listings')
                    : `Browse listings and campus offers in ${activeCategory?.name || 'this category'}`
                  }
                </p>
              </div>

              <span className="results-count" style={{ color: 'var(--gray-500)', fontSize: '0.8125rem', fontWeight: 600 }}>
                {feedProducts.length} {feedProducts.length === 1 ? 'item' : 'items'}
              </span>
            </div>
          </>
        )}

        {/* Product Grid — The unified recommendation feed */}
        {feedProducts.length > 0 ? (
          <div className="product-grid">
            {feedProducts.map(p => (
              <ProductCard
                key={p.id}
                product={p}
                showRecReason={!searchQ && Boolean(hasActivity && p.recReason && p.recReason !== 'Trending on campus')}
                onUpdate={() => setTick(t => t + 1)}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <SearchIcon size={48} style={{ color: 'var(--gray-300)', marginBottom: 8 }} />
            <h3>No listings found</h3>
            <p>Try adjusting your search query or browsing another category.</p>
            {searchQ && (
              <button className="btn-outline mt-4" onClick={clearFilters}>Clear Search</button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
