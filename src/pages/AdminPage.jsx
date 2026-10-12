import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  LayoutDashboard, ShieldAlert, Package, Users, FileText, Sliders, 
  Search, Download, Trash2, CheckCircle2, ChevronRight, 
  X, MapPin, Store, RefreshCw, Lock, Key, LogOut, ShieldCheck,
  UserCheck, AlertTriangle, UserPlus, Eye, EyeOff, Building, Award,
  UserX, ArrowLeft, Database, Server, Copy, Check, Upload, HardDrive
} from 'lucide-react';
import { 
  getPlatformStats, getReports, dismissReport, resolveReport, 
  getProducts, toggleStatus, deleteProduct, getAllUsers, toggleUserStatus,
  submitReport, getAuditLogs, clearAuditLogs, getAdminSettings, updateAdminSettings,
  updateProduct, batchUpdateProducts, exportCatalogCSV, exportAuditCSV,
  getAdminSession, loginAdmin, logoutAdmin,
  getAuthorizedAdmins, addAuthorizedAdmin, revokeAuthorizedAdmin,
  adminAddUser, adminDeleteUser, adminUpdateUser,
  getDatabaseOverview, exportDatabaseBackup, importDatabaseBackup, resetDatabaseToSeed
} from '../services/marketplaceStore';
import { CATEGORIES } from '../data/seedData';

export default function AdminPage({ user }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [tick, setTick] = useState(0);

  // Administrative Authentication & Roster State
  const [adminSession, setAdminSession] = useState(() => getAdminSession());
  const [authorizedAdmins, setAuthorizedAdmins] = useState(() => getAuthorizedAdmins());

  // Admin Login Portal State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Staff Access Management State
  const [staffSearch, setStaffSearch] = useState('');
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaffForm, setNewStaffForm] = useState({
    name: '',
    email: '',
    role: 'Faculty Moderator',
    department: 'Faculty of Engineering, Technology & Built Environment',
    staffId: '',
    password: 'password123'
  });
  const [staffError, setStaffError] = useState('');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [campusFilter, setCampusFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Moderation filter
  const [reportFilter, setReportFilter] = useState('all');

  // Audit filter
  const [auditCategory, setAuditCategory] = useState('all');
  const [auditSearch, setAuditSearch] = useState('');

  // Modals & alerts
  const [activeReportModal, setActiveReportModal] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Settings
  const [settings, setSettings] = useState(() => getAdminSettings());
  const [newBannedWord, setNewBannedWord] = useState('');

  // User CRUD state
  const [userSearch, setUserSearch] = useState('');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [newUserForm, setNewUserForm] = useState({
    fullName: '', email: '', studentId: '', faculty: 'FOEBEIT', campus: 'Kota Damansara', whatsapp: ''
  });
  const [userFormError, setUserFormError] = useState('');
  const [editUserForm, setEditUserForm] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab]);

  useEffect(() => {
    const handleUpdate = () => {
      setTick(t => t + 1);
      setSettings(getAdminSettings());
      setAuthorizedAdmins(getAuthorizedAdmins());
      setAdminSession(getAdminSession());
    };
    window.addEventListener('store_update', handleUpdate);
    window.addEventListener('admin_auth_update', handleUpdate);
    return () => {
      window.removeEventListener('store_update', handleUpdate);
      window.removeEventListener('admin_auth_update', handleUpdate);
    };
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const stats = useMemo(() => getPlatformStats(), [tick]);
  const reports = useMemo(() => getReports(), [tick]);
  const products = useMemo(() => getProducts(), [tick]);
  const users = useMemo(() => getAllUsers(), [tick]);
  const auditLogs = useMemo(() => getAuditLogs(), [tick]);

  // Database Viewer State
  const [selectedDbCollection, setSelectedDbCollection] = useState('users');
  const [dbSearch, setDbSearch] = useState('');
  const [inspectedDoc, setInspectedDoc] = useState(null);
  const [copiedDoc, setCopiedDoc] = useState(false);
  const fileInputRef = useRef(null);
  const dbOverview = useMemo(() => getDatabaseOverview(), [tick]);

  // Moderation Handlers
  const handleDismiss = (reportId) => {
    dismissReport(reportId);
    setTick(t => t + 1);
    setActiveReportModal(null);
    showToast('Report dismissed.');
  };

  const handleTakeDown = (reportId) => {
    if (window.confirm('Remove this listing from the marketplace?')) {
      resolveReport(reportId, 'remove_product');
      setTick(t => t + 1);
      setActiveReportModal(null);
      showToast('Listing removed.');
    }
  };

  // Listing Handlers
  const handleToggleSold = (productId) => {
    toggleStatus(productId);
    setTick(t => t + 1);
    showToast('Status updated.');
  };

  const handleDeleteListing = (productId) => {
    if (window.confirm('Permanently delete this listing?')) {
      deleteProduct(productId);
      setTick(t => t + 1);
      showToast('Listing deleted.');
    }
  };

  const handleSaveListingEdit = (e) => {
    e.preventDefault();
    if (!editingProduct) return;
    updateProduct(editingProduct.id, {
      title: editingProduct.title,
      price: parseFloat(editingProduct.price) || 0,
      category: editingProduct.category,
      condition: editingProduct.condition,
      status: editingProduct.status,
      meetup: editingProduct.meetup
    });
    setEditingProduct(null);
    setTick(t => t + 1);
    showToast('Changes saved.');
  };

  // Batch actions
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredProducts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const toggleSelectOne = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBatchAction = (action) => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    if (action === 'delete' && !window.confirm(`Delete ${ids.length} selected listings?`)) {
      return;
    }
    batchUpdateProducts(ids, action);
    setSelectedIds(new Set());
    setTick(t => t + 1);
    showToast(`Batch ${action} completed.`);
  };

  // User CRUD Handlers
  const handleToggleUser = (userId) => {
    toggleUserStatus(userId);
    setTick(t => t + 1);
    showToast('Account status updated.');
  };

  const handleAddUser = (e) => {
    e.preventDefault();
    setUserFormError('');
    const res = adminAddUser(newUserForm);
    if (!res.ok) { setUserFormError(res.error); return; }
    setShowAddUserModal(false);
    setNewUserForm({ fullName: '', email: '', studentId: '', faculty: 'FOEBEIT', campus: 'Kota Damansara', whatsapp: '' });
    setTick(t => t + 1);
    showToast(`User ${res.user.fullName} created successfully.`);
  };

  const handleDeleteUser = (userId, name) => {
    if (!window.confirm(`Permanently delete account for ${name}? This cannot be undone.`)) return;
    const res = adminDeleteUser(userId);
    if (!res.ok) { showToast(res.error); return; }
    setTick(t => t + 1);
    showToast(`Account deleted.`);
  };

  const handleSaveUserEdit = (e) => {
    e.preventDefault();
    if (!editUserForm || !editingUser) return;
    const res = adminUpdateUser(editingUser.userId, editUserForm);
    if (!res.ok) { showToast(res.error); return; }
    setEditingUser(null);
    setEditUserForm(null);
    setTick(t => t + 1);
    showToast('User updated.');
  };

  // Settings Handlers
  const handleSaveSettings = (e) => {
    e.preventDefault();
    updateAdminSettings(settings);
    showToast('Settings saved.');
  };

  const handleAddBannedKeyword = () => {
    const word = newBannedWord.trim().toLowerCase();
    if (word && !settings.bannedKeywords?.includes(word)) {
      const updated = {
        ...settings,
        bannedKeywords: [...(settings.bannedKeywords || []), word]
      };
      setSettings(updated);
      updateAdminSettings(updated);
      setNewBannedWord('');
      showToast(`Added "${word}" to keyword filter.`);
    }
  };

  const handleRemoveBannedKeyword = (word) => {
    const updated = {
      ...settings,
      bannedKeywords: (settings.bannedKeywords || []).filter(w => w !== word)
    };
    setSettings(updated);
    updateAdminSettings(updated);
    showToast(`Removed "${word}".`);
  };

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchQ = !searchQuery || 
        p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sellerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = selectedCat === 'all' || p.category === selectedCat;
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchCampus = campusFilter === 'all' || p.campus === campusFilter;
      return matchQ && matchCat && matchStatus && matchCampus;
    });
  }, [products, searchQuery, selectedCat, statusFilter, campusFilter]);

  // Filtered Reports
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      if (reportFilter === 'all') return true;
      if (reportFilter === 'pending') return r.status === 'pending';
      if (reportFilter === 'resolved') return r.status === 'remove_product' || r.status === 'resolved';
      if (reportFilter === 'dismissed') return r.status === 'dismissed';
      return true;
    });
  }, [reports, reportFilter]);

  // Filtered Audit Logs
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter(l => {
      const matchCat = auditCategory === 'all' || l.category === auditCategory;
      const matchQ = !auditSearch || 
        l.action?.toLowerCase().includes(auditSearch.toLowerCase()) ||
        l.details?.toLowerCase().includes(auditSearch.toLowerCase()) ||
        l.actor?.toLowerCase().includes(auditSearch.toLowerCase());
      return matchCat && matchQ;
    });
  }, [auditLogs, auditCategory, auditSearch]);

  // Staff Auth & Access Handlers
  const handleAdminLogin = (e) => {
    if (e) e.preventDefault();
    setLoginError('');
    if (!loginEmail.trim()) {
      setLoginError('Please enter your official university email.');
      return;
    }
    if (!loginPassword.trim()) {
      setLoginError('Please enter your administrative security PIN / password.');
      return;
    }

    setIsLoggingIn(true);
    setTimeout(() => {
      const res = loginAdmin({ email: loginEmail, password: loginPassword });
      setIsLoggingIn(false);
      if (!res.success) {
        setLoginError(res.error || 'Authentication rejected. Access denied.');
      } else {
        setLoginEmail('');
        setLoginPassword('');
        setLoginError('');
        setAdminSession(res.session);
        showToast(`Authorized: Welcome back, ${res.session.name}`);
      }
    }, 250);
  };

  const handleAdminLogout = () => {
    logoutAdmin();
    setAdminSession(null);
    showToast('Administrator session safely terminated.');
  };

  const handleAddStaffSubmit = (e) => {
    e.preventDefault();
    setStaffError('');

    if (!newStaffForm.name.trim() || !newStaffForm.email.trim() || !newStaffForm.staffId.trim()) {
      setStaffError('All fields marked with an asterisk are required.');
      return;
    }

    const emailLower = newStaffForm.email.toLowerCase();
    if (!emailLower.includes('@')) {
      setStaffError('A valid email address is required.');
      return;
    }

    const res = addAuthorizedAdmin({
      ...newStaffForm,
      addedBy: adminSession?.name || 'Super Admin'
    });

    if (!res.success) {
      setStaffError(res.error || 'Failed to grant administrative access.');
      return;
    }

    setShowAddStaffModal(false);
    setAuthorizedAdmins(getAuthorizedAdmins());
    setTick(t => t + 1);
    showToast(`Access granted: ${newStaffForm.name} added to authorized roster.`);
    setNewStaffForm({
      name: '',
      email: '',
      role: 'Faculty Moderator',
      department: 'Faculty of Engineering, Technology & Built Environment',
      staffId: '',
      password: 'password123'
    });
  };

  const handleRevokeStaff = (staff) => {
    if (staff.email === 'admin@university.edu') {
      alert('Security Policy: The root administrator account (admin@university.edu) cannot be revoked.');
      return;
    }

    if (window.confirm(`Revoke administrative access for ${staff.name} (${staff.email})?\n\nThis will immediately terminate their active session and block all administrative privileges.`)) {
      const res = revokeAuthorizedAdmin(staff.email, adminSession?.name || 'Super Admin');
      if (res.success) {
        setAuthorizedAdmins(getAuthorizedAdmins());
        setTick(t => t + 1);
        showToast(`Revoked access for ${staff.name}.`);
      } else {
        alert(res.error || 'Failed to revoke staff access.');
      }
    }
  };

  // Filtered Authorized Staff Roster
  const filteredStaff = useMemo(() => {
    if (!staffSearch.trim()) return authorizedAdmins;
    const q = staffSearch.toLowerCase();
    return authorizedAdmins.filter(a => 
      a.name?.toLowerCase().includes(q) ||
      a.email?.toLowerCase().includes(q) ||
      a.staffId?.toLowerCase().includes(q) ||
      a.department?.toLowerCase().includes(q) ||
      a.role?.toLowerCase().includes(q)
    );
  }, [authorizedAdmins, staffSearch]);

  // GATE: If no active authorized administrative session, render Campus Administration Gateway Login Site
  if (!adminSession) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0B192C',
        backgroundImage: 'radial-gradient(ellipse at top, #1E3A8A 0%, #0B192C 75%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 16px',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        {/* Toast Notification */}
        {toastMessage && (
          <div style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 9999,
            background: '#0D2C6C',
            color: '#fff',
            padding: '10px 16px',
            borderRadius: 6,
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: '0.8125rem',
            fontWeight: 500
          }}>
            <CheckCircle2 size={16} style={{ color: '#38BDF8' }} />
            <span>{toastMessage}</span>
          </div>
        )}

        <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Top University Classification Badge */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: 999,
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#93C5FD',
              fontSize: '0.75rem',
              fontWeight: 600,
              letterSpacing: '0.5px',
              textTransform: 'uppercase'
            }}>
              <ShieldCheck size={14} style={{ color: '#38BDF8' }} />
              <span>Restricted Administration Gateway</span>
            </div>
            
            <h1 style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              color: '#FFFFFF',
              margin: '12px 0 4px',
              letterSpacing: '-0.5px'
            }}>
              Campus Administration Console
            </h1>
            <p style={{ fontSize: '0.8125rem', color: '#94A3B8', margin: 0 }}>
              Authorized Staff & Operations Access Only
            </p>
          </div>

          {/* Main Login Card */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: 12,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.1)',
            overflow: 'hidden'
          }}>
            {/* Top Corporate Accent Bar */}
            <div style={{ height: 4, background: 'linear-gradient(90deg, #C5161D 0%, #0D2C6C 100%)' }} />

            {/* Login Card Header */}
            <div style={{
              padding: '24px 28px 18px',
              borderBottom: '1px solid #F1F5F9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <img
                  src="/assets/campus-logo.svg"
                  alt="Campus Marketplace"
                  style={{ height: 32, width: 'auto', objectFit: 'contain' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0F172A' }}>
                    Staff Authentication
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: '#64748B' }}>
                    Institutional Directory Verification
                  </div>
                </div>
              </div>

              <div style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0D2C6C'
              }}>
                <Lock size={18} />
              </div>
            </div>

            {/* Security Warning Notice */}
            <div style={{
              padding: '10px 28px',
              background: '#FEF2F2',
              borderBottom: '1px solid #FEE2E2',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10
            }}>
              <AlertTriangle size={15} style={{ color: '#DC2626', flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: '0.71875rem', color: '#991B1B', lineHeight: 1.45 }}>
                <strong style={{ fontWeight: 600 }}>Security Notice:</strong> Access is restricted to authorized personnel with assigned administrative roles. All connection attempts, active sessions, and catalog modifications are logged in compliance audit records.
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleAdminLogin} style={{ padding: '24px 28px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              
              {/* Error Banner */}
              {loginError && (
                <div style={{
                  padding: '10px 14px',
                  background: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  borderRadius: 6,
                  color: '#991B1B',
                  fontSize: '0.78125rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <AlertTriangle size={16} style={{ color: '#DC2626', flexShrink: 0 }} />
                  <span>{loginError}</span>
                </div>
              )}

              {/* Email Input */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#334155',
                  marginBottom: 6
                }}>
                  Official University Email
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => {
                      setLoginEmail(e.target.value);
                      if (loginError) setLoginError('');
                    }}
                    placeholder="e.g. admin@university.edu"
                    required
                    style={{
                      width: '100%',
                      height: 40,
                      padding: '0 12px 0 38px',
                      border: '1px solid #CBD5E1',
                      borderRadius: 6,
                      fontSize: '0.84375rem',
                      color: '#0F172A',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                      background: '#FFFFFF'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#0D2C6C'}
                    onBlur={(e) => e.target.style.borderColor = '#CBD5E1'}
                  />
                  <Users size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#94A3B8' }} />
                </div>
                <div style={{ fontSize: '0.6875rem', color: '#64748B', marginTop: 4 }}>
                  Demo Super Admin: <span style={{ fontWeight: 600, color: '#0D2C6C' }}>admin@university.edu</span> • PIN: <span style={{ fontWeight: 600, color: '#0D2C6C' }}>admin123</span>
                </div>
              </div>

              {/* Password / Security PIN Input */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#334155'
                  }}>
                    Administrative Security PIN / Password
                  </label>
                  <span style={{ fontSize: '0.6875rem', color: '#64748B' }}>
                    Required
                  </span>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => {
                      setLoginPassword(e.target.value);
                      if (loginError) setLoginError('');
                    }}
                    placeholder="Enter administrative security PIN"
                    required
                    style={{
                      width: '100%',
                      height: 40,
                      padding: '0 40px 0 38px',
                      border: '1px solid #CBD5E1',
                      borderRadius: 6,
                      fontSize: '0.84375rem',
                      color: '#0F172A',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                      background: '#FFFFFF'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#0D2C6C'}
                    onBlur={(e) => e.target.style.borderColor = '#CBD5E1'}
                  />
                  <Key size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#94A3B8' }} />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: 10,
                      background: 'none',
                      border: 'none',
                      color: '#94A3B8',
                      cursor: 'pointer',
                      padding: 2
                    }}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoggingIn}
                style={{
                  width: '100%',
                  height: 42,
                  marginTop: 4,
                  background: isLoggingIn ? '#64748B' : '#0D2C6C',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: '0.84375rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  cursor: isLoggingIn ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s',
                  boxShadow: '0 2px 4px rgba(13, 44, 108, 0.2)'
                }}
              >
                <Lock size={15} />
                <span>{isLoggingIn ? 'Authenticating Personnel...' : 'Authenticate & Enter Console'}</span>
              </button>
            </form>

            <div style={{
              background: '#F8FAFC',
              borderTop: '1px solid #E2E8F0',
              padding: '13px 24px',
              textAlign: 'center',
              fontSize: '0.75rem',
              color: '#64748B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6
            }}>
              <ShieldCheck size={14} style={{ color: '#0D2C6C' }} />
              <span>Authorized Campus Administrative Portal</span>
            </div>
          </div>

          {/* Bottom Back Link & Footer Notice */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <Link
              to="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                color: '#93C5FD',
                textDecoration: 'none',
                fontSize: '0.78125rem',
                fontWeight: 500
              }}
            >
              <ArrowLeft size={14} />
              <span>Back to Campus Marketplace Storefront</span>
            </Link>

            <div style={{
              fontSize: '0.6875rem',
              color: '#64748B',
              textAlign: 'center',
              lineHeight: 1.5
            }}>
              Campus Marketplace Administration • Open-Source Platform
            </div>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F8FAFC', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 9999,
          background: '#0D2C6C',
          color: '#fff',
          padding: '10px 16px',
          borderRadius: 6,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: '0.8125rem',
          fontWeight: 500
        }}>
          <CheckCircle2 size={16} style={{ color: '#38BDF8' }} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. SIDEBAR */}
      <aside style={{
        width: 240,
        background: '#0D2C6C',
        color: '#E2E8F0',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid rgba(255,255,255,0.08)',
        flexShrink: 0
      }}>
        {/* Brand */}
        <div style={{
          padding: '20px 16px 18px',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img 
              src="/assets/campus-logo.svg" 
              alt="Campus" 
              style={{ height: 32, width: 'auto', objectFit: 'contain' }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div>
              <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff' }}>
                Campus Admin
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
                <span style={{ fontSize: '0.6875rem', color: '#93C5FD' }}>
                  Admin Portal • {adminSession.staffId}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Nav Links */}
        <nav style={{ flex: 1, padding: '14px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '9px 12px',
              borderRadius: 6,
              border: 'none',
              background: activeTab === 'overview' ? 'rgba(255,255,255,0.14)' : 'transparent',
              color: activeTab === 'overview' ? '#fff' : '#CBD5E1',
              fontWeight: activeTab === 'overview' ? 600 : 400,
              fontSize: '0.8125rem',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <LayoutDashboard size={16} />
              <span>Overview</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('moderation')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '9px 12px',
              borderRadius: 6,
              border: 'none',
              background: activeTab === 'moderation' ? 'rgba(255,255,255,0.14)' : 'transparent',
              color: activeTab === 'moderation' ? '#fff' : '#CBD5E1',
              fontWeight: activeTab === 'moderation' ? 600 : 400,
              fontSize: '0.8125rem',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ShieldAlert size={16} />
              <span>Reported Items</span>
            </div>
            {stats.pendingReportsCount > 0 && (
              <span style={{
                background: '#EF4444',
                color: '#fff',
                fontSize: '0.6875rem',
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: 999
              }}>
                {stats.pendingReportsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('listings')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '9px 12px',
              borderRadius: 6,
              border: 'none',
              background: activeTab === 'listings' ? 'rgba(255,255,255,0.14)' : 'transparent',
              color: activeTab === 'listings' ? '#fff' : '#CBD5E1',
              fontWeight: activeTab === 'listings' ? 600 : 400,
              fontSize: '0.8125rem',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Package size={16} />
              <span>All Listings</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#93C5FD' }}>{products.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '9px 12px',
              borderRadius: 6,
              border: 'none',
              background: activeTab === 'users' ? 'rgba(255,255,255,0.14)' : 'transparent',
              color: activeTab === 'users' ? '#fff' : '#CBD5E1',
              fontWeight: activeTab === 'users' ? 600 : 400,
              fontSize: '0.8125rem',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Users size={16} />
              <span>User Accounts</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#93C5FD' }}>{users.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('staff')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '9px 12px',
              borderRadius: 6,
              border: 'none',
              background: activeTab === 'staff' ? 'rgba(255,255,255,0.14)' : 'transparent',
              color: activeTab === 'staff' ? '#fff' : '#CBD5E1',
              fontWeight: activeTab === 'staff' ? 600 : 400,
              fontSize: '0.8125rem',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <UserCheck size={16} />
              <span>Staff Access</span>
            </div>
            <span style={{
              fontSize: '0.6875rem',
              color: '#93C5FD',
              background: 'rgba(255,255,255,0.08)',
              padding: '1px 6px',
              borderRadius: 999
            }}>
              {authorizedAdmins.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '9px 12px',
              borderRadius: 6,
              border: 'none',
              background: activeTab === 'audit' ? 'rgba(255,255,255,0.14)' : 'transparent',
              color: activeTab === 'audit' ? '#fff' : '#CBD5E1',
              fontWeight: activeTab === 'audit' ? 600 : 400,
              fontSize: '0.8125rem',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <FileText size={16} />
              <span>Activity Log</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('database')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '9px 12px',
              borderRadius: 6,
              border: 'none',
              background: activeTab === 'database' ? 'rgba(255,255,255,0.14)' : 'transparent',
              color: activeTab === 'database' ? '#fff' : '#CBD5E1',
              fontWeight: activeTab === 'database' ? 600 : 400,
              fontSize: '0.8125rem',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Database size={16} />
              <span>Database & Raw Data</span>
            </div>
            <span style={{
              fontSize: '0.6875rem',
              color: '#38BDF8',
              background: 'rgba(56, 189, 248, 0.12)',
              padding: '1px 6px',
              borderRadius: 999
            }}>
              Live
            </span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '9px 12px',
              borderRadius: 6,
              border: 'none',
              background: activeTab === 'settings' ? 'rgba(255,255,255,0.14)' : 'transparent',
              color: activeTab === 'settings' ? '#fff' : '#CBD5E1',
              fontWeight: activeTab === 'settings' ? 600 : 400,
              fontSize: '0.8125rem',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Sliders size={16} />
              <span>Settings</span>
            </div>
          </button>
        </nav>

        {/* Sidebar Footer */}
        <div style={{
          padding: '14px 16px',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(0,0,0,0.15)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <Link
              to="/"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                color: '#93C5FD',
                textDecoration: 'none',
                fontSize: '0.75rem',
                fontWeight: 500
              }}
            >
              <Store size={13} />
              <span>Storefront ↗</span>
            </Link>

            <button
              onClick={handleAdminLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                color: '#F87171',
                background: 'none',
                border: 'none',
                fontSize: '0.6875rem',
                cursor: 'pointer',
                padding: '2px 4px',
                fontWeight: 600
              }}
              title="Sign out of administrative session"
            >
              <LogOut size={12} />
              <span>Exit</span>
            </button>
          </div>

          <div style={{ fontSize: '0.78125rem', color: '#FFFFFF', fontWeight: 600 }}>
            {adminSession.name}
          </div>
          <div style={{ fontSize: '0.6875rem', color: '#93C5FD', marginTop: 1 }}>
            {adminSession.email}
          </div>
          <div style={{
            fontSize: '0.625rem',
            color: '#CBD5E1',
            background: 'rgba(255,255,255,0.1)',
            padding: '2px 6px',
            borderRadius: 4,
            display: 'inline-block',
            marginTop: 6,
            fontWeight: 500
          }}>
            {adminSession.role}
          </div>
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowY: 'auto' }}>
        
        {/* Top Header */}
        <header style={{
          height: 56,
          background: '#fff',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          position: 'sticky',
          top: 0,
          zIndex: 20
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8125rem', color: '#64748B' }}>
            <span>Admin</span>
            <ChevronRight size={14} />
            <span style={{ color: '#0F172A', fontWeight: 600, textTransform: 'capitalize' }}>
              {activeTab === 'overview' ? 'Overview' : 
               activeTab === 'moderation' ? 'Reported Items' :
               activeTab === 'listings' ? 'Listings' :
               activeTab === 'users' ? 'User Accounts' :
               activeTab === 'staff' ? 'Staff Access & Security' :
               activeTab === 'audit' ? 'Activity Log' : 
               activeTab === 'database' ? 'Database & Storage' : 'Platform Settings'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={exportCatalogCSV}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                background: '#fff',
                border: '1px solid #CBD5E1',
                color: '#475569',
                borderRadius: 6,
                fontSize: '0.75rem',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              <Download size={13} />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => {
                setTick(t => t + 1);
                showToast('Refreshed data.');
              }}
              style={{
                padding: '6px 8px',
                background: '#fff',
                border: '1px solid #CBD5E1',
                borderRadius: 6,
                color: '#64748B',
                cursor: 'pointer'
              }}
              title="Refresh data"
            >
              <RefreshCw size={13} />
            </button>

            {/* Active Staff Identity Badge */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 10px',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: 6,
              marginLeft: 4
            }}>
              <div style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: '#0D2C6C',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.6875rem',
                fontWeight: 700
              }}>
                {adminSession.name ? adminSession.name.charAt(0) : 'A'}
              </div>
              <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0F172A' }}>
                  {adminSession.name}
                </div>
                <div style={{ fontSize: '0.65625rem', color: '#64748B' }}>
                  {adminSession.staffId} • {adminSession.role}
                </div>
              </div>
            </div>

            {/* Sign Out Button */}
            <button
              onClick={handleAdminLogout}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#DC2626',
                borderRadius: 6,
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.15s'
              }}
              title="Sign out of administrative console"
            >
              <LogOut size={13} />
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        {/* Tab Body */}
        <main style={{ padding: '24px', flex: 1 }}>

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              <div>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Marketplace Overview
                </h1>
                <p style={{ fontSize: '0.8125rem', color: '#64748B', margin: '4px 0 0' }}>
                  Summary of listings, user accounts, and campus trading activity.
                </p>
              </div>

              {/* 4 Clean Metric Cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                gap: 16
              }}>
                <div style={{ background: '#fff', padding: '16px 20px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                    Active Listings
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0F172A', marginTop: 6 }}>
                    {stats.availableListings}
                    <span style={{ fontSize: '0.8125rem', fontWeight: 400, color: '#64748B', marginLeft: 6 }}>
                      of {stats.totalListings} total
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: 4, fontWeight: 500 }}>
                    RM {stats.totalValue.toLocaleString()} active catalog
                  </div>
                </div>

                <div style={{ background: '#fff', padding: '16px 20px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                    Verified Accounts
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0F172A', marginTop: 6 }}>
                    {stats.totalUsers}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 4 }}>
                    Students & lecturers
                  </div>
                </div>

                <div style={{ background: '#fff', padding: '16px 20px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                    Sold Items
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0F172A', marginTop: 6 }}>
                    {stats.soldListings}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 4 }}>
                    Completed trades
                  </div>
                </div>

                <div style={{ background: '#fff', padding: '16px 20px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                    Pending Reports
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: stats.pendingReportsCount > 0 ? '#DC2626' : '#0F172A', marginTop: 6 }}>
                    {stats.pendingReportsCount}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: stats.pendingReportsCount > 0 ? '#DC2626' : '#059669', marginTop: 4, fontWeight: 500 }}>
                    {stats.pendingReportsCount > 0 ? 'Requires attention' : 'No open issues'}
                  </div>
                </div>
              </div>

              {/* Two Column Section */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
                
                {/* Category Inventory Share */}
                <div style={{ background: '#fff', padding: '20px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0F172A', marginBottom: 14 }}>
                    Listings by Category
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {CATEGORIES.filter(c => c.id !== 'activities').map(cat => {
                      const count = stats.categoryCounts[cat.id] || 0;
                      const pct = stats.totalListings ? Math.round((count / stats.totalListings) * 100) : 0;
                      return (
                        <div key={cat.id}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 3 }}>
                            <span style={{ color: '#334155', fontWeight: 500 }}>{cat.name}</span>
                            <span style={{ color: '#64748B' }}>{count} ({pct}%)</span>
                          </div>
                          <div style={{ width: '100%', height: 5, background: '#F1F5F9', borderRadius: 999, overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: '#0D2C6C', borderRadius: 999 }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Campus Activity */}
                <div style={{ background: '#fff', padding: '20px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0F172A', marginBottom: 14 }}>
                    Listings by Campus
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {Object.entries(stats.campusCounts).map(([camp, count]) => {
                      const pct = stats.totalListings ? Math.round((count / stats.totalListings) * 100) : 0;
                      return (
                        <div key={camp}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 3 }}>
                            <span style={{ color: '#334155', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <MapPin size={12} style={{ color: '#C5161D' }} />
                              {camp}
                            </span>
                            <span style={{ color: '#64748B' }}>{count} ({pct}%)</span>
                          </div>
                          <div style={{ width: '100%', height: 5, background: '#F1F5F9', borderRadius: 999, overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: '#C5161D', borderRadius: 999 }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Recent Activity Table */}
              <div style={{ background: '#fff', padding: '20px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0F172A' }}>
                    Recent Activity
                  </div>
                  <button
                    onClick={() => setActiveTab('audit')}
                    style={{ fontSize: '0.75rem', color: '#0D2C6C', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    View all activity →
                  </button>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', textAlign: 'left', borderBottom: '1px solid #E2E8F0', color: '#64748B' }}>
                        <th style={{ padding: '8px 12px', fontWeight: 600 }}>Action</th>
                        <th style={{ padding: '8px 12px', fontWeight: 600 }}>Details</th>
                        <th style={{ padding: '8px 12px', fontWeight: 600 }}>Actor</th>
                        <th style={{ padding: '8px 12px', fontWeight: 600, textAlign: 'right' }}>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentAuditLogs.slice(0, 5).map(log => (
                        <tr key={log.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0F172A' }}>
                            {log.action}
                          </td>
                          <td style={{ padding: '10px 12px', color: '#475569' }}>
                            {log.details}
                          </td>
                          <td style={{ padding: '10px 12px', color: '#64748B' }}>
                            {log.actor}
                          </td>
                          <td style={{ padding: '10px 12px', color: '#94A3B8', textAlign: 'right' }}>
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: REPORTED ITEMS */}
          {activeTab === 'moderation' && (
            <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #E2E8F0', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    Reported Items
                  </h2>
                  <p style={{ fontSize: '0.8125rem', color: '#64748B', margin: '2px 0 0' }}>
                    Student reports submitted for policy compliance.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 4, background: '#F1F5F9', padding: 2, borderRadius: 6 }}>
                  {[
                    { id: 'all', label: `All (${reports.length})` },
                    { id: 'pending', label: `Pending (${reports.filter(r => r.status === 'pending').length})` },
                    { id: 'resolved', label: 'Actioned' },
                    { id: 'dismissed', label: 'Dismissed' }
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setReportFilter(f.id)}
                      style={{
                        padding: '5px 10px',
                        border: 'none',
                        borderRadius: 4,
                        background: reportFilter === f.id ? '#0D2C6C' : 'transparent',
                        color: reportFilter === f.id ? '#fff' : '#64748B',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        cursor: 'pointer'
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {filteredReports.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 16px', color: '#64748B' }}>
                  <CheckCircle2 size={36} style={{ color: '#10B981', margin: '0 auto 8px' }} />
                  <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#0F172A' }}>No reports found</div>
                  <p style={{ fontSize: '0.8125rem', margin: '4px 0 0' }}>There are no reports matching this filter.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', textAlign: 'left', borderBottom: '1px solid #E2E8F0', color: '#64748B' }}>
                        <th style={{ padding: '10px 12px', fontWeight: 600 }}>Listing</th>
                        <th style={{ padding: '10px 12px', fontWeight: 600 }}>Report Reason</th>
                        <th style={{ padding: '10px 12px', fontWeight: 600 }}>Details</th>
                        <th style={{ padding: '10px 12px', fontWeight: 600 }}>Status</th>
                        <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReports.map(r => {
                        const product = products.find(p => p.id === r.productId);
                        return (
                          <tr key={r.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '10px 12px' }}>
                              {product ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <img
                                    src={product.images?.[0]}
                                    alt=""
                                    style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 4, border: '1px solid #E2E8F0' }}
                                  />
                                  <div>
                                    <div style={{ fontWeight: 600, color: '#0F172A' }}>{product.title}</div>
                                    <div style={{ fontSize: '0.6875rem', color: '#64748B' }}>
                                      RM {product.price} • {product.sellerName || 'Student'}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>Listing removed</span>
                              )}
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <span style={{
                                background: '#FEE2E2',
                                color: '#991B1B',
                                padding: '2px 6px',
                                borderRadius: 4,
                                fontSize: '0.6875rem',
                                fontWeight: 600
                              }}>
                                {r.reason}
                              </span>
                            </td>
                            <td style={{ padding: '10px 12px', color: '#475569', maxWidth: 280 }}>
                              {r.details || 'No additional notes'}
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <span style={{
                                background: r.status === 'pending' ? '#FEF3C7' : r.status === 'dismissed' ? '#EFF6FF' : '#F1F5F9',
                                color: r.status === 'pending' ? '#92400E' : r.status === 'dismissed' ? '#1D4ED8' : '#475569',
                                padding: '2px 6px',
                                borderRadius: 4,
                                fontSize: '0.6875rem',
                                fontWeight: 600,
                                textTransform: 'capitalize'
                              }}>
                                {r.status}
                              </span>
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                <button
                                  onClick={() => setActiveReportModal({ report: r, product })}
                                  style={{
                                    padding: '5px 8px',
                                    background: '#F1F5F9',
                                    border: '1px solid #CBD5E1',
                                    borderRadius: 4,
                                    fontSize: '0.6875rem',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                  }}
                                >
                                  Review
                                </button>
                                {r.status === 'pending' && (
                                  <>
                                    <button
                                      onClick={() => handleDismiss(r.id)}
                                      style={{
                                        padding: '5px 8px',
                                        background: '#fff',
                                        border: '1px solid #CBD5E1',
                                        borderRadius: 4,
                                        fontSize: '0.6875rem',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      Dismiss
                                    </button>
                                    {product && (
                                      <button
                                        onClick={() => handleTakeDown(r.id)}
                                        style={{
                                          padding: '5px 8px',
                                          background: '#DC2626',
                                          color: '#fff',
                                          border: 'none',
                                          borderRadius: 4,
                                          fontSize: '0.6875rem',
                                          fontWeight: 600,
                                          cursor: 'pointer'
                                        }}
                                      >
                                        Remove
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ALL LISTINGS */}
          {activeTab === 'listings' && (
            <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #E2E8F0', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    Campus Listings
                  </h2>
                  <p style={{ fontSize: '0.8125rem', color: '#64748B', margin: '2px 0 0' }}>
                    Manage and update student marketplace items.
                  </p>
                </div>

                {selectedIds.size > 0 && (
                  <div style={{ display: 'flex', gap: 6, background: '#F1F5F9', padding: '3px 8px', borderRadius: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0D2C6C' }}>
                      {selectedIds.size} selected:
                    </span>
                    <button
                      onClick={() => handleBatchAction('mark_sold')}
                      style={{ padding: '3px 6px', background: '#fff', border: '1px solid #CBD5E1', borderRadius: 4, fontSize: '0.6875rem', cursor: 'pointer' }}
                    >
                      Mark Sold
                    </button>
                    <button
                      onClick={() => handleBatchAction('relist')}
                      style={{ padding: '3px 6px', background: '#fff', border: '1px solid #CBD5E1', borderRadius: 4, fontSize: '0.6875rem', cursor: 'pointer' }}
                    >
                      Relist
                    </button>
                    <button
                      onClick={() => handleBatchAction('delete')}
                      style={{ padding: '3px 6px', background: '#FEE2E2', color: '#991B1B', border: 'none', borderRadius: 4, fontSize: '0.6875rem', cursor: 'pointer' }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>

              {/* Filters */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                  <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                  <input
                    type="text"
                    placeholder="Search by title, seller, or ID..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      height: 34,
                      paddingLeft: 32,
                      paddingRight: 10,
                      border: '1px solid #CBD5E1',
                      borderRadius: 6,
                      fontSize: '0.8125rem'
                    }}
                  />
                </div>

                <select
                  value={selectedCat}
                  onChange={e => setSelectedCat(e.target.value)}
                  style={{ height: 34, padding: '0 8px', border: '1px solid #CBD5E1', borderRadius: 6, fontSize: '0.8125rem', background: '#fff' }}
                >
                  <option value="all">All Categories</option>
                  {CATEGORIES.filter(c => c.id !== 'activities').map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  style={{ height: 34, padding: '0 8px', border: '1px solid #CBD5E1', borderRadius: 6, fontSize: '0.8125rem', background: '#fff' }}
                >
                  <option value="all">All Statuses</option>
                  <option value="available">Available Only</option>
                  <option value="sold">Sold Out Only</option>
                </select>

                <select
                  value={campusFilter}
                  onChange={e => setCampusFilter(e.target.value)}
                  style={{ height: 34, padding: '0 8px', border: '1px solid #CBD5E1', borderRadius: 6, fontSize: '0.8125rem', background: '#fff' }}
                >
                  <option value="all">All Campuses</option>
                  <option value="Kota Damansara">Kota Damansara</option>
                  <option value="Subang Jaya">Subang Jaya</option>
                  <option value="Penang">Penang</option>
                  <option value="Sarawak">Sarawak</option>
                  <option value="Kuala Lumpur">Kuala Lumpur</option>
                </select>
              </div>

              {/* Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', textAlign: 'left', borderBottom: '1px solid #E2E8F0', color: '#64748B' }}>
                      <th style={{ padding: '8px 10px', width: 28 }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.size === filteredProducts.length && filteredProducts.length > 0}
                          onChange={toggleSelectAll}
                        />
                      </th>
                      <th style={{ padding: '8px 10px', fontWeight: 600 }}>Title</th>
                      <th style={{ padding: '8px 10px', fontWeight: 600 }}>Category</th>
                      <th style={{ padding: '8px 10px', fontWeight: 600 }}>Seller</th>
                      <th style={{ padding: '8px 10px', fontWeight: 600 }}>Price</th>
                      <th style={{ padding: '8px 10px', fontWeight: 600 }}>Status</th>
                      <th style={{ padding: '8px 10px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.slice(0, 60).map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '8px 10px' }}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(p.id)}
                            onChange={() => toggleSelectOne(p.id)}
                          />
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <img
                              src={p.images?.[0]}
                              alt=""
                              style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4, border: '1px solid #E2E8F0' }}
                            />
                            <div>
                              <Link to={`/product/${p.id}`} target="_blank" style={{ fontWeight: 600, color: '#0D2C6C', textDecoration: 'none' }}>
                                {p.title}
                              </Link>
                              <div style={{ fontSize: '0.6875rem', color: '#94A3B8' }}>{p.id}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '8px 10px', textTransform: 'capitalize', color: '#475569' }}>
                          {p.category}
                        </td>
                        <td style={{ padding: '8px 10px', color: '#475569' }}>
                          {p.sellerName || 'Student'}
                        </td>
                        <td style={{ padding: '8px 10px', fontWeight: 600, color: '#0F172A' }}>
                          {p.price === 0 ? 'FREE' : `RM ${p.price}`}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{
                            background: p.status === 'available' ? '#ECFDF5' : '#F1F5F9',
                            color: p.status === 'available' ? '#047857' : '#64748B',
                            padding: '2px 6px',
                            borderRadius: 4,
                            fontSize: '0.6875rem',
                            fontWeight: 600
                          }}>
                            {p.status === 'available' ? 'Available' : 'Sold Out'}
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => setEditingProduct({ ...p })}
                              style={{ padding: '4px 6px', background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: 4, fontSize: '0.6875rem', cursor: 'pointer' }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleToggleSold(p.id)}
                              style={{ padding: '4px 6px', background: '#fff', border: '1px solid #CBD5E1', borderRadius: 4, fontSize: '0.6875rem', cursor: 'pointer' }}
                            >
                              {p.status === 'available' ? 'Mark Sold' : 'Relist'}
                            </button>
                            <button
                              onClick={() => handleDeleteListing(p.id)}
                              style={{ padding: '4px 6px', background: '#FEE2E2', color: '#991B1B', border: 'none', borderRadius: 4, fontSize: '0.6875rem', cursor: 'pointer' }}
                              title="Delete"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: USER ACCOUNTS */}
          {activeTab === 'users' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', borderRadius: 8, border: '1px solid #E2E8F0', padding: '16px 20px' }}>
                <div>
                  <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>User Accounts Management</h2>
                  <p style={{ fontSize: '0.8125rem', color: '#64748B', margin: '2px 0 0' }}>
                    {users.length} registered user accounts · Add, modify or delete platform users.
                  </p>
                </div>
                <button
                  onClick={() => { setShowAddUserModal(true); setUserFormError(''); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#0D2C6C', color: '#fff', border: 'none', borderRadius: 6, fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  <UserPlus size={15} /> Add User
                </button>
              </div>

              {/* Search */}
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                <input
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  placeholder="Search by name, email, user ID or campus…"
                  style={{ width: '100%', padding: '10px 12px 10px 38px', border: '1px solid #E2E8F0', borderRadius: 6, fontSize: '0.8125rem', outline: 'none', background: '#fff' }}
                />
              </div>

              {/* Users Table */}
              <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', textAlign: 'left', borderBottom: '1px solid #E2E8F0', color: '#64748B' }}>
                        <th style={{ padding: '10px 14px', fontWeight: 600 }}>Name</th>
                        <th style={{ padding: '10px 14px', fontWeight: 600 }}>Email</th>
                        <th style={{ padding: '10px 14px', fontWeight: 600 }}>User / Student ID</th>
                        <th style={{ padding: '10px 14px', fontWeight: 600 }}>Faculty</th>
                        <th style={{ padding: '10px 14px', fontWeight: 600 }}>Campus</th>
                        <th style={{ padding: '10px 14px', fontWeight: 600 }}>Status</th>
                        <th style={{ padding: '10px 14px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users
                        .filter(u => {
                          if (!userSearch.trim()) return true;
                          const q = userSearch.toLowerCase();
                          return (
                            u.fullName?.toLowerCase().includes(q) ||
                            u.email?.toLowerCase().includes(q) ||
                            u.studentId?.toLowerCase().includes(q) ||
                            u.campus?.toLowerCase().includes(q) ||
                            u.faculty?.toLowerCase().includes(q)
                          );
                        })
                        .map(u => (
                        <tr key={u.userId} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#0D2C6C,#C5161D)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6875rem', fontWeight: 700, flexShrink: 0 }}>
                                {u.fullName?.charAt(0)}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, color: '#0F172A' }}>{u.fullName}</div>
                                <div style={{ fontSize: '0.6875rem', color: '#94A3B8' }}>Joined {u.joined || 'Recently'}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '10px 14px', color: '#0D2C6C', fontFamily: 'monospace', fontSize: '0.75rem' }}>{u.email}</td>
                          <td style={{ padding: '10px 14px', color: '#475569', fontSize: '0.75rem' }}>{u.studentId || '—'}</td>
                          <td style={{ padding: '10px 14px', color: '#475569' }}>{u.faculty}</td>
                          <td style={{ padding: '10px 14px', color: '#64748B', fontSize: '0.75rem' }}>{u.campus || 'KD'}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{ background: u.status === 'suspended' ? '#FEE2E2' : '#ECFDF5', color: u.status === 'suspended' ? '#991B1B' : '#047857', padding: '2px 7px', borderRadius: 4, fontSize: '0.6875rem', fontWeight: 600 }}>
                              {u.status === 'suspended' ? 'Suspended' : 'Active'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                              {/* Edit */}
                              <button
                                onClick={() => { setEditingUser(u); setEditUserForm({ fullName: u.fullName, studentId: u.studentId || '', faculty: u.faculty, campus: u.campus || 'Kota Damansara', whatsapp: u.whatsapp || '', status: u.status || 'active' }); }}
                                style={{ padding: '4px 9px', background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', borderRadius: 4, fontSize: '0.6875rem', cursor: 'pointer', fontWeight: 500 }}
                              >Edit</button>
                              {/* Suspend/Reactivate */}
                              <button
                                onClick={() => handleToggleUser(u.userId)}
                                style={{ padding: '4px 9px', background: u.status === 'suspended' ? '#ECFDF5' : '#FEF3C7', color: u.status === 'suspended' ? '#047857' : '#92400E', border: 'none', borderRadius: 4, fontSize: '0.6875rem', fontWeight: 500, cursor: 'pointer' }}
                              >{u.status === 'suspended' ? 'Restore' : 'Suspend'}</button>
                              {/* Delete */}
                              <button
                                onClick={() => handleDeleteUser(u.userId, u.fullName)}
                                style={{ padding: '4px 9px', background: '#FEE2E2', color: '#991B1B', border: 'none', borderRadius: 4, fontSize: '0.6875rem', fontWeight: 500, cursor: 'pointer' }}
                              >Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Add User Modal */}
              {showAddUserModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000, padding: 20 }}>
                  <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 480, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)', overflow: 'hidden' }}>
                    <div style={{ padding: '18px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A' }}>Add New User</div>
                      <button onClick={() => setShowAddUserModal(false)} style={{ color: '#64748B', cursor: 'pointer' }}><X size={18}/></button>
                    </div>
                    <form onSubmit={handleAddUser} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {userFormError && <div style={{ background: '#FEF2F2', color: '#991B1B', padding: '8px 12px', borderRadius: 6, fontSize: '0.8125rem', border: '1px solid #FCA5A5' }}>{userFormError}</div>}
                      {[['Full Name', 'fullName', 'text', 'e.g. Ahmad Danial'],
                        ['Email Address', 'email', 'email', 'e.g. student@university.edu'],
                        ['User / Student ID', 'studentId', 'text', 'e.g. STU2024001 (or leave blank for auto-ID)'],
                        ['WhatsApp (optional)', 'whatsapp', 'tel', '+6012-3456789']
                      ].map(([label, key, type, ph]) => (
                        <div key={key}>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: 5 }}>{label}</label>
                          <input type={type} placeholder={ph} required={key === 'fullName' || key === 'email'}
                            value={newUserForm[key]}
                            onChange={e => setNewUserForm(f => ({ ...f, [key]: e.target.value }))}
                            style={{ width: '100%', padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: 6, fontSize: '0.84375rem', outline: 'none' }}
                          />
                        </div>
                      ))}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: 5 }}>Faculty</label>
                          <select value={newUserForm.faculty} onChange={e => setNewUserForm(f => ({ ...f, faculty: e.target.value }))}
                            style={{ width: '100%', padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: 6, fontSize: '0.84375rem', outline: 'none' }}>
                            {['FOEBEIT','FOSST','FOBM','FOLS','FOAS','FOAP','FOMHS','FODEN'].map(f => <option key={f}>{f}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: 5 }}>Campus</label>
                          <select value={newUserForm.campus} onChange={e => setNewUserForm(f => ({ ...f, campus: e.target.value }))}
                            style={{ width: '100%', padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: 6, fontSize: '0.84375rem', outline: 'none' }}>
                            {['Kota Damansara','Subang Jaya','Kuala Lumpur','Penang','Sarawak'].map(c => <option key={c}>{c}</option>)}
                          </select>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
                        <button type="button" onClick={() => setShowAddUserModal(false)}
                          style={{ padding: '8px 16px', background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: 6, fontSize: '0.8125rem', cursor: 'pointer' }}>
                          Cancel
                        </button>
                        <button type="submit" style={{ padding: '8px 16px', background: '#0D2C6C', color: '#fff', border: 'none', borderRadius: 6, fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}>
                          Create Account
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Edit User Modal */}
              {editingUser && editUserForm && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000, padding: 20 }}>
                  <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 480, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)', overflow: 'hidden' }}>
                    <div style={{ padding: '18px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A' }}>Edit User</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 2 }}>{editingUser.email}</div>
                      </div>
                      <button onClick={() => { setEditingUser(null); setEditUserForm(null); }} style={{ color: '#64748B', cursor: 'pointer' }}><X size={18}/></button>
                    </div>
                    <form onSubmit={handleSaveUserEdit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {[['Full Name', 'fullName', 'text'], ['User / Student ID', 'studentId', 'text'], ['WhatsApp', 'whatsapp', 'tel']].map(([label, key, type]) => (
                        <div key={key}>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: 5 }}>{label}</label>
                          <input type={type}
                            value={editUserForm[key] || ''}
                            onChange={e => setEditUserForm(f => ({ ...f, [key]: e.target.value }))}
                            style={{ width: '100%', padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: 6, fontSize: '0.84375rem', outline: 'none' }}
                          />
                        </div>
                      ))}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: 5 }}>Faculty</label>
                          <select value={editUserForm.faculty || 'FOEBEIT'} onChange={e => setEditUserForm(f => ({ ...f, faculty: e.target.value }))}
                            style={{ width: '100%', padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: 6, fontSize: '0.84375rem', outline: 'none' }}>
                            {['FOEBEIT','FOSST','FOBM','FOLS','FOAS','FOAP','FOMHS','FODEN'].map(f => <option key={f}>{f}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: 5 }}>Campus</label>
                          <select value={editUserForm.campus || 'Kota Damansara'} onChange={e => setEditUserForm(f => ({ ...f, campus: e.target.value }))}
                            style={{ width: '100%', padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: 6, fontSize: '0.84375rem', outline: 'none' }}>
                            {['Kota Damansara','Subang Jaya','Kuala Lumpur','Penang','Sarawak'].map(c => <option key={c}>{c}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: 5 }}>Account Status</label>
                        <select value={editUserForm.status || 'active'} onChange={e => setEditUserForm(f => ({ ...f, status: e.target.value }))}
                          style={{ width: '100%', padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: 6, fontSize: '0.84375rem', outline: 'none' }}>
                          <option value="active">Active</option>
                          <option value="suspended">Suspended</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
                        <button type="button" onClick={() => { setEditingUser(null); setEditUserForm(null); }}
                          style={{ padding: '8px 16px', background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: 6, fontSize: '0.8125rem', cursor: 'pointer' }}>
                          Cancel
                        </button>
                        <button type="submit" style={{ padding: '8px 16px', background: '#0D2C6C', color: '#fff', border: 'none', borderRadius: 6, fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}>
                          Save Changes
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: ACTIVITY LOG */}
          {activeTab === 'audit' && (
            <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #E2E8F0', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    Activity Log
                  </h2>
                  <p style={{ fontSize: '0.8125rem', color: '#64748B', margin: '2px 0 0' }}>
                    Record of administrative and moderation actions.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={exportAuditCSV}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '5px 10px',
                      background: '#0D2C6C',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 4,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <Download size={12} />
                    <span>Export CSV</span>
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Clear all activity logs?')) {
                        clearAuditLogs();
                        setTick(t => t + 1);
                        showToast('Activity logs cleared.');
                      }
                    }}
                    style={{
                      padding: '5px 10px',
                      background: '#F1F5F9',
                      border: '1px solid #CBD5E1',
                      color: '#475569',
                      borderRadius: 4,
                      fontSize: '0.75rem',
                      cursor: 'pointer'
                    }}
                  >
                    Clear Logs
                  </button>
                </div>
              </div>

              {/* Log Filters */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                  <input
                    type="text"
                    placeholder="Search logs..."
                    value={auditSearch}
                    onChange={e => setAuditSearch(e.target.value)}
                    style={{
                      width: '100%',
                      height: 34,
                      paddingLeft: 32,
                      paddingRight: 10,
                      border: '1px solid #CBD5E1',
                      borderRadius: 6,
                      fontSize: '0.8125rem'
                    }}
                  />
                </div>
                <select
                  value={auditCategory}
                  onChange={e => setAuditCategory(e.target.value)}
                  style={{ height: 34, padding: '0 8px', border: '1px solid #CBD5E1', borderRadius: 6, fontSize: '0.8125rem', background: '#fff' }}
                >
                  <option value="all">All Categories</option>
                  <option value="moderation">Moderation</option>
                  <option value="catalog">Catalog</option>
                  <option value="auth">Accounts</option>
                  <option value="system">System</option>
                </select>
              </div>

              {/* Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', textAlign: 'left', borderBottom: '1px solid #E2E8F0', color: '#64748B' }}>
                      <th style={{ padding: '8px 10px', fontWeight: 600 }}>Time</th>
                      <th style={{ padding: '8px 10px', fontWeight: 600 }}>Action</th>
                      <th style={{ padding: '8px 10px', fontWeight: 600 }}>Actor</th>
                      <th style={{ padding: '8px 10px', fontWeight: 600 }}>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAuditLogs.map(l => (
                      <tr key={l.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '8px 10px', color: '#64748B', whiteSpace: 'nowrap' }}>
                          {new Date(l.timestamp).toLocaleString()}
                        </td>
                        <td style={{ padding: '8px 10px', fontWeight: 600, color: '#0F172A' }}>
                          {l.action}
                        </td>
                        <td style={{ padding: '8px 10px', color: '#475569' }}>
                          {l.actor}
                        </td>
                        <td style={{ padding: '8px 10px', color: '#334155' }}>
                          {l.details}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: DATABASE & STORAGE INSPECTOR */}
          {activeTab === 'database' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
                    Database & Storage Console
                  </h2>
                  <p style={{ fontSize: '0.8125rem', color: '#64748B', margin: '4px 0 0' }}>
                    Real-time collection inspector, storage telemetry, backups, and live data documents.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => {
                      exportDatabaseBackup();
                      showToast('Database backup downloaded successfully.');
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 14px',
                      background: '#0D2C6C',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <Download size={15} />
                    <span>Export JSON Backup</span>
                  </button>

                  <input
                    type="file"
                    accept=".json"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const res = importDatabaseBackup(event.target.result);
                        if (res.ok) {
                          setTick(t => t + 1);
                          showToast('Database restored successfully from backup.');
                        } else {
                          alert('Import failed: ' + res.error);
                        }
                      };
                      reader.readAsText(file);
                      e.target.value = '';
                    }}
                  />

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 14px',
                      background: '#fff',
                      border: '1px solid #CBD5E1',
                      color: '#334155',
                      borderRadius: 6,
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <Upload size={15} />
                    <span>Restore Backup</span>
                  </button>

                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to reset all data back to the clean university seed data? Any custom test listings will be refreshed.')) {
                        resetDatabaseToSeed();
                        setTick(t => t + 1);
                        showToast('Database reset to factory seed.');
                      }
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 12px',
                      background: '#FEF2F2',
                      border: '1px solid #FECACA',
                      color: '#DC2626',
                      borderRadius: 6,
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <RefreshCw size={14} />
                    <span>Reset Seed</span>
                  </button>
                </div>
              </div>

              {/* Telemetry Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                <div style={{ background: '#fff', padding: '16px 20px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748B', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>
                    <span>Total Database Documents</span>
                    <Server size={16} style={{ color: '#0D2C6C' }} />
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0F172A', marginTop: 8 }}>
                    {dbOverview.totalRecords.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: 4, fontWeight: 500 }}>
                    7 active system collections
                  </div>
                </div>

                <div style={{ background: '#fff', padding: '16px 20px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748B', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>
                    <span>Storage Footprint</span>
                    <HardDrive size={16} style={{ color: '#2563EB' }} />
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0F172A', marginTop: 8 }}>
                    {dbOverview.storageUsageKB} KB
                  </div>
                  <div style={{ width: '100%', height: 6, background: '#F1F5F9', borderRadius: 99, marginTop: 8, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, Math.max(2, (dbOverview.storageUsageKB / dbOverview.storageQuotaKB) * 100))}%`, height: '100%', background: '#2563EB', borderRadius: 99 }} />
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: '#64748B', marginTop: 4 }}>
                    Quota: {dbOverview.storageQuotaKB} KB (~{((dbOverview.storageUsageKB / dbOverview.storageQuotaKB) * 100).toFixed(1)}% allocated)
                  </div>
                </div>

                <div style={{ background: '#fff', padding: '16px 20px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748B', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>
                    <span>Persistence Layer</span>
                    <Database size={16} style={{ color: '#16A34A' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16A34A' }} />
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A' }}>Online & Synchronized</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 4 }}>
                    HTML5 Storage with Multi-Tab Event Dispatch
                  </div>
                </div>
              </div>

              {/* Collections Navigation Tabs */}
              <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '8px 12px',
                  background: '#F8FAFC',
                  borderBottom: '1px solid #E2E8F0',
                  overflowX: 'auto'
                }}>
                  {Object.entries(dbOverview.collections).map(([key, col]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setSelectedDbCollection(key);
                        setDbSearch('');
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '6px 12px',
                        borderRadius: 6,
                        border: 'none',
                        background: selectedDbCollection === key ? '#0D2C6C' : 'transparent',
                        color: selectedDbCollection === key ? '#fff' : '#475569',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span>{col.name}</span>
                      <span style={{
                        padding: '1px 6px',
                        borderRadius: 999,
                        fontSize: '0.6875rem',
                        background: selectedDbCollection === key ? 'rgba(255,255,255,0.2)' : '#E2E8F0',
                        color: selectedDbCollection === key ? '#fff' : '#475569'
                      }}>
                        {col.count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Collection Filter & Table */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative', width: 320 }}>
                    <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                    <input
                      type="text"
                      placeholder={`Search ${dbOverview.collections[selectedDbCollection]?.name}...`}
                      value={dbSearch}
                      onChange={e => setDbSearch(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 10px 6px 32px',
                        border: '1px solid #CBD5E1',
                        borderRadius: 6,
                        fontSize: '0.8125rem',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div style={{ fontSize: '0.8125rem', color: '#64748B' }}>
                    Showing records in <strong>{dbOverview.collections[selectedDbCollection]?.name}</strong>
                  </div>
                </div>

                {/* Dynamic Collection Records Table */}
                <div style={{ overflowX: 'auto', maxHeight: 480 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontWeight: 600 }}>
                        <th style={{ padding: '10px 16px', width: 60 }}>#</th>
                        <th style={{ padding: '10px 16px' }}>Primary ID</th>
                        <th style={{ padding: '10px 16px' }}>Key Attributes</th>
                        <th style={{ padding: '10px 16px' }}>Status / Metadata</th>
                        <th style={{ padding: '10px 16px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const items = dbOverview.collections[selectedDbCollection]?.data || [];
                        const filtered = items.filter(item => {
                          if (!dbSearch.trim()) return true;
                          return JSON.stringify(item).toLowerCase().includes(dbSearch.toLowerCase());
                        });

                        if (!filtered.length) {
                          return (
                            <tr>
                              <td colSpan={5} style={{ padding: '32px 16px', textAlign: 'center', color: '#94A3B8' }}>
                                No matching records found in {dbOverview.collections[selectedDbCollection]?.name}.
                              </td>
                            </tr>
                          );
                        }

                        return filtered.map((doc, idx) => (
                          <tr key={doc.id || doc.userId || doc.staffId || idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '10px 16px', color: '#94A3B8', fontFamily: 'monospace' }}>
                              {idx + 1}
                            </td>
                            <td style={{ padding: '10px 16px', fontWeight: 600, color: '#0F172A', fontFamily: 'monospace' }}>
                              {doc.id || doc.userId || doc.staffId || 'SYS_CONFIG'}
                            </td>
                            <td style={{ padding: '10px 16px', color: '#334155' }}>
                              {doc.fullName || doc.name || doc.title || doc.action || (doc.maintenanceMode !== undefined ? 'Platform Governance' : 'Record Document')}
                              {doc.email && <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{doc.email}</div>}
                              {doc.price !== undefined && <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>RM {doc.price}</div>}
                            </td>
                            <td style={{ padding: '10px 16px' }}>
                              <span style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: 4,
                                fontSize: '0.6875rem',
                                fontWeight: 600,
                                background: doc.status === 'active' || doc.status === 'available' ? '#ECFDF5' : '#F1F5F9',
                                color: doc.status === 'active' || doc.status === 'available' ? '#047857' : '#475569'
                              }}>
                                {doc.status || doc.category || doc.faculty || 'OK'}
                              </span>
                              {doc.createdAt && (
                                <div style={{ fontSize: '0.6875rem', color: '#94A3B8', marginTop: 2 }}>
                                  {new Date(doc.createdAt).toLocaleDateString()}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                              <button
                                onClick={() => setInspectedDoc(doc)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  padding: '4px 10px',
                                  borderRadius: 4,
                                  border: '1px solid #CBD5E1',
                                  background: '#fff',
                                  color: '#0D2C6C',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                              >
                                <Eye size={13} />
                                <span>Inspect JSON</span>
                              </button>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* JSON Document Inspector Modal */}
              {inspectedDoc && (
                <div style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(15, 23, 42, 0.6)',
                  backdropFilter: 'blur(4px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1000,
                  padding: 20
                }}>
                  <div style={{
                    background: '#0F172A',
                    borderRadius: 12,
                    width: '100%',
                    maxWidth: 720,
                    maxHeight: '85vh',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                    border: '1px solid #334155'
                  }}>
                    <div style={{
                      padding: '14px 20px',
                      borderBottom: '1px solid #1E293B',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#E2E8F0', fontSize: '0.875rem', fontWeight: 600 }}>
                        <Database size={16} style={{ color: '#38BDF8' }} />
                        <span>Document Inspector: {inspectedDoc.id || inspectedDoc.userId || inspectedDoc.staffId || 'Record'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(JSON.stringify(inspectedDoc, null, 2));
                            setCopiedDoc(true);
                            setTimeout(() => setCopiedDoc(false), 2000);
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '4px 8px',
                            background: copiedDoc ? '#166534' : '#1E293B',
                            color: copiedDoc ? '#86EFAC' : '#CBD5E1',
                            border: '1px solid #334155',
                            borderRadius: 4,
                            fontSize: '0.75rem',
                            cursor: 'pointer'
                          }}
                        >
                          {copiedDoc ? <Check size={12} /> : <Copy size={12} />}
                          <span>{copiedDoc ? 'Copied' : 'Copy JSON'}</span>
                        </button>
                        <button
                          onClick={() => setInspectedDoc(null)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#94A3B8',
                            cursor: 'pointer'
                          }}
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </div>

                    <div style={{ padding: 20, overflowY: 'auto' }}>
                      <pre style={{
                        margin: 0,
                        fontSize: '0.8125rem',
                        fontFamily: 'monospace',
                        color: '#38BDF8',
                        background: '#020617',
                        padding: 16,
                        borderRadius: 8,
                        overflowX: 'auto',
                        lineHeight: 1.5
                      }}>
                        {JSON.stringify(inspectedDoc, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: SETTINGS */}
          {activeTab === 'settings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Settings
                </h2>
                <p style={{ fontSize: '0.8125rem', color: '#64748B', margin: '2px 0 0' }}>
                  Marketplace access rules, keyword filters, and recommendation preferences.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
                
                {/* General Settings */}
                <div style={{ background: '#fff', padding: '20px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0F172A', marginBottom: 12 }}>
                    Access & Verification
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: '0.8125rem', color: '#1E293B' }}>Require Campus Email</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Enforce institutional email domain validation on student registration</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.requireStudentVerification}
                        onChange={e => setSettings({ ...settings, requireStudentVerification: e.target.checked })}
                      />
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: '0.8125rem', color: '#1E293B' }}>Maintenance Mode</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Temporarily disable new listings from students</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.maintenanceMode}
                        onChange={e => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                      />
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: '0.8125rem', color: '#1E293B' }}>Keyword Auto-Flagging</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Automatically flag listings containing blacklisted words</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.autoFlagBannedKeywords}
                        onChange={e => setSettings({ ...settings, autoFlagBannedKeywords: e.target.checked })}
                      />
                    </label>
                  </div>
                </div>

                {/* Blacklisted Keywords */}
                <div style={{ background: '#fff', padding: '20px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0F172A', marginBottom: 4 }}>
                    Blacklisted Keywords
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: 12 }}>
                    Listings with these keywords are automatically flagged for review.
                  </p>

                  <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                    <input
                      type="text"
                      placeholder="Add keyword (e.g. vape, exam answers)..."
                      value={newBannedWord}
                      onChange={e => setNewBannedWord(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleAddBannedKeyword(); }}
                      style={{ flex: 1, height: 32, padding: '0 10px', border: '1px solid #CBD5E1', borderRadius: 6, fontSize: '0.75rem' }}
                    />
                    <button
                      onClick={handleAddBannedKeyword}
                      style={{ padding: '0 12px', background: '#0D2C6C', color: '#fff', border: 'none', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Add
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {(settings.bannedKeywords || []).map(word => (
                      <span
                        key={word}
                        style={{
                          background: '#F1F5F9',
                          color: '#334155',
                          padding: '3px 8px',
                          borderRadius: 4,
                          fontSize: '0.75rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <span>{word}</span>
                        <X
                          size={11}
                          style={{ cursor: 'pointer', color: '#94A3B8' }}
                          onClick={() => handleRemoveBannedKeyword(word)}
                        />
                      </span>
                    ))}
                  </div>
                </div>

              </div>

              {/* Recommendation Weights */}
              <div style={{ background: '#fff', padding: '20px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0F172A', marginBottom: 4 }}>
                  Recommendation Weights
                </div>
                <p style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: 16 }}>
                  Adjust ranking importance for personalized recommendations.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                      Category Affinity: {settings.recommendationWeights?.categoryAffinity || 2.5}x
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="5.0"
                      step="0.1"
                      value={settings.recommendationWeights?.categoryAffinity || 2.5}
                      onChange={e => setSettings({
                        ...settings,
                        recommendationWeights: { ...settings.recommendationWeights, categoryAffinity: parseFloat(e.target.value) }
                      })}
                      style={{ width: '100%' }}
                    />
                    <div style={{ fontSize: '0.6875rem', color: '#64748B', marginTop: 2 }}>
                      Boosts items matching the student's viewed categories.
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                      Campus Proximity: {settings.recommendationWeights?.campusProximity || 1.5}x
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="3.0"
                      step="0.1"
                      value={settings.recommendationWeights?.campusProximity || 1.5}
                      onChange={e => setSettings({
                        ...settings,
                        recommendationWeights: { ...settings.recommendationWeights, campusProximity: parseFloat(e.target.value) }
                      })}
                      style={{ width: '100%' }}
                    />
                    <div style={{ fontSize: '0.6875rem', color: '#64748B', marginTop: 2 }}>
                      Prioritizes items located on the student's campus.
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                      Recency: {settings.recommendationWeights?.freshnessDecay || 1.2}x
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="2.5"
                      step="0.1"
                      value={settings.recommendationWeights?.freshnessDecay || 1.2}
                      onChange={e => setSettings({
                        ...settings,
                        recommendationWeights: { ...settings.recommendationWeights, freshnessDecay: parseFloat(e.target.value) }
                      })}
                      style={{ width: '100%' }}
                    />
                    <div style={{ fontSize: '0.6875rem', color: '#64748B', marginTop: 2 }}>
                      Favors newly posted listings.
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={handleSaveSettings}
                    style={{
                      padding: '8px 16px',
                      background: '#0D2C6C',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Save Settings
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* TAB: STAFF ACCESS & SECURITY ROSTER */}
          {activeTab === 'staff' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* Header and Controls */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    Authorized Administrative Personnel
                  </h1>
                  <p style={{ fontSize: '0.8125rem', color: '#64748B', margin: '4px 0 0' }}>
                    Restricted roster of verified university personnel authorized to log in, moderate campus listings, resolve complaints, and edit platform parameters.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    onClick={() => {
                      setStaffError('');
                      setShowAddStaffModal(true);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 16px',
                      background: '#0D2C6C',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: '0 1px 2px rgba(13, 44, 108, 0.2)'
                    }}
                  >
                    <UserPlus size={15} />
                    <span>Authorize Staff Member</span>
                  </button>
                </div>
              </div>

              {/* 4 Metric Summary Cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                gap: 16
              }}>
                <div style={{ background: '#fff', padding: '16px 20px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                    Authorized Personnel
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0F172A', marginTop: 6 }}>
                    {authorizedAdmins.length}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: 4, fontWeight: 500 }}>
                    Active university administrators
                  </div>
                </div>

                <div style={{ background: '#fff', padding: '16px 20px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                    Super Administrators
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0F172A', marginTop: 6 }}>
                    {authorizedAdmins.filter(a => a.role === 'Super Administrator').length}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#1D4ED8', marginTop: 4, fontWeight: 500 }}>
                    Full system configuration rights
                  </div>
                </div>

                <div style={{ background: '#fff', padding: '16px 20px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                    Active Console Session
                  </div>
                  <div style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#0F172A', marginTop: 6 }}>
                    {adminSession.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 4 }}>
                    {adminSession.staffId} • {adminSession.role}
                  </div>
                </div>

                <div style={{ background: '#fff', padding: '16px 20px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                    Access Policy
                  </div>
                  <div style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#0F172A', marginTop: 6 }}>
                    Domain Enforced
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#0D2C6C', marginTop: 4, fontWeight: 600 }}>
                    @university.edu accounts
                  </div>
                </div>
              </div>

              {/* Policy Callout Banner */}
              <div style={{
                background: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: 8,
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12
              }}>
                <ShieldCheck size={20} style={{ color: '#1D4ED8', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1E40AF' }}>
                    Restricted Institutional Access Control (RBAC) Policy
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#1E3A8A', marginTop: 3, lineHeight: 1.5 }}>
                    Only verified personnel listed below can authenticate through the Administration Gateway. Every listing takedown, account modification, and configuration change is signed with the acting staff member’s official ID.
                  </div>
                </div>
              </div>

              {/* Search Bar */}
              <div style={{ background: '#fff', padding: '12px 16px', borderRadius: 8, border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 12 }}>
                <Search size={16} style={{ color: '#94A3B8' }} />
                <input
                  type="text"
                  placeholder="Filter roster by staff name, email, staff ID, department, or role..."
                  value={staffSearch}
                  onChange={e => setStaffSearch(e.target.value)}
                  style={{
                    flex: 1,
                    border: 'none',
                    outline: 'none',
                    fontSize: '0.8125rem',
                    color: '#0F172A'
                  }}
                />
                {staffSearch && (
                  <button
                    onClick={() => setStaffSearch('')}
                    style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
                  >
                    <X size={14} />
                  </button>
                )}
                <span style={{ fontSize: '0.75rem', color: '#64748B', whiteSpace: 'nowrap' }}>
                  {filteredStaff.length} of {authorizedAdmins.length} staff
                </span>
              </div>

              {/* Authorized Staff Table */}
              <div style={{
                background: '#fff',
                borderRadius: 8,
                border: '1px solid #E2E8F0',
                overflow: 'hidden',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
              }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569' }}>
                        <th style={{ padding: '12px 16px', fontWeight: 600 }}>Staff Personnel</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600 }}>University Email</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600 }}>Staff ID</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600 }}>Department / Faculty</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600 }}>Assigned Role</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600 }}>Permissions</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Security Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStaff.map((staff, idx) => {
                        const isRootAdmin = staff.email === 'admin@university.edu';
                        const isCurrentSession = staff.email === adminSession.email;

                        return (
                          <tr
                            key={staff.email}
                            style={{
                              borderBottom: idx === filteredStaff.length - 1 ? 'none' : '1px solid #F1F5F9',
                              background: isCurrentSession ? '#F0F9FF' : '#fff'
                            }}
                          >
                            {/* Staff Member */}
                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: '50%',
                                  background: staff.role === 'Super Administrator' ? '#0D2C6C' :
                                              staff.role === 'Faculty Moderator' ? '#047857' : '#6B21A8',
                                  color: '#fff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  flexShrink: 0
                                }}>
                                  {staff.name ? staff.name.charAt(0) : 'S'}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 600, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span>{staff.name}</span>
                                    {isCurrentSession && (
                                      <span style={{
                                        fontSize: '0.625rem',
                                        background: '#0284C7',
                                        color: '#fff',
                                        padding: '1px 5px',
                                        borderRadius: 4,
                                        fontWeight: 600
                                      }}>
                                        You
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '0.6875rem', color: '#64748B' }}>
                                    Added: {new Date(staff.createdAt || '2026-01-01').toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Email */}
                            <td style={{ padding: '14px 16px', color: '#334155', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                              {staff.email}
                            </td>

                            {/* Staff ID */}
                            <td style={{ padding: '14px 16px', color: '#0F172A', fontWeight: 600 }}>
                              {staff.staffId}
                            </td>

                            {/* Department */}
                            <td style={{ padding: '14px 16px', color: '#475569' }}>
                              {staff.department}
                            </td>

                            {/* Role Badge */}
                            <td style={{ padding: '14px 16px' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '3px 8px',
                                borderRadius: 4,
                                fontSize: '0.6875rem',
                                fontWeight: 600,
                                background: staff.role === 'Super Administrator' ? '#EFF6FF' :
                                            staff.role === 'Faculty Moderator' ? '#F0FDF4' : '#FAF5FF',
                                color: staff.role === 'Super Administrator' ? '#1D4ED8' :
                                       staff.role === 'Faculty Moderator' ? '#15803D' : '#7E22CE',
                                border: `1px solid ${
                                  staff.role === 'Super Administrator' ? '#BFDBFE' :
                                  staff.role === 'Faculty Moderator' ? '#BBF7D0' : '#E9D5FF'
                                }`
                              }}>
                                {staff.role === 'Super Administrator' ? <Award size={12} /> :
                                 staff.role === 'Faculty Moderator' ? <CheckCircle2 size={12} /> : <ShieldAlert size={12} />}
                                <span>{staff.role}</span>
                              </span>
                            </td>

                            {/* Permissions */}
                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {(staff.permissions || []).map((perm, pIdx) => (
                                  <span
                                    key={pIdx}
                                    style={{
                                      fontSize: '0.625rem',
                                      background: '#F1F5F9',
                                      color: '#475569',
                                      padding: '1px 5px',
                                      borderRadius: 4,
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    {perm}
                                  </span>
                                ))}
                              </div>
                            </td>

                            {/* Status */}
                            <td style={{ padding: '14px 16px' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '2px 8px',
                                borderRadius: 999,
                                fontSize: '0.6875rem',
                                fontWeight: 600,
                                background: '#ECFDF5',
                                color: '#059669',
                                border: '1px solid #A7F3D0'
                              }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
                                <span>Active</span>
                              </span>
                            </td>

                            {/* Actions */}
                            <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                              {isRootAdmin ? (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  fontSize: '0.6875rem',
                                  color: '#64748B',
                                  background: '#F8FAFC',
                                  padding: '4px 8px',
                                  borderRadius: 4,
                                  border: '1px solid #E2E8F0'
                                }}>
                                  <Lock size={12} />
                                  <span>Protected Root</span>
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleRevokeStaff(staff)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    padding: '5px 10px',
                                    background: '#FEF2F2',
                                    border: '1px solid #FECACA',
                                    color: '#DC2626',
                                    borderRadius: 6,
                                    fontSize: '0.71875rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s'
                                  }}
                                  title={`Revoke administrative privileges for ${staff.name}`}
                                >
                                  <Trash2 size={12} />
                                  <span>Revoke Access</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </main>
      </div>

      {/* Case Review Modal */}
      {activeReportModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 8,
            maxWidth: 500,
            width: '100%',
            overflow: 'hidden',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
          }}>
            <div style={{
              background: '#0D2C6C',
              color: '#fff',
              padding: '14px 18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ fontSize: '0.9375rem', fontWeight: 600 }}>
                Review Reported Item
              </div>
              <button
                onClick={() => setActiveReportModal(null)}
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: 20 }}>
              {activeReportModal.product ? (
                <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                  <img
                    src={activeReportModal.product.images?.[0]}
                    alt=""
                    style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6, border: '1px solid #E2E8F0' }}
                  />
                  <div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#0F172A' }}>
                      {activeReportModal.product.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 2 }}>
                      RM {activeReportModal.product.price} • {activeReportModal.product.category}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                      Seller: {activeReportModal.product.sellerName || 'Student'} ({activeReportModal.product.faculty})
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: 10, background: '#F1F5F9', borderRadius: 6, marginBottom: 16, color: '#64748B', fontStyle: 'italic', fontSize: '0.8125rem' }}>
                  The item for this report has already been deleted.
                </div>
              )}

              <div style={{ background: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: 6, padding: 12, marginBottom: 16 }}>
                <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#991B1B', textTransform: 'uppercase' }}>
                  Reason: {activeReportModal.report.reason}
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#7F1D1D', marginTop: 4, lineHeight: 1.4 }}>
                  "{activeReportModal.report.details || 'No additional details.'}"
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  onClick={() => setActiveReportModal(null)}
                  style={{ padding: '6px 12px', background: '#F1F5F9', border: 'none', borderRadius: 6, fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDismiss(activeReportModal.report.id)}
                  style={{ padding: '6px 12px', background: '#fff', border: '1px solid #CBD5E1', borderRadius: 6, fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer' }}
                >
                  Dismiss Report
                </button>
                {activeReportModal.product && (
                  <button
                    onClick={() => handleTakeDown(activeReportModal.report.id)}
                    style={{ padding: '6px 12px', background: '#DC2626', color: '#fff', border: 'none', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Remove Listing
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Listing Modal */}
      {editingProduct && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 8,
            maxWidth: 460,
            width: '100%',
            overflow: 'hidden',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
          }}>
            <div style={{
              background: '#0D2C6C',
              color: '#fff',
              padding: '14px 18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ fontSize: '0.9375rem', fontWeight: 600 }}>
                Edit Listing
              </div>
              <button
                onClick={() => setEditingProduct(null)}
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveListingEdit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                  Title
                </label>
                <input
                  type="text"
                  value={editingProduct.title}
                  onChange={e => setEditingProduct({ ...editingProduct, title: e.target.value })}
                  required
                  style={{ width: '100%', height: 34, padding: '0 10px', border: '1px solid #CBD5E1', borderRadius: 6, fontSize: '0.8125rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Price (RM)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editingProduct.price}
                    onChange={e => setEditingProduct({ ...editingProduct, price: e.target.value })}
                    style={{ width: '100%', height: 34, padding: '0 10px', border: '1px solid #CBD5E1', borderRadius: 6, fontSize: '0.8125rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Status
                  </label>
                  <select
                    value={editingProduct.status}
                    onChange={e => setEditingProduct({ ...editingProduct, status: e.target.value })}
                    style={{ width: '100%', height: 34, padding: '0 8px', border: '1px solid #CBD5E1', borderRadius: 6, fontSize: '0.8125rem', background: '#fff' }}
                  >
                    <option value="available">Available</option>
                    <option value="sold">Sold Out</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                  Category
                </label>
                <select
                  value={editingProduct.category}
                  onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value })}
                  style={{ width: '100%', height: 34, padding: '0 8px', border: '1px solid #CBD5E1', borderRadius: 6, fontSize: '0.8125rem', background: '#fff' }}
                >
                  {CATEGORIES.filter(c => c.id !== 'activities').map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                  Meetup Location
                </label>
                <input
                  type="text"
                  value={editingProduct.meetup || ''}
                  onChange={e => setEditingProduct({ ...editingProduct, meetup: e.target.value })}
                  style={{ width: '100%', height: 34, padding: '0 10px', border: '1px solid #CBD5E1', borderRadius: 6, fontSize: '0.8125rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  style={{ padding: '6px 12px', background: '#F1F5F9', border: 'none', borderRadius: 6, fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '6px 14px', background: '#0D2C6C', color: '#fff', border: 'none', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Authorize Staff Modal */}
      {showAddStaffModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 8,
            maxWidth: 480,
            width: '100%',
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
          }}>
            <div style={{
              background: '#0D2C6C',
              color: '#fff',
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <UserPlus size={18} />
                <div style={{ fontSize: '0.9375rem', fontWeight: 600 }}>
                  Authorize Campus Personnel
                </div>
              </div>
              <button
                onClick={() => setShowAddStaffModal(false)}
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddStaffSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              
              <div style={{
                background: '#F0F9FF',
                border: '1px solid #BAE6FD',
                borderRadius: 6,
                padding: '10px 12px',
                fontSize: '0.75rem',
                color: '#0369A1',
                lineHeight: 1.4
              }}>
                <strong style={{ fontWeight: 600 }}>Restricted Access:</strong> Only official university personnel with valid credentials can be added to the administrative roster.
              </div>

              {staffError && (
                <div style={{
                  padding: '8px 12px',
                  background: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  borderRadius: 6,
                  color: '#991B1B',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <AlertTriangle size={15} style={{ color: '#DC2626', flexShrink: 0 }} />
                  <span>{staffError}</span>
                </div>
              )}

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                  Full Staff Name *
                </label>
                <input
                  type="text"
                  value={newStaffForm.name}
                  onChange={e => setNewStaffForm({ ...newStaffForm, name: e.target.value })}
                  placeholder="e.g. Assoc. Prof. Dr. Alex Tan"
                  required
                  style={{ width: '100%', height: 36, padding: '0 10px', border: '1px solid #CBD5E1', borderRadius: 6, fontSize: '0.8125rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Official University Email *
                  </label>
                  <input
                    type="email"
                    value={newStaffForm.email}
                    onChange={e => setNewStaffForm({ ...newStaffForm, email: e.target.value })}
                    placeholder="e.g. alex.tan@university.edu"
                    required
                    style={{ width: '100%', height: 36, padding: '0 10px', border: '1px solid #CBD5E1', borderRadius: 6, fontSize: '0.8125rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Staff ID *
                  </label>
                  <input
                    type="text"
                    value={newStaffForm.staffId}
                    onChange={e => setNewStaffForm({ ...newStaffForm, staffId: e.target.value })}
                    placeholder="e.g. ADM-031"
                    required
                    style={{ width: '100%', height: 36, padding: '0 10px', border: '1px solid #CBD5E1', borderRadius: 6, fontSize: '0.8125rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                  Faculty / Department *
                </label>
                <select
                  value={newStaffForm.department}
                  onChange={e => setNewStaffForm({ ...newStaffForm, department: e.target.value })}
                  style={{ width: '100%', height: 36, padding: '0 8px', border: '1px solid #CBD5E1', borderRadius: 6, fontSize: '0.8125rem', background: '#fff' }}
                >
                  <option value="Faculty of Engineering, Technology & Built Environment">Faculty of Engineering, Technology & Built Environment</option>
                  <option value="Faculty of Business, Accounting & Technology">Faculty of Business, Accounting & Technology</option>
                  <option value="Faculty of Medicine, Nursing & Health Sciences">Faculty of Medicine, Nursing & Health Sciences</option>
                  <option value="Faculty of Education, Languages & Psychology">Faculty of Education, Languages & Psychology</option>
                  <option value="Student Affairs & Campus Security Division">Student Affairs & Campus Security Division</option>
                  <option value="Information Technology & Enterprise Systems Directorate">Information Technology & Enterprise Systems Directorate</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Administrative Role *
                  </label>
                  <select
                    value={newStaffForm.role}
                    onChange={e => setNewStaffForm({ ...newStaffForm, role: e.target.value })}
                    style={{ width: '100%', height: 36, padding: '0 8px', border: '1px solid #CBD5E1', borderRadius: 6, fontSize: '0.8125rem', background: '#fff' }}
                  >
                    <option value="Faculty Moderator">Faculty Moderator</option>
                    <option value="Safety & Compliance Officer">Safety & Compliance Officer</option>
                    <option value="Super Administrator">Super Administrator</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Initial Security PIN *
                  </label>
                  <input
                    type="text"
                    value={newStaffForm.password}
                    onChange={e => setNewStaffForm({ ...newStaffForm, password: e.target.value })}
                    required
                    style={{ width: '100%', height: 36, padding: '0 10px', border: '1px solid #CBD5E1', borderRadius: 6, fontSize: '0.8125rem', fontFamily: 'monospace' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  style={{ padding: '8px 14px', background: '#F1F5F9', border: 'none', borderRadius: 6, fontSize: '0.78125rem', fontWeight: 500, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 16px', background: '#0D2C6C', color: '#fff', border: 'none', borderRadius: 6, fontSize: '0.78125rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Grant Administrative Access
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
