import React, { useState } from 'react';
import { Sparkles, Check, ArrowRight, X, MapPin, DollarSign, Compass } from 'lucide-react';
import { CATEGORIES } from '../data/seedData';
import { updateProfile, recordCategoryInteraction } from '../services/marketplaceStore';

export default function OnboardingModal({ user, onClose }) {
  const [selectedCategories, setSelectedCategories] = useState(user?.preferredCategories || ['textbooks', 'tech']);
  const [meetupSpot] = useState(user?.preferredMeetup || 'Central Campus Library (Ground Floor)');
  const [budget, setBudget] = useState(user?.budgetPreference || 'all');
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const toggleCategory = (catId) => {
    if (catId === 'all') return;
    setSelectedCategories(prev => {
      if (prev.includes(catId)) {
        return prev.filter(c => c !== catId);
      } else {
        return [...prev, catId];
      }
    });
  };

  const handleComplete = () => {
    setSaving(true);
    try {
      // 1. Update user profile
      updateProfile({
        preferredCategories: selectedCategories,
        preferredMeetup: meetupSpot,
        budgetPreference: budget,
        onboardingCompleted: true
      });

      // 2. Feed selected categories to the recommendation engine
      selectedCategories.forEach(catId => {
        const catObj = CATEGORIES.find(c => c.id === catId);
        if (catObj) {
          recordCategoryInteraction(catObj.name, 3);
        }
      });

      // 3. Mark completed in localStorage for instantaneous persistence
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(`campus_onboarding_completed_${user.userId}`, 'true');
      }

      onClose();
    } catch (err) {
      console.error('Failed to save onboarding preferences:', err);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`campus_onboarding_completed_${user.userId}`, 'true');
    }
    updateProfile({ onboardingCompleted: true });
    onClose();
  };

  // Filter out 'all' category for the preference picker
  const selectableCategories = CATEGORIES.filter(c => c.id !== 'all');

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '16px'
    }}>
      <div id="onboarding-modal-card" style={{
        background: '#FFFFFF',
        borderRadius: '20px',
        maxWidth: '560px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #E2E8F0',
        padding: '32px 28px',
        position: 'relative',
        animation: 'fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* Close / Skip button */}
        <button
          onClick={handleSkip}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: '#F1F5F9',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#64748B'
          }}
          aria-label="Skip"
        >
          <X size={16} />
        </button>

        {/* Welcome Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
            color: '#1D4ED8',
            fontSize: '0.8rem',
            fontWeight: 700,
            padding: '6px 14px',
            borderRadius: '20px',
            marginBottom: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            <Sparkles size={14} /> Welcome to the Community
          </div>
          <h2 style={{
            fontSize: '1.65rem',
            fontWeight: 800,
            color: '#0D2C6C',
            margin: '0 0 8px',
            letterSpacing: '-0.5px'
          }}>
            Welcome, {user.fullName?.split(' ')[0] || 'Student'}!
          </h2>
          <p style={{
            fontSize: '0.9rem',
            color: '#64748B',
            margin: 0,
            lineHeight: 1.5
          }}>
            Tell us what you're interested in so we can tailor your campus marketplace feed and recommendations.
          </p>
        </div>

        {/* Section 1: Categories of Interest */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{
            fontSize: '0.875rem',
            fontWeight: 700,
            color: '#1E293B',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Compass size={16} color="#0D2C6C" />
            What do you mainly want to browse or buy?
          </div>
          <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '0 0 12px' }}>
            Select one or more categories (click to toggle):
          </p>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            {selectableCategories.map(cat => {
              const isSelected = selectedCategories.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '24px',
                    fontSize: '0.8125rem',
                    fontWeight: isSelected ? 600 : 500,
                    border: isSelected ? '1.5px solid #2563EB' : '1px solid #CBD5E1',
                    background: isSelected ? '#EFF6FF' : '#F8FAFC',
                    color: isSelected ? '#1D4ED8' : '#334155',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {isSelected && <Check size={13} color="#2563EB" />}
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: Preferred Campus Meetup Spot */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            fontSize: '0.875rem',
            fontWeight: 700,
            color: '#1E293B',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <MapPin size={16} color="#0D2C6C" />
            Preferred Safe Meetup Spot
          </div>
          <select
            value={meetupSpot}
            onChange={e => setMeetupSpot(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid #CBD5E1',
              fontSize: '0.875rem',
              color: '#1E293B',
              background: '#FFFFFF',
              outline: 'none'
            }}
          >
            <option value="Central Campus Library (Ground Floor)">Central Campus Library (Ground Floor)</option>
            <option value="Main Building Atrium / Lobby">Main Building Atrium / Lobby</option>
            <option value="Student Cafeteria (Level 1)">Student Cafeteria (Level 1)</option>
            <option value="Block A Academic Wing">Block A Academic Wing</option>
            <option value="Main Campus Security Post (Safe Trade)">Main Campus Security Post (Safe Trade)</option>
          </select>
        </div>

        {/* Section 3: Budget Range */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{
            fontSize: '0.875rem',
            fontWeight: 700,
            color: '#1E293B',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <DollarSign size={16} color="#0D2C6C" />
            Typical Target Budget
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px'
          }}>
            {[
              { id: 'all', label: 'All Budgets', sub: 'Show all items' },
              { id: 'under50', label: 'Under RM 50', sub: 'Student budget' },
              { id: 'mid', label: 'RM 50 - 200', sub: 'Tech & clothing' }
            ].map(b => (
              <button
                key={b.id}
                type="button"
                onClick={() => setBudget(b.id)}
                style={{
                  padding: '10px 8px',
                  borderRadius: '10px',
                  border: budget === b.id ? '1.5px solid #2563EB' : '1px solid #E2E8F0',
                  background: budget === b.id ? '#EFF6FF' : '#F8FAFC',
                  color: budget === b.id ? '#1D4ED8' : '#475569',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{b.label}</div>
                <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '2px' }}>{b.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={handleComplete}
            disabled={saving}
            style={{
              flex: 1,
              background: '#0D2C6C',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '10px',
              padding: '12px 18px',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'background 0.2s ease'
            }}
          >
            <span>Personalize My Feed</span>
            <ArrowRight size={16} />
          </button>
          <button
            type="button"
            onClick={handleSkip}
            style={{
              background: 'transparent',
              color: '#64748B',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              padding: '12px 16px',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
