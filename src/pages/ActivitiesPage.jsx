import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Users, Clock, ChevronRight, Filter, Search } from 'lucide-react';
import { getActivities, joinActivity, getUser } from '../services/marketplaceStore';
import { SEGI_CLUBS, CAMPUS_CLUBS } from '../data/seedData';

export default function ActivitiesPage({ user }) {
  const [activities, setActivities] = useState([]);
  const [selectedType, setSelectedType] = useState('all');
  const [searchQ, setSearchQ] = useState('');

  useEffect(() => {
    setActivities(getActivities());
    const handler = () => setActivities(getActivities());
    window.addEventListener('store_update', handler);
    return () => window.removeEventListener('store_update', handler);
  }, []);

  const types = [
    { id: 'all', label: 'All' },
    { id: 'volunteer', label: 'Volunteering' },
    { id: 'event', label: 'Events & Competitions' },
    { id: 'audition', label: 'Auditions' },
    { id: 'workshop', label: 'Workshops' }
  ];

  const filtered = useMemo(() => {
    let list = [...activities];
    if (selectedType !== 'all') list = list.filter(a => a.type === selectedType);
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase();
      list = list.filter(a =>
        a.title.toLowerCase().includes(q) ||
        a.clubName.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.tags?.some(t => t.includes(q))
      );
    }
    return list;
  }, [activities, selectedType, searchQ]);

  const handleJoin = (id) => {
    if (!user) return;
    joinActivity(id);
  };

  const fmtDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-MY', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'volunteer': return { bg: '#EFF6FF', color: '#1E40AF', label: 'Volunteer' };
      case 'event': return { bg: '#FEF3C7', color: '#92400E', label: 'Event' };
      case 'audition': return { bg: '#F3E8FF', color: '#6B21A8', label: 'Audition' };
      case 'workshop': return { bg: '#ECFDF5', color: '#065F46', label: 'Workshop' };
      default: return { bg: '#F1F5F9', color: '#334155', label: type };
    }
  };

  const spotsLeft = (a) => Math.max(0, a.spots - a.filled);
  const isDeadlinePassed = (a) => a.deadline && new Date(a.deadline) < new Date();

  // Group clubs by category for sidebar
  const clubsByCategory = useMemo(() => {
    const map = {};
    (CAMPUS_CLUBS || SEGI_CLUBS).forEach(c => {
      if (!map[c.category]) map[c.category] = [];
      map[c.category].push(c);
    });
    return map;
  }, []);

  return (
    <div className="page-activities">
      <div className="container" style={{ paddingTop: 32, paddingBottom: 64 }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--gray-900)', marginBottom: 6 }}>
            Campus Activities
          </h1>
          <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem', maxWidth: 600 }}>
            Clubs and societies looking for volunteers, performers, team members, and more. 
            Get involved, earn SEP hours, and build your portfolio.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
          {/* Main content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Search + filters */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: '1 1 240px' }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)', pointerEvents: 'none' }} />
                <input
                  type="text"
                  placeholder="Search activities..."
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  style={{
                    width: '100%', height: 40, padding: '0 12px 0 38px',
                    border: '1px solid var(--gray-300)', borderRadius: 8,
                    fontSize: '0.875rem', background: '#fff'
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {types.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedType(t.id)}
                    style={{
                      padding: '6px 14px', borderRadius: 20,
                      fontSize: '0.8rem', fontWeight: 600,
                      border: selectedType === t.id ? '2px solid var(--primary)' : '1px solid var(--gray-300)',
                      background: selectedType === t.id ? 'var(--primary)' : '#fff',
                      color: selectedType === t.id ? '#fff' : 'var(--gray-600)',
                      cursor: 'pointer', transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Activity cards */}
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--gray-500)' }}>
                <Users size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
                <p style={{ fontWeight: 600 }}>No activities found</p>
                <p style={{ fontSize: '0.85rem' }}>Try a different filter or check back later.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {filtered.map(a => {
                  const tc = getTypeColor(a.type);
                  const spots = spotsLeft(a);
                  const closed = isDeadlinePassed(a) || spots === 0;
                  return (
                    <div key={a.id} className="activity-card" style={{
                      background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 12,
                      padding: '20px 24px', transition: 'box-shadow 0.15s ease',
                      opacity: closed ? 0.6 : 1,
                      position: 'relative'
                    }}
                    onMouseOver={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)'}
                    onMouseOut={e => e.currentTarget.style.boxShadow = 'none'}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <span style={{
                              padding: '3px 10px', borderRadius: 20,
                              fontSize: '0.7rem', fontWeight: 700,
                              background: tc.bg, color: tc.color,
                              textTransform: 'uppercase', letterSpacing: '0.5px'
                            }}>
                              {tc.label}
                            </span>
                            <span style={{ fontSize: '0.78rem', color: 'var(--gray-500)' }}>
                              {a.clubName}
                            </span>
                          </div>
                          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--gray-900)', lineHeight: 1.3 }}>
                            {a.title}
                          </h3>
                        </div>
                        {!closed && user && (
                          <button
                            onClick={() => handleJoin(a.id)}
                            style={{
                              padding: '8px 18px', borderRadius: 8,
                              background: 'var(--primary)', color: '#fff',
                              border: 'none', fontSize: '0.8rem', fontWeight: 700,
                              cursor: 'pointer', whiteSpace: 'nowrap',
                              flexShrink: 0
                            }}
                          >
                            Join
                          </button>
                        )}
                        {closed && (
                          <span style={{
                            padding: '6px 14px', borderRadius: 8,
                            background: 'var(--gray-100)', color: 'var(--gray-500)',
                            fontSize: '0.78rem', fontWeight: 600, flexShrink: 0
                          }}>
                            {spots === 0 ? 'Full' : 'Closed'}
                          </span>
                        )}
                      </div>

                      <p style={{ fontSize: '0.85rem', color: 'var(--gray-600)', lineHeight: 1.6, marginBottom: 14, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {a.description}
                      </p>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px', fontSize: '0.78rem', color: 'var(--gray-500)' }}>
                        {a.date && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Calendar size={13} /> {fmtDate(a.date)}
                          </span>
                        )}
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={13} /> {a.campus}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Users size={13} /> {spots}/{a.spots} spots left
                        </span>
                        {a.deadline && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Clock size={13} /> Apply by {fmtDate(a.deadline)}
                          </span>
                        )}
                      </div>

                      {a.tags?.length > 0 && (
                        <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
                          {a.tags.map(t => (
                            <span key={t} style={{
                              padding: '2px 8px', borderRadius: 4,
                              background: 'var(--gray-100)', color: 'var(--gray-600)',
                              fontSize: '0.7rem'
                            }}>#{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sidebar — Clubs directory (desktop only) */}
          <aside className="clubs-sidebar" style={{
            width: 280, flexShrink: 0,
            position: 'sticky', top: 80
          }}>
            <div style={{
              background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 12,
              padding: '20px 18px'
            }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--gray-900)', marginBottom: 16 }}>
                Campus Clubs & Societies
              </h3>
              {Object.entries(clubsByCategory).map(([cat, clubs]) => (
                <div key={cat} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
                    {cat}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {clubs.map(c => (
                      <div key={c.id} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '4px 6px', borderRadius: 6,
                        fontSize: '0.78rem', color: 'var(--gray-700)',
                        cursor: 'default'
                      }}
                      onMouseOver={e => e.currentTarget.style.background = 'var(--gray-50)'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <span style={{ fontSize: '0.9rem' }}>{c.icon}</span>
                        <span style={{ lineHeight: 1.2 }}>{c.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <p style={{ fontSize: '0.7rem', color: 'var(--gray-400)', marginTop: 8 }}>
                Managed by the Student Experience Office (SEO)
              </p>
            </div>
          </aside>
        </div>
      </div>

      {/* Responsive style for sidebar */}
      <style>{`
        @media (max-width: 900px) {
          .clubs-sidebar { display: none !important; }
        }
      `}</style>
    </div>
  );
}
