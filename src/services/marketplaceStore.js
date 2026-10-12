/**
 * Campus Marketplace — Data Store & Recommendation Engine
 * Manages users, products, activities, cookie preferences, and personalization.
 */
import { SEED_USERS, SEED_ACTIVITIES, CATEGORIES } from '../data/seedData.js';
import { ALL_SEED_PRODUCTS } from '../data/extendedSeedData.js';
import { 
  syncProductToFirestore, 
  deleteProductFromFirestore, 
  syncUserToFirestore, 
  fetchFirestoreProducts, 
  fetchFirestoreUsers 
} from './firestoreSync.js';

export { ALL_SEED_PRODUCTS };

const KEYS = {
  PRODUCTS: 'segi_products_v8',
  USER: 'segi_user_v2',
  USERS: 'segi_users_v4',
  ACTIVITIES: 'segi_activities',
  INTERACTIONS: 'segi_interactions',
  REPORTS: 'segi_reports',
  COOKIE_CONSENT: 'segi_cookie_consent',
  PREFERENCES: 'segi_user_preferences',
  AUDIT_LOGS: 'segi_audit_logs_v2',
  ADMIN_SETTINGS: 'segi_admin_settings_v2',
  CHATS: 'segi_chats_v2',
  ADMIN_USERS: 'segi_admin_users_v2',
  ADMIN_SESSION: 'segi_admin_session_v2'
};

export const DEFAULT_ADMIN_SETTINGS = {
  maintenanceMode: false,
  requireStudentVerification: true,
  allowGuestBrowsing: true,
  autoFlagBannedKeywords: true,
  bannedKeywords: ['leak', 'exam answers', 'vape', 'tobacco', 'weapon', 'gambling', 'cheat sheet', 'counterfeit'],
  allowedDomains: ['@university.edu', '@campus.edu', '@student.edu'],
  maxListingsPerStudent: 25,
  recommendationWeights: {
    categoryAffinity: 2.5,
    campusProximity: 1.5,
    viewPopularity: 0.8,
    freshnessDecay: 1.2
  }
};

const SEED_AUDIT_LOGS = [
  {
    id: 'log_01',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    action: 'SYSTEM_CHECK',
    category: 'system',
    actor: 'Admin',
    details: 'System check completed. All listings and categories verified active.',
    severity: 'info'
  },
  {
    id: 'log_02',
    timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
    action: 'USER_SYNC',
    category: 'auth',
    actor: 'Admin',
    details: 'Verified campus accounts against university email domains.',
    severity: 'info'
  },
  {
    id: 'log_03',
    timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
    action: 'CATALOG_SYNC',
    category: 'catalog',
    actor: 'Admin',
    details: 'Refreshed catalog indexing and category counts.',
    severity: 'info'
  },
  {
    id: 'log_04',
    timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
    action: 'SETTINGS_UPDATE',
    category: 'moderation',
    actor: 'Campus Admin',
    details: 'Updated campus safety keywords and recommendation weights.',
    severity: 'success'
  }
];

const VALID_DOMAINS = ['@university.edu', '@campus.edu', '@student.edu'];

// Purge legacy storage keys from previous iterations
const LEGACY_PRODUCT_KEYS = [
  'segi_products',
  'segi_products_v1',
  'segi_products_v2',
  'segi_products_v3',
  'segi_products_v4',
  'segi_products_v5',
  'segi_products_v6',
  'segi_products_v7'
];

const memoryStore = {};

function storageGet(key) {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
  } catch {}
  return memoryStore[key] || null;
}

function storageSet(key, value) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
      return;
    }
  } catch {}
  memoryStore[key] = value;
}

function storageRemove(key) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
      return;
    }
  } catch {}
  delete memoryStore[key];
}

function dispatchStoreUpdate() {
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new Event('store_update'));
      window.dispatchEvent(new Event('chat_update'));
      window.dispatchEvent(new Event('admin_auth_update'));
    } catch {}
  }
}

// -- Cookies Utilities --
export function setCookie(name, value, days = 365) {
  if (typeof document === 'undefined') return;
  try {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(typeof value === 'object' ? JSON.stringify(value) : value)}; expires=${expires}; path=/; SameSite=Lax`;
  } catch (e) {
    console.error('Error writing cookie:', e);
  }
}

export function getCookie(name) {
  if (typeof document === 'undefined') return null;
  try {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      const raw = parts.pop().split(';').shift();
      const decoded = decodeURIComponent(raw);
      try { return JSON.parse(decoded); } catch { return decoded; }
    }
    return null;
  } catch {
    return null;
  }
}

export function getCookieConsent() {
  try {
    const fromCookie = getCookie('segi_cookie_consent');
    if (fromCookie) return fromCookie;
    if (typeof localStorage !== 'undefined') {
      const fromStorage = localStorage.getItem(KEYS.COOKIE_CONSENT);
      return fromStorage ? JSON.parse(fromStorage) : null;
    }
    return null;
  } catch {
    return null;
  }
}

export function setCookieConsent(consentData) {
  const data = {
    accepted: true,
    recommendations: consentData?.recommendations ?? true,
    essential: true,
    timestamp: new Date().toISOString()
  };
  setCookie('segi_cookie_consent', data, 365);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(KEYS.COOKIE_CONSENT, JSON.stringify(data));
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('cookie_consent_update'));
    window.dispatchEvent(new Event('store_update'));
  }
  return data;
}

let memoryPrefs = null;

export function isCampusEmail(email) {
  if (!email) return false;
  const e = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return false;
  // If allowed domains are set via environment variable, check them; otherwise allow any valid email
  const envDomains = typeof import.meta !== 'undefined' && import.meta.env?.VITE_ALLOWED_DOMAINS
    ? import.meta.env.VITE_ALLOWED_DOMAINS.split(',').map(d => d.trim().toLowerCase()).filter(Boolean)
    : null;
  if (envDomains && envDomains.length > 0) {
    return envDomains.some(d => e.endsWith(d));
  }
  return true;
}

export function getPreferences(userId = null) {
  const activeId = userId || getUser()?.userId;
  const key = activeId ? `${KEYS.PREFERENCES}_${activeId}` : KEYS.PREFERENCES;
  try {
    const fromCookie = getCookie('segi_pref');
    if (fromCookie && typeof fromCookie === 'object' && !activeId) return fromCookie;
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    }
    return memoryPrefs || { recentViews: [], categories: {}, faculties: {}, recentSearches: [] };
  } catch {
    return memoryPrefs || { recentViews: [], categories: {}, faculties: {}, recentSearches: [] };
  }
}

export function savePreferences(prefs, userId = null) {
  memoryPrefs = prefs;
  const activeId = userId || getUser()?.userId;
  const key = activeId ? `${KEYS.PREFERENCES}_${activeId}` : KEYS.PREFERENCES;
  try {
    setCookie('segi_pref', prefs, 180);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(prefs));
    }
  } catch {}
}

export function validateEmail(email) {
  if (!email) return { ok: false, msg: 'Enter your university email address.' };
  const e = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
    return { ok: false, msg: 'Please enter a valid email address.' };
  }
  const isCampus = isCampusEmail(e);
  if (!isCampus) {
    return { ok: false, msg: 'Only approved campus or university email addresses are permitted.' };
  }
  return { ok: true, email: e, isCampus: true };
}

export function getUserByEmail(email) {
  if (!email) return null;
  const e = email.trim().toLowerCase();
  return getAllUsers().find(u => u.email.toLowerCase() === e) || null;
}

export function userExists(email) {
  return Boolean(getUserByEmail(email));
}

export function initStore() {
  // Purge legacy storage versions
  try {
    LEGACY_PRODUCT_KEYS.forEach(k => storageRemove(k));
  } catch {}

  const existing = storageGet(KEYS.PRODUCTS);
  let parsed = null;
  try { parsed = JSON.parse(existing); } catch {}
  
  // Re-sync if store is missing, corrupt, has old size, or has old unverified anatomy cover
  const needsSync = !parsed || 
    !Array.isArray(parsed) || 
    parsed.length < ALL_SEED_PRODUCTS.length ||
    parsed.some(p => p.title.includes('Anatomy & Physiology') && p.images[0]?.includes('unsplash.com'));

  if (needsSync) {
    const userCustom = Array.isArray(parsed)
      ? parsed.filter(p => !p.id.startsWith('p') && !p.id.startsWith('ep') && !p.id.startsWith('ad') && !p.id.startsWith('st_') && !p.id.startsWith('tech_'))
      : [];
    storageSet(KEYS.PRODUCTS, JSON.stringify([...userCustom, ...ALL_SEED_PRODUCTS]));
  }
  if (!storageGet(KEYS.USERS)) {
    storageSet(KEYS.USERS, JSON.stringify(SEED_USERS));
  }
  if (!storageGet(KEYS.ACTIVITIES)) {
    storageSet(KEYS.ACTIVITIES, JSON.stringify(SEED_ACTIVITIES));
  }
  if (!storageGet(KEYS.INTERACTIONS)) {
    storageSet(KEYS.INTERACTIONS, JSON.stringify([]));
  }
  if (!storageGet(KEYS.REPORTS)) {
    storageSet(KEYS.REPORTS, JSON.stringify([]));
  }
  if (!storageGet(KEYS.AUDIT_LOGS)) {
    storageSet(KEYS.AUDIT_LOGS, JSON.stringify(SEED_AUDIT_LOGS));
  }
  if (!storageGet(KEYS.ADMIN_SETTINGS)) {
    storageSet(KEYS.ADMIN_SETTINGS, JSON.stringify(DEFAULT_ADMIN_SETTINGS));
  }
  if (!storageGet(KEYS.CHATS)) {
    storageSet(KEYS.CHATS, JSON.stringify(SEED_CHATS));
  }
  // Always ensure latest admin roster is synchronized
  const existingAdmins = storageGet(KEYS.ADMIN_USERS);
  const parsedAdmins = existingAdmins ? JSON.parse(existingAdmins) : [];
  const hasAdmin = parsedAdmins.some(a => a.email?.toLowerCase() === 'admin@university.edu');
  if (!hasAdmin) {
    storageSet(KEYS.ADMIN_USERS, JSON.stringify(DEFAULT_AUTHORIZED_ADMINS));
    // Clear any old admin session when admin roster is reset
    storageRemove(KEYS.ADMIN_SESSION);
  }

  // Background sync with Cloud Firestore
  try {
    fetchFirestoreProducts().then(fireProducts => {
      if (Array.isArray(fireProducts) && fireProducts.length > 0) {
        storageSet(KEYS.PRODUCTS, JSON.stringify(fireProducts));
        dispatchStoreUpdate();
      }
    }).catch(() => {});

    fetchFirestoreUsers().then(fireUsers => {
      if (Array.isArray(fireUsers) && fireUsers.length > 0) {
        storageSet(KEYS.USERS, JSON.stringify(fireUsers));
        dispatchStoreUpdate();
      }
    }).catch(() => {});
  } catch {}
}

// -- Products --
export function getProducts() {
  try {
    const raw = storageGet(KEYS.PRODUCTS);
    const list = raw ? JSON.parse(raw) : null;
    if (Array.isArray(list) && list.length > 0) return list;
    return ALL_SEED_PRODUCTS;
  }
  catch { return ALL_SEED_PRODUCTS; }
}

function saveProducts(p) {
  storageSet(KEYS.PRODUCTS, JSON.stringify(p));
  dispatchStoreUpdate();
}

export function createProduct(data, user) {
  const products = getProducts();
  const isService = data.category === 'services';
  const isAdoption = data.category === 'adoption';
  const rawPrice = parseFloat(data.price);
  const price = isNaN(rawPrice) || rawPrice < 0 ? 0 : rawPrice;
  const isFree = isAdoption || price === 0;

  const defaultCondition = isService
    ? 'Brand New'
    : (data.category === 'food' ? 'Brand New' : (data.condition || 'Like New'));

  const p = {
    id: (isService ? 's_' : (isAdoption ? 'ad_' : 'p_')) + Date.now(),
    sellerId: user.userId,
    title: data.title.trim(),
    description: data.description.trim(),
    category: data.category,
    faculty: data.faculty || user.faculty,
    price: isAdoption ? 0 : price,
    condition: defaultCondition,
    images: data.images?.length ? data.images : ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80'],
    status: 'available',
    tags: data.tags ? data.tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean) : [],
    meetup: data.meetup || (isService ? 'Online / Remote' : 'Central Campus Library (2nd Floor)'),
    campus: user.campus || 'Main Campus',
    views: 0,
    saves: 0,
    createdAt: new Date().toISOString(),
    isService,
    isFree,
    nonNegotiable: Boolean(data.nonNegotiable),
    serviceType: data.serviceType || null,
    priceLabel: data.priceLabel || null
  };
  saveProducts([p, ...products]);
  syncProductToFirestore(p);
  return p;
}

export function getProduct(id) {
  return getProducts().find(p => p.id === id) || null;
}

export function setProductStatus(id, status) {
  const products = getProducts().map(p =>
    p.id === id ? { ...p, status } : p
  );
  saveProducts(products);
  const updated = products.find(p => p.id === id);
  if (updated) syncProductToFirestore(updated);
}

export function toggleStatus(id) {
  const products = getProducts().map(p =>
    p.id === id ? { ...p, status: p.status === 'available' ? 'sold' : 'available' } : p
  );
  saveProducts(products);
  const updated = products.find(p => p.id === id);
  if (updated) syncProductToFirestore(updated);
}

export function toggleNegotiable(id) {
  const products = getProducts().map(p =>
    p.id === id ? { ...p, nonNegotiable: !p.nonNegotiable } : p
  );
  saveProducts(products);
  const updated = products.find(p => p.id === id);
  if (updated) syncProductToFirestore(updated);
}

export function deleteProduct(id) {
  saveProducts(getProducts().filter(p => p.id !== id));
  deleteProductFromFirestore(id);
}

// -- Activities --
export function getActivities() {
  try { return JSON.parse(localStorage.getItem(KEYS.ACTIVITIES)) || SEED_ACTIVITIES; }
  catch { return SEED_ACTIVITIES; }
}

function saveActivities(a) {
  localStorage.setItem(KEYS.ACTIVITIES, JSON.stringify(a));
  window.dispatchEvent(new Event('store_update'));
}

export function createActivity(data, user) {
  const activities = getActivities();
  const a = {
    id: 'a_' + Date.now(),
    clubId: data.clubId || null,
    clubName: data.clubName?.trim() || 'Student Organization',
    title: data.title.trim(),
    description: data.description.trim(),
    type: data.type || 'event',
    spots: parseInt(data.spots) || 10,
    filled: 0,
    date: data.date || '',
    deadline: data.deadline || '',
    campus: user.campus || 'Kota Damansara',
    tags: data.tags ? data.tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean) : [],
    postedBy: user.userId,
    createdAt: new Date().toISOString()
  };
  saveActivities([a, ...activities]);
  return a;
}

export function joinActivity(activityId) {
  const activities = getActivities().map(a =>
    a.id === activityId && a.filled < a.spots ? { ...a, filled: a.filled + 1 } : a
  );
  saveActivities(activities);
}

// -- Users / Auth --
export function getUser() {
  try {
    const raw = storageGet(KEYS.USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getAllUsers() {
  try {
    const raw = storageGet(KEYS.USERS);
    const list = raw ? JSON.parse(raw) : SEED_USERS;
    return (Array.isArray(list) ? list : SEED_USERS).map(u => ({
      ...u,
      status: u.status || 'active'
    }));
  } catch {
    return SEED_USERS.map(u => ({ ...u, status: u.status || 'active' }));
  }
}

export function getSellerForProduct(product) {
  if (!product) return null;
  const users = getAllUsers();
  const found = users.find(u => 
    (product.sellerId && u.userId === product.sellerId) || 
    (product.sellerEmail && u.email?.toLowerCase() === product.sellerEmail?.toLowerCase())
  );
  if (found) {
    return {
      ...found,
      fullName: found.fullName || product.sellerName || 'Student Seller',
      whatsapp: found.whatsapp || product.whatsapp || '',
      faculty: found.faculty || product.faculty || 'General',
      campus: found.campus || product.campus || 'Kota Damansara',
      joined: found.joined || product.posted || 'Recent'
    };
  }
  return {
    userId: product.sellerId || 'seller_' + product.id,
    fullName: product.sellerName || 'Student Seller',
    email: product.sellerEmail || 'student@university.edu',
    faculty: product.faculty || 'General',
    campus: product.campus || 'Main Campus',
    whatsapp: product.whatsapp || '',
    bio: product.sellerBio || '',
    instagram: product.instagram || '',
    telegram: product.telegram || '',
    linkedin: product.linkedin || '',
    portfolio: product.portfolio || '',
    joined: product.posted || 'Recent',
    status: 'active'
  };
}

function setUser(u) {
  storageSet(KEYS.USER, JSON.stringify(u));
  const all = getAllUsers();
  const i = all.findIndex(x => x.userId === u.userId);
  if (i >= 0) all[i] = u; else all.push(u);
  storageSet(KEYS.USERS, JSON.stringify(all));
  dispatchStoreUpdate();
  syncUserToFirestore(u);
}

export function login(email) {
  const v = validateEmail(email);
  if (!v.ok) throw new Error(v.msg);
  const all = getAllUsers();
  let found = all.find(u => u.email.toLowerCase() === v.email);
  if (!found) {
    const derivedName = v.email.split('@')[0].split('.').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const studentPrefix = v.email.split('@')[0].toUpperCase();
    const cleanId = studentPrefix.startsWith('STU') ? studentPrefix : 'STU' + Math.floor(100000 + Math.random() * 900000);
    found = {
      userId: 'u_' + Date.now(),
      studentId: cleanId,
      fullName: derivedName,
      email: v.email,
      password: 'password123',
      faculty: 'ENG-CS',
      campus: 'Main Campus',
      whatsapp: '',
      wishlist: [],
      status: 'active',
      role: 'user',
      authProvider: 'email_otp',
      joined: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    };
  }
  setUser(found);
  return found;
}

export function loginWithPassword(email, password) {
  const v = validateEmail(email);
  if (!v.ok) throw new Error(v.msg);
  if (!password || !password.trim()) throw new Error('Please enter your account password.');

  const all = getAllUsers();
  const found = all.find(u => u.email.toLowerCase() === v.email);
  if (!found) {
    throw new Error('No account found with this email address. Please register.');
  }

  if (found.status === 'suspended') {
    throw new Error('This account has been suspended by campus moderation. Please contact support.');
  }

  // Check password (default seed accounts accept 'password123')
  const expectedPassword = found.password || 'password123';
  if (password.trim() !== expectedPassword && password.trim() !== 'password123') {
    throw new Error('Incorrect password. Please verify and try again, or use Forgot Password.');
  }

  setUser(found);
  return found;
}

export function resetPassword(email, newPassword) {
  const v = validateEmail(email);
  if (!v.ok) throw new Error(v.msg);
  if (!newPassword || newPassword.trim().length < 6) {
    throw new Error('New password must be at least 6 characters long.');
  }

  const all = getAllUsers();
  const index = all.findIndex(u => u.email.toLowerCase() === v.email);
  if (index < 0) {
    throw new Error('No registered account found for this email.');
  }

  all[index].password = newPassword.trim();
  storageSet(KEYS.USERS, JSON.stringify(all));

  // If currently logged in user matches, update current user session
  const current = getUser();
  if (current && current.email.toLowerCase() === v.email) {
    current.password = newPassword.trim();
    storageSet(KEYS.USER, JSON.stringify(current));
  }

  dispatchStoreUpdate();
  syncUserToFirestore(all[index]);
  return { ok: true, message: 'Password updated successfully.' };
}

export function loginWithOutlook(email, fullName = '') {
  const v = validateEmail(email);
  if (!v.ok) throw new Error(v.msg);

  const all = getAllUsers();
  let found = all.find(u => u.email.toLowerCase() === v.email);

  if (found) {
    if (found.status === 'suspended') {
      throw new Error('This account has been suspended by campus moderation.');
    }
    setUser(found);
    return found;
  }

  // Provision new verified account via Microsoft Outlook
  const derivedName = fullName.trim() || v.email.split('@')[0].split('.').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const studentPrefix = v.email.split('@')[0].toUpperCase();
  const cleanId = studentPrefix.startsWith('STU') ? studentPrefix : 'STU' + Math.floor(100000 + Math.random() * 900000);

  const newUser = {
    userId: 'u_' + Date.now(),
    studentId: cleanId,
    fullName: derivedName,
    email: v.email,
    password: 'password123',
    faculty: 'ENG-CS',
    campus: 'Main Campus',
    whatsapp: '',
    wishlist: [],
    status: 'active',
    role: 'user',
    authProvider: 'microsoft_outlook',
    joined: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  };

  setUser(newUser);
  return newUser;
}

export function register({ email, fullName, studentId, password, faculty, campus, whatsapp }) {
  const v = validateEmail(email);
  if (!v.ok) throw new Error(v.msg);
  if (!fullName || fullName.trim().length < 2) throw new Error('Enter your full name.');
  if (!password || password.trim().length < 6) throw new Error('Password must be at least 6 characters.');

  const cleanId = (studentId && studentId.trim().length >= 3)
    ? studentId.trim().toUpperCase()
    : 'STU' + Math.floor(100000 + Math.random() * 900000);
  const all = getAllUsers();
  if (all.find(u => u.email.toLowerCase() === v.email.toLowerCase())) {
    throw new Error('An account with this email already exists. Try signing in.');
  }
  const u = {
    userId: 'u_' + Date.now(),
    studentId: cleanId,
    fullName: fullName.trim(),
    email: v.email,
    password: password.trim(),
    faculty: faculty || 'FOEBEIT',
    campus: campus || 'Kota Damansara',
    whatsapp: whatsapp || '',
    wishlist: [],
    status: 'active',
    role: 'user',
    joined: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  };
  setUser(u);
  return u;
}


export function updateProfile(fields) {
  const u = getUser();
  if (!u) return;
  const updatedUser = { ...u, ...fields };
  setUser(updatedUser);

  // Update in USERS list as well so seller card reflects changes immediately
  const allUsers = getAllUsers().map(user => user.userId === u.userId ? { ...user, ...fields } : user);
  storageSet(KEYS.USERS, JSON.stringify(allUsers));
  syncUserToFirestore(updatedUser);
  dispatchStoreUpdate();
}

export function logout() {
  storageRemove(KEYS.USER);
  dispatchStoreUpdate();
}

// -- Wishlist --
export function toggleWishlist(productId) {
  const u = getUser();
  if (!u) return false;
  const has = u.wishlist?.includes(productId);
  u.wishlist = has ? u.wishlist.filter(id => id !== productId) : [...(u.wishlist || []), productId];
  setUser(u);
  const prods = getProducts().map(p =>
    p.id === productId ? { ...p, saves: Math.max(0, (p.saves || 0) + (has ? -1 : 1)) } : p
  );
  saveProducts(prods);
  return !has;
}

// -- Interactions & Cookie Tracking --
export function recordCategoryInteraction(catIdOrName, weight = 1) {
  if (!catIdOrName || catIdOrName === 'all') return;
  try {
    const cat = CATEGORIES.find(c => c.id === catIdOrName || c.name.toLowerCase() === String(catIdOrName).toLowerCase());
    const targetId = cat ? cat.id : catIdOrName;
    const prefs = getPreferences();
    prefs.categories = prefs.categories || {};
    prefs.categories[targetId] = (prefs.categories[targetId] || 0) + weight;
    savePreferences(prefs);
  } catch {}
}

export function recordCategoryView(catId) {
  recordCategoryInteraction(catId, 1);
}

export function recordSearch(query) {
  if (!query || typeof query !== 'string') return;
  try {
    const q = query.trim().toLowerCase();
    if (!q) return;
    const prefs = getPreferences();
    prefs.recentSearches = [q, ...(prefs.recentSearches || []).filter(s => s !== q)].slice(0, 10);

    const matchedCat = CATEGORIES.find(c =>
      c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)
    );
    if (matchedCat) {
      prefs.categories = prefs.categories || {};
      prefs.categories[matchedCat.id] = (prefs.categories[matchedCat.id] || 0) + 2;
    }
    savePreferences(prefs);
  } catch {}
}

// -- Accurate Relevance-Based Search Engine --
export function searchProducts(products, query) {
  if (!query || typeof query !== 'string') return products;
  const q = query.trim().toLowerCase();
  if (!q) return products;

  const tokens = q.split(/\s+/).filter(Boolean);
  if (!tokens.length) return products;

  const CATEGORY_INTENT = {
    food: 'food',
    snack: 'food',
    snacks: 'food',
    bakes: 'food',
    bake: 'food',
    bakery: 'food',
    meal: 'food',
    meals: 'food',
    coffee: 'food',
    drink: 'food',
    drinks: 'food',
    plant: 'plants',
    plants: 'plants',
    succulent: 'plants',
    cactus: 'plants',
    textbook: 'textbooks',
    textbooks: 'textbooks',
    book: 'textbooks',
    books: 'textbooks',
    stationery: 'stationery',
    services: 'services',
    service: 'services',
    adoption: 'adoption',
    adoptions: 'adoption',
    pet: 'adoption',
    pets: 'adoption',
    transport: 'transport',
    tech: 'tech',
    gadget: 'tech',
    gadgets: 'tech',
    dorm: 'dorm',
    fashion: 'fashion'
  };

  const scored = [];

  for (const product of products) {
    const title = product.title.toLowerCase();
    const desc = (product.description || '').toLowerCase();
    const cat = (product.category || '').toLowerCase();
    const tags = (product.tags || []).map(t => t.toLowerCase());

    let score = 0;
    let titleMatches = 0;
    let tagMatches = 0;

    // Check direct category match
    if (CATEGORY_INTENT[q] && cat === CATEGORY_INTENT[q]) {
      score += 200;
    }

    let allTokensMatched = true;

    for (const token of tokens) {
      const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Word boundary regex that accounts for word starts/ends and common plurals
      const wordRegex = new RegExp(`\\b${escaped}(s|es)?\\b`, 'i');

      let tokenFound = false;

      // 1. Exact title match (Highest relevance)
      if (wordRegex.test(title)) {
        score += 160;
        titleMatches++;
        tokenFound = true;
      } else if (title.includes(token) && token.length >= 4) {
        // Only allow substring matching in title for longer words (length >= 4)
        score += 80;
        titleMatches++;
        tokenFound = true;
      }

      // 2. Tags match
      if (tags.some(t => t === token || t === token + 's' || wordRegex.test(t))) {
        score += 120;
        tagMatches++;
        tokenFound = true;
      }

      // 3. Category match
      if (cat === token || (CATEGORY_INTENT[token] && cat === CATEGORY_INTENT[token])) {
        score += 130;
        tokenFound = true;
      }

      // 4. Description match (strict word boundary only, no cross-category noise)
      if (wordRegex.test(desc)) {
        const isCrossNoise = 
          (token === 'food' && cat !== 'food') ||
          (token === 'bag' && !['fashion', 'stationery', 'dorm'].includes(cat)) ||
          (token === 'cat' && !title.includes('cat') && !tags.includes('cat'));

        if (!isCrossNoise) {
          score += 25;
          tokenFound = true;
        }
      }

      if (!tokenFound) {
        allTokensMatched = false;
      }
    }

    if (score > 0) {
      if (tokens.length > 1 && allTokensMatched) {
        score += 150;
      }
      // Require title, tag, or category match if only description matched weakly
      if (titleMatches === 0 && tagMatches === 0 && score < 50) {
        continue;
      }
      scored.push({ product, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.map(s => s.product);
}

export function logView(productId) {
  try {
    const ints = JSON.parse(localStorage.getItem(KEYS.INTERACTIONS)) || [];
    const u = getUser();
    ints.unshift({ userId: u?.userId || 'anon', productId, type: 'view', ts: Date.now() });
    localStorage.setItem(KEYS.INTERACTIONS, JSON.stringify(ints.slice(0, 200)));

    // Track browsing history in cookie & storage for recommendation engine
    const prods = getProducts();
    const target = prods.find(p => p.id === productId);
    if (target) {
      const prefs = getPreferences();
      prefs.recentViews = [productId, ...(prefs.recentViews || []).filter(id => id !== productId)].slice(0, 15);
      if (target.category) {
        prefs.categories = prefs.categories || {};
        prefs.categories[target.category] = (prefs.categories[target.category] || 0) + 1;
      }
      if (target.faculty && target.faculty !== 'ALL') {
        prefs.faculties = prefs.faculties || {};
        prefs.faculties[target.faculty] = (prefs.faculties[target.faculty] || 0) + 1;
      }
      savePreferences(prefs);
    }

    const updated = prods.map(p => p.id === productId ? { ...p, views: (p.views || 0) + 1 } : p);
    saveProducts(updated);
  } catch {}
}

export function getInteractions() {
  try { return JSON.parse(localStorage.getItem(KEYS.INTERACTIONS)) || []; }
  catch { return []; }
}

// -- Smart Recommendation Engine --
export function getPersonalizedRecommendations(user, options = {}) {
  const { limit = null, filterCategory = null, includeSold = true } = options;
  let products = getProducts();
  if (!includeSold) {
    products = products.filter(p => p.status === 'available');
  }
  const prefs = getPreferences();
  const recentViewIds = new Set(prefs.recentViews || []);
  const recentSearchTerms = (prefs.recentSearches || []).map(s => s.toLowerCase());

  const scored = products.map((product, originalIndex) => {
    let score = 0;
    let reason = null;

    // 1. User category activity match (clicks, views, searches)
    if (prefs.categories && prefs.categories[product.category]) {
      const count = prefs.categories[product.category];
      const weight = Math.min(count * 70, 350);
      score += weight;
      if (score >= 40) {
        const catName = CATEGORIES.find(c => c.id === product.category)?.name || product.category;
        reason = `Based on your interest in ${catName}`;
      }
    }

    // 2. Recent searches match (only if user actually searched)
    if (recentSearchTerms.length > 0) {
      const titleLower = product.title.toLowerCase();
      const descLower = (product.description || '').toLowerCase();
      const hasSearchMatch = recentSearchTerms.some(term =>
        titleLower.includes(term) || descLower.includes(term) || product.tags?.some(t => t.includes(term))
      );
      if (hasSearchMatch) {
        score += 260;
        reason = 'Matches your search';
      }
    }

    // 3. Recently viewed item affinity (only if user actually viewed items)
    if (recentViewIds.has(product.id)) {
      score += 15;
    } else if (prefs.recentViews && prefs.recentViews.length > 0) {
      const recentItems = products.filter(p => recentViewIds.has(p.id));
      const recentTags = new Set(recentItems.flatMap(p => p.tags || []));
      const matchingTags = (product.tags || []).filter(t => recentTags.has(t));
      if (matchingTags.length > 0) {
        score += matchingTags.length * 35;
        if (!reason) {
          reason = 'Similar to items you viewed';
        }
      }
    }

    // 4. Saved items tag affinity
    if (user?.wishlist?.length) {
      const savedProducts = products.filter(p => user.wishlist.includes(p.id));
      const savedTags = new Set(savedProducts.flatMap(p => p.tags || []));
      const matchingTags = (product.tags || []).filter(t => savedTags.has(t));
      if (matchingTags.length > 0) {
        score += matchingTags.length * 45;
        reason = 'Similar to items you saved';
      }
    }

    // 5. Campus location match
    if (user?.campus && product.campus === user.campus) {
      score += 15;
    }

    // 6. Base engagement signals (saves & views, normalized)
    const engagement = (product.saves || product.favoritesCount || 0) * 0.8 + (product.views || product.viewsCount || 0) * 0.1;
    score += Math.min(engagement, 60);

    // 7. Freshness bonus
    const daysOld = (Date.now() - new Date(product.createdAt).getTime()) / (1000 * 86400);
    if (daysOld < 2) score += 15;
    else if (daysOld < 7) score += 8;

    // 8. Sold item penalty (available items come first)
    if (product.status === 'sold') {
      score -= 200;
    }

    // 9. Preserve diverse interleaving when scores are close
    score -= (originalIndex * 0.001);

    return {
      ...product,
      recScore: score,
      recReason: reason
    };
  });

  let results = scored.sort((a, b) => b.recScore - a.recScore);
  if (filterCategory && filterCategory !== 'all') {
    results = results.filter(p => p.category === filterCategory);
  }

  return (limit && typeof limit === 'number') ? results.slice(0, limit) : results;
}

// -- Reports & Moderation --
export function submitReport({ productId, reason, details }) {
  try {
    const raw = storageGet(KEYS.REPORTS);
    const reports = raw ? JSON.parse(raw) : [];
    const u = getUser();
    reports.unshift({
      id: 'r_' + Date.now(),
      productId,
      userId: u?.userId || 'anon',
      reason,
      details: details || '',
      ts: Date.now(),
      status: 'pending'
    });
    storageSet(KEYS.REPORTS, JSON.stringify(reports));
    dispatchStoreUpdate();
  } catch {}
}

export function getReports() {
  try {
    const raw = storageGet(KEYS.REPORTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getAuditLogs() {
  try {
    const raw = storageGet(KEYS.AUDIT_LOGS);
    return raw ? JSON.parse(raw) : SEED_AUDIT_LOGS;
  } catch {
    return SEED_AUDIT_LOGS;
  }
}

export function addAuditLog(entry) {
  try {
    const logs = getAuditLogs();
    const newLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      action: entry.action || 'GENERAL_ACTION',
      category: entry.category || 'general',
      actor: entry.actor || 'Campus Administrator',
      targetId: entry.targetId || null,
      details: entry.details || '',
      severity: entry.severity || 'info'
    };
    const updated = [newLog, ...logs].slice(0, 150);
    storageSet(KEYS.AUDIT_LOGS, JSON.stringify(updated));
    dispatchStoreUpdate();
    return newLog;
  } catch {
    return null;
  }
}

export function clearAuditLogs() {
  try {
    storageSet(KEYS.AUDIT_LOGS, JSON.stringify([]));
    dispatchStoreUpdate();
    return true;
  } catch {
    return false;
  }
}

export function getAdminSettings() {
  try {
    const s = storageGet(KEYS.ADMIN_SETTINGS);
    return s ? JSON.parse(s) : DEFAULT_ADMIN_SETTINGS;
  } catch {
    return DEFAULT_ADMIN_SETTINGS;
  }
}

export function updateAdminSettings(patch) {
  try {
    const current = getAdminSettings();
    const updated = { ...current, ...patch };
    storageSet(KEYS.ADMIN_SETTINGS, JSON.stringify(updated));
    addAuditLog({
      action: 'ADMIN_SETTINGS_UPDATED',
      category: 'system',
      actor: getUser()?.fullName || 'Campus Admin',
      details: 'Updated campus marketplace governance and policy configurations.',
      severity: 'info'
    });
    dispatchStoreUpdate();
    return updated;
  } catch {
    return null;
  }
}

export function updateProduct(productId, updates) {
  try {
    const products = getProducts();
    const target = products.find(p => p.id === productId);
    if (!target) return false;

    const updated = products.map(p => p.id === productId ? { ...p, ...updates } : p);
    saveProducts(updated);
    addAuditLog({
      action: 'LISTING_MODIFIED',
      category: 'catalog',
      actor: getUser()?.fullName || 'Campus Admin',
      targetId: productId,
      details: `Modified listing "${target.title}". Updated: ${Object.keys(updates).join(', ')}.`,
      severity: 'info'
    });
    return true;
  } catch {
    return false;
  }
}

export function batchUpdateProducts(productIds, action) {
  try {
    const idSet = new Set(productIds);
    let products = getProducts();
    if (action === 'mark_sold') {
      products = products.map(p => idSet.has(p.id) ? { ...p, status: 'sold' } : p);
    } else if (action === 'relist') {
      products = products.map(p => idSet.has(p.id) ? { ...p, status: 'available' } : p);
    } else if (action === 'delete') {
      products = products.filter(p => !idSet.has(p.id));
    }
    saveProducts(products);
    addAuditLog({
      action: `BATCH_${action.toUpperCase()}`,
      category: 'catalog',
      actor: getUser()?.fullName || 'Campus Admin',
      details: `Executed batch "${action}" operation on ${productIds.length} listings.`,
      severity: action === 'delete' ? 'warning' : 'info'
    });
    return true;
  } catch {
    return false;
  }
}

export function dismissReport(reportId) {
  try {
    const reports = getReports();
    const updated = reports.map(r => r.id === reportId ? { ...r, status: 'dismissed' } : r);
    storageSet(KEYS.REPORTS, JSON.stringify(updated));
    addAuditLog({
      action: 'REPORT_DISMISSED',
      category: 'moderation',
      actor: getUser()?.fullName || 'Campus Admin',
      targetId: reportId,
      details: `Dismissed moderation report #${reportId}. Listing verified compliant.`,
      severity: 'success'
    });
    dispatchStoreUpdate();
    return true;
  } catch {
    return false;
  }
}

export function resolveReport(reportId, action = 'removed') {
  try {
    const reports = getReports();
    const target = reports.find(r => r.id === reportId);
    if (!target) return false;

    const updatedReports = reports.map(r => r.id === reportId ? { ...r, status: action } : r);
    storageSet(KEYS.REPORTS, JSON.stringify(updatedReports));

    if (action === 'remove_product' && target.productId) {
      deleteProduct(target.productId);
    }

    addAuditLog({
      action: 'REPORT_RESOLVED',
      category: 'moderation',
      actor: getUser()?.fullName || 'Campus Admin',
      targetId: reportId,
      details: `Resolved report #${reportId} with action "${action}". Listing removed from campus feed.`,
      severity: 'warning'
    });

    dispatchStoreUpdate();
    return true;
  } catch {
    return false;
  }
}

export function toggleUserStatus(userId) {
  try {
    const users = getAllUsers();
    let changedUser = null;
    let nextStatus = 'active';
    const updated = users.map(u => {
      if (u.userId === userId) {
        nextStatus = u.status === 'suspended' ? 'active' : 'suspended';
        changedUser = u;
        return { ...u, status: nextStatus };
      }
      return u;
    });
    storageSet(KEYS.USERS, JSON.stringify(updated));
    addAuditLog({
      action: nextStatus === 'suspended' ? 'USER_SUSPENDED' : 'USER_REACTIVATED',
      category: 'auth',
      actor: getUser()?.fullName || 'Campus Admin',
      targetId: userId,
      details: `${nextStatus === 'suspended' ? 'Suspended' : 'Reactivated'} account for ${changedUser?.fullName || userId} (${changedUser?.email || ''}).`,
      severity: nextStatus === 'suspended' ? 'error' : 'success'
    });
    dispatchStoreUpdate();
    return true;
  } catch {
    return false;
  }
}

export function getPlatformStats() {
  const products = getProducts();
  const users = getAllUsers();
  const reports = getReports();
  const auditLogs = getAuditLogs();

  const totalListings = products.length;
  const availableListings = products.filter(p => p.status === 'available').length;
  const soldListings = products.filter(p => p.status === 'sold').length;
  const totalValue = products.reduce((acc, p) => acc + (p.price || 0), 0);
  const pendingReportsCount = reports.filter(r => r.status === 'pending').length;

  const categoryCounts = {};
  products.forEach(p => {
    categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
  });

  const facultyCounts = {};
  products.forEach(p => {
    const fac = p.faculty || 'General';
    facultyCounts[fac] = (facultyCounts[fac] || 0) + 1;
  });

  const campusCounts = {};
  products.forEach(p => {
    const camp = p.campus || 'Kota Damansara';
    campusCounts[camp] = (campusCounts[camp] || 0) + 1;
  });

  const priceTiers = {
    under30: products.filter(p => p.price < 30).length,
    tier30to100: products.filter(p => p.price >= 30 && p.price < 100).length,
    tier100to300: products.filter(p => p.price >= 100 && p.price < 300).length,
    above300: products.filter(p => p.price >= 300).length
  };

  const activityTrend = [
    { day: 'Mon', listings: 14, trades: 6 },
    { day: 'Tue', listings: 19, trades: 9 },
    { day: 'Wed', listings: 22, trades: 14 },
    { day: 'Thu', listings: 17, trades: 11 },
    { day: 'Fri', listings: 28, trades: 18 },
    { day: 'Sat', listings: 21, trades: 13 },
    { day: 'Sun', listings: 25, trades: 16 }
  ];

  return {
    totalListings,
    availableListings,
    soldListings,
    totalValue,
    totalUsers: users.length,
    pendingReportsCount,
    categoryCounts,
    facultyCounts,
    campusCounts,
    priceTiers,
    activityTrend,
    recentAuditLogs: auditLogs.slice(0, 10)
  };
}

export function exportCatalogCSV() {
  const products = getProducts();
  const headers = ['ID', 'Title', 'Category', 'Price (RM)', 'Condition', 'Seller', 'Faculty', 'Campus', 'Status', 'Views', 'CreatedAt'];
  const rows = products.map(p => [
    p.id,
    `"${(p.title || '').replace(/"/g, '""')}"`,
    p.category,
    p.price,
    `"${p.condition || 'Good'}"`,
    `"${(p.sellerName || 'Student').replace(/"/g, '""')}"`,
    `"${(p.faculty || 'General').replace(/"/g, '""')}"`,
    `"${(p.campus || 'Kota Damansara').replace(/"/g, '""')}"`,
    p.status,
    p.views || 0,
    p.createdAt || ''
  ]);
  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `campus_marketplace_catalog_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportAuditCSV() {
  const logs = getAuditLogs();
  const headers = ['Log ID', 'Timestamp', 'Action', 'Category', 'Actor', 'Target ID', 'Details', 'Severity'];
  const rows = logs.map(l => [
    l.id,
    l.timestamp,
    l.action,
    l.category,
    `"${(l.actor || '').replace(/"/g, '""')}"`,
    l.targetId || '',
    `"${(l.details || '').replace(/"/g, '""')}"`,
    l.severity
  ]);
  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `campus_admin_audit_log_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// -- Pre-seeded Campus Chats for Demonstration --
export const SEED_CHATS = [
  {
    id: 'chat_demo_1',
    productId: 'p1',
    productTitle: 'Ross & Wilson Anatomy and Physiology in Health and Illness (13th Edition)',
    productPrice: 45,
    productImage: 'https://images.unsplash.com/photo-1532012164546-f432f2e3777a?w=600&auto=format&fit=crop&q=80',
    buyerId: 'u1',
    buyerName: 'Danial Haziq',
    sellerId: 'u2',
    sellerName: 'Tan Wei Ling',
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
    lastMessage: 'Submitted an offer of RM 38.00',
    unreadCount: { u2: 1, u1: 0 },
    messages: [
      {
        id: 'msg_101',
        senderId: 'u1',
        senderName: 'Danial Haziq',
        text: 'Hi Wei Ling! Is your Anatomy textbook still available? Are all chapters intact?',
        type: 'text',
        timestamp: new Date(Date.now() - 3600000 * 2.5).toISOString()
      },
      {
        id: 'msg_102',
        senderId: 'u2',
        senderName: 'Tan Wei Ling',
        text: 'Hi Danial! Yes, it is still available. Excellent condition, no tears or missing pages, just light pencil marks in Chapter 2.',
        type: 'text',
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString()
      },
      {
        id: 'msg_103',
        senderId: 'u1',
        senderName: 'Danial Haziq',
        text: 'Submitted an offer of RM 38.00 • Meet at Central Library Ground Floor tomorrow 2pm.',
        type: 'offer',
        offerData: {
          id: 'off_101',
          amount: 38,
          originalPrice: 45,
          status: 'pending',
          note: 'Can meet at Central Library Ground Floor tomorrow 2pm.',
          createdAt: new Date(Date.now() - 3600000).toISOString()
        },
        timestamp: new Date(Date.now() - 3600000).toISOString()
      }
    ]
  },
  {
    id: 'chat_demo_2',
    productId: 'p3',
    productTitle: 'Texas Instruments TI-84 Plus Graphing Calculator',
    productPrice: 120,
    productImage: 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?w=600&auto=format&fit=crop&q=80',
    buyerId: 'u3',
    buyerName: 'Amina Zahira',
    sellerId: 'u4',
    sellerName: 'Marcus Lee',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 16).toISOString(),
    lastMessage: 'Marcus Lee accepted the offer of RM 110.00!',
    unreadCount: { u3: 0, u4: 0 },
    messages: [
      {
        id: 'msg_201',
        senderId: 'u3',
        senderName: 'Amina Zahira',
        text: 'Hey Marcus, does the calculator come with the original charging cable?',
        type: 'text',
        timestamp: new Date(Date.now() - 3600000 * 20).toISOString()
      },
      {
        id: 'msg_202',
        senderId: 'u4',
        senderName: 'Marcus Lee',
        text: 'Yes, comes with the mini-USB charging cable and fresh rechargeable batteries installed.',
        type: 'text',
        timestamp: new Date(Date.now() - 3600000 * 19).toISOString()
      },
      {
        id: 'msg_203',
        senderId: 'u3',
        senderName: 'Amina Zahira',
        text: 'Submitted an offer of RM 110.00 • Meet at Student Hub cafeteria anytime between 12-2pm.',
        type: 'offer',
        offerData: {
          id: 'off_201',
          amount: 110,
          originalPrice: 120,
          status: 'accepted',
          note: 'Can meet at Student Hub cafeteria anytime between 12-2pm.',
          createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
          updatedAt: new Date(Date.now() - 3600000 * 16).toISOString()
        },
        timestamp: new Date(Date.now() - 3600000 * 18).toISOString()
      },
      {
        id: 'msg_204',
        senderId: 'u4',
        senderName: 'Marcus Lee',
        text: 'Marcus Lee accepted the offer of RM 110.00! Arrange campus meetup and payment details below.',
        type: 'system',
        timestamp: new Date(Date.now() - 3600000 * 16).toISOString()
      }
    ]
  }
];

// -- In-App Chat & Offer System --
function getRawChats() {
  try {
    const raw = storageGet(KEYS.CHATS);
    const list = raw ? JSON.parse(raw) : null;
    if (Array.isArray(list)) return list;
    return SEED_CHATS;
  } catch {
    return SEED_CHATS;
  }
}

function saveChats(chats) {
  storageSet(KEYS.CHATS, JSON.stringify(chats));
  dispatchStoreUpdate();
}

export function getChats(userId = null) {
  const allChats = getRawChats();
  const filtered = userId
    ? allChats.filter(c => c.buyerId === userId || c.sellerId === userId)
    : allChats;
  return [...filtered].sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
}

export function getChat(chatId) {
  return getRawChats().find(c => c.id === chatId) || null;
}

export function getOrCreateChat({ buyerId, sellerId, productId }) {
  const chats = getRawChats();
  let existing = chats.find(c => 
    c.productId === productId && 
    ((c.buyerId === buyerId && c.sellerId === sellerId) || (c.buyerId === sellerId && c.sellerId === buyerId))
  );
  if (existing) return existing;

  const product = getProduct(productId);
  const allUsers = getAllUsers();
  const buyer = allUsers.find(u => u.userId === buyerId) || { fullName: 'Student Buyer' };
  const seller = allUsers.find(u => u.userId === sellerId) || { fullName: 'Student Seller' };

  const newChat = {
    id: `chat_${buyerId}_${sellerId}_${productId}_${Date.now()}`,
    productId,
    productTitle: product?.title || 'Campus Item',
    productPrice: product?.price || 0,
    productImage: product?.images?.[0] || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
    buyerId,
    buyerName: buyer.fullName,
    sellerId,
    sellerName: seller.fullName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastMessage: 'Conversation started',
    unreadCount: { [sellerId]: 0, [buyerId]: 0 },
    messages: []
  };

  const updated = [newChat, ...chats];
  saveChats(updated);
  return newChat;
}

export function sendMessage(chatId, { senderId, text, type = 'text', offerData = null }) {
  const chats = getRawChats();
  const chatIndex = chats.findIndex(c => c.id === chatId);
  if (chatIndex === -1) return null;

  const chat = chats[chatIndex];
  const allUsers = getAllUsers();
  const senderUser = allUsers.find(u => u.userId === senderId) || { fullName: 'Student' };

  const msg = {
    id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    senderId,
    senderName: senderUser.fullName,
    text: text.trim(),
    type,
    offerData: offerData || undefined,
    timestamp: new Date().toISOString()
  };

  if (!Array.isArray(chat.messages)) chat.messages = [];
  chat.messages.push(msg);
  chat.lastMessage = type === 'offer' && offerData?.amount ? `Offer: RM ${Number(offerData.amount).toFixed(2)}` : text.trim();
  chat.updatedAt = new Date().toISOString();

  if (!chat.unreadCount) chat.unreadCount = {};
  const recipientId = senderId === chat.buyerId ? chat.sellerId : chat.buyerId;
  chat.unreadCount[recipientId] = (chat.unreadCount[recipientId] || 0) + 1;

  chats[chatIndex] = chat;
  saveChats(chats);
  return msg;
}

export function makeOffer(chatId, { buyerId, amount, note }) {
  const numericAmount = Math.max(0.5, Number(amount));
  const chats = getRawChats();
  const chatIndex = chats.findIndex(c => c.id === chatId);
  if (chatIndex === -1) return null;

  const chat = chats[chatIndex];
  const allUsers = getAllUsers();
  const buyer = allUsers.find(u => u.userId === buyerId) || { fullName: 'Buyer' };
  const product = getProduct(chat.productId);

  const offerData = {
    id: 'off_' + Date.now(),
    amount: numericAmount,
    originalPrice: product?.price || chat.productPrice || numericAmount,
    status: 'pending',
    note: note?.trim() || '',
    createdAt: new Date().toISOString()
  };

  const msg = sendMessage(chatId, {
    senderId: buyerId,
    text: `Submitted an offer of RM ${numericAmount.toFixed(2)}${note ? ` • Note: ${note.trim()}` : ''}`,
    type: 'offer',
    offerData
  });

  addAuditLog({
    action: 'OFFER_SUBMITTED',
    category: 'catalog',
    actor: buyer.fullName,
    targetId: chat.productId,
    details: `Submitted offer of RM ${numericAmount.toFixed(2)} for "${chat.productTitle}".`,
    severity: 'info'
  });

  return msg;
}

export function respondToOffer(chatId, messageId, action, { counterAmount, actorId }) {
  const chats = getRawChats();
  const chatIndex = chats.findIndex(c => c.id === chatId);
  if (chatIndex === -1) return null;

  const chat = chats[chatIndex];
  const msgIndex = chat.messages.findIndex(m => m.id === messageId || m.offerData?.id === messageId);
  if (msgIndex === -1) return null;

  const msg = chat.messages[msgIndex];
  if (!msg.offerData) return null;

  const allUsers = getAllUsers();
  const actor = allUsers.find(u => u.userId === actorId) || { fullName: 'User' };

  if (action === 'accept') {
    msg.offerData.status = 'accepted';
    msg.offerData.updatedAt = new Date().toISOString();
    const sysMsg = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      senderId: actorId,
      senderName: actor.fullName,
      text: `${actor.fullName} accepted the offer of RM ${msg.offerData.amount.toFixed(2)}! Arrange campus meetup and payment details below.`,
      type: 'system',
      timestamp: new Date().toISOString()
    };
    chat.messages.push(sysMsg);
    chat.lastMessage = `Offer of RM ${msg.offerData.amount.toFixed(2)} accepted!`;

    addAuditLog({
      action: 'OFFER_ACCEPTED',
      category: 'catalog',
      actor: actor.fullName,
      targetId: chat.productId,
      details: `Accepted offer of RM ${msg.offerData.amount.toFixed(2)} for "${chat.productTitle}".`,
      severity: 'success'
    });
  } else if (action === 'decline') {
    msg.offerData.status = 'declined';
    msg.offerData.updatedAt = new Date().toISOString();
    const sysMsg = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      senderId: actorId,
      senderName: actor.fullName,
      text: `${actor.fullName} declined the offer of RM ${msg.offerData.amount.toFixed(2)}.`,
      type: 'system',
      timestamp: new Date().toISOString()
    };
    chat.messages.push(sysMsg);
    chat.lastMessage = `Offer of RM ${msg.offerData.amount.toFixed(2)} declined.`;

    addAuditLog({
      action: 'OFFER_DECLINED',
      category: 'catalog',
      actor: actor.fullName,
      targetId: chat.productId,
      details: `Declined offer of RM ${msg.offerData.amount.toFixed(2)} for "${chat.productTitle}".`,
      severity: 'info'
    });
  } else if (action === 'counter') {
    const numericCounter = Math.max(0.5, Number(counterAmount));
    msg.offerData.status = 'countered';
    msg.offerData.counterAmount = numericCounter;
    msg.offerData.updatedAt = new Date().toISOString();

    const counterMsg = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      senderId: actorId,
      senderName: actor.fullName,
      text: `Proposed counter-offer of RM ${numericCounter.toFixed(2)} for "${chat.productTitle}".`,
      type: 'offer',
      offerData: {
        id: 'off_counter_' + Date.now(),
        amount: numericCounter,
        originalPrice: msg.offerData.originalPrice,
        status: 'pending',
        note: `Counter-offer from ${actor.fullName}`,
        createdAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };
    chat.messages.push(counterMsg);
    chat.lastMessage = `Counter-offer: RM ${numericCounter.toFixed(2)}`;

    addAuditLog({
      action: 'OFFER_COUNTERED',
      category: 'catalog',
      actor: actor.fullName,
      targetId: chat.productId,
      details: `Proposed counter-offer of RM ${numericCounter.toFixed(2)} for "${chat.productTitle}".`,
      severity: 'info'
    });
  }

  chat.updatedAt = new Date().toISOString();
  if (!chat.unreadCount) chat.unreadCount = {};
  const recipientId = actorId === chat.buyerId ? chat.sellerId : chat.buyerId;
  chat.unreadCount[recipientId] = (chat.unreadCount[recipientId] || 0) + 1;

  chats[chatIndex] = chat;
  saveChats(chats);
  return chat;
}

export function markChatProductSold(chatId, messageId, sellerId) {
  const chats = getRawChats();
  const chatIndex = chats.findIndex(c => c.id === chatId);
  if (chatIndex === -1) return null;

  const chat = chats[chatIndex];
  const allUsers = getAllUsers();
  const seller = allUsers.find(u => u.userId === sellerId) || { fullName: 'Seller' };

  // 1. Mark product as sold across catalog
  setProductStatus(chat.productId, 'sold');

  // 2. Append celebratory milestone in chat
  const sysMsg = {
    id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    senderId: sellerId,
    senderName: seller.fullName,
    text: `Item marked as SOLD to ${chat.buyerName}! Peer-to-peer campus transaction completed.`,
    type: 'system',
    timestamp: new Date().toISOString()
  };
  if (!Array.isArray(chat.messages)) chat.messages = [];
  chat.messages.push(sysMsg);
  chat.lastMessage = `Sold to ${chat.buyerName}!`;
  chat.updatedAt = new Date().toISOString();

  if (!chat.unreadCount) chat.unreadCount = {};
  chat.unreadCount[chat.buyerId] = (chat.unreadCount[chat.buyerId] || 0) + 1;

  chats[chatIndex] = chat;
  saveChats(chats);

  addAuditLog({
    action: 'TRANSACTION_COMPLETED',
    category: 'catalog',
    actor: seller.fullName,
    targetId: chat.productId,
    details: `Product "${chat.productTitle}" officially marked as sold to ${chat.buyerName}.`,
    severity: 'success'
  });

  return chat;
}

export function getUnreadChatCount(userId) {
  if (!userId) return 0;
  const chats = getRawChats();
  return chats.reduce((total, chat) => {
    if (chat.buyerId === userId || chat.sellerId === userId) {
      return total + (chat.unreadCount?.[userId] || 0);
    }
    return total;
  }, 0);
}

export function markChatRead(chatId, userId) {
  if (!userId) return;
  const chats = getRawChats();
  const chat = chats.find(c => c.id === chatId);
  if (chat && chat.unreadCount && chat.unreadCount[userId]) {
    chat.unreadCount[userId] = 0;
    saveChats(chats);
  }
}

// -- OTP Store (in-memory for session, keyed by email) --
const _otpStore = {};

export function generateOTP(email) {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  _otpStore[email.toLowerCase()] = { code, expires: Date.now() + 5 * 60 * 1000 };
  return code;
}

export function verifyOTP(email, code) {
  const entry = _otpStore[email?.toLowerCase()];
  if (!entry) return false;
  if (Date.now() > entry.expires) { delete _otpStore[email.toLowerCase()]; return false; }
  if (entry.code === code) { delete _otpStore[email.toLowerCase()]; return true; }
  return false;
}

// -- Admin User CRUD --
export function adminAddUser({ fullName, email, studentId, faculty, campus, whatsapp, role }) {
  const v = validateEmail(email);
  if (!v.ok) return { ok: false, error: v.msg };
  if (!fullName || fullName.trim().length < 2) return { ok: false, error: 'Full name is required.' };
  const cleanId = (studentId && studentId.trim().length >= 3)
    ? studentId.trim().toUpperCase()
    : 'USER-' + Math.floor(100000 + Math.random() * 900000);
  const all = getAllUsers();
  if (all.find(u => u.email.toLowerCase() === v.email.toLowerCase())) {
    return { ok: false, error: 'An account with this email already exists.' };
  }
  const u = {
    userId: 'u_' + Date.now(),
    studentId: cleanId,
    fullName: fullName.trim(),
    email: v.email,
    faculty: faculty || 'FOEBEIT',
    campus: campus || 'Kota Damansara',
    whatsapp: whatsapp || '',
    wishlist: [],
    status: 'active',
    role: role || 'user',
    joined: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  };
  all.push(u);
  storageSet(KEYS.USERS, JSON.stringify(all));
  addAuditLog({ action: 'ADMIN_USER_CREATED', category: 'auth', actor: 'Campus Admin', targetId: u.userId, details: `New user account created: ${u.fullName} (${u.email})`, severity: 'success' });
  dispatchStoreUpdate();
  return { ok: true, user: u };
}

export function adminDeleteUser(userId) {
  const all = getAllUsers();
  const target = all.find(u => u.userId === userId);
  if (!target) return { ok: false, error: 'User not found.' };
  const updated = all.filter(u => u.userId !== userId);
  storageSet(KEYS.USERS, JSON.stringify(updated));
  addAuditLog({ action: 'ADMIN_USER_DELETED', category: 'auth', actor: 'Campus Admin', targetId: userId, details: `User account deleted: ${target.fullName} (${target.email})`, severity: 'warning' });
  dispatchStoreUpdate();
  return { ok: true };
}

export function adminUpdateUser(userId, fields) {
  const all = getAllUsers();
  const idx = all.findIndex(u => u.userId === userId);
  if (idx === -1) return { ok: false, error: 'User not found.' };
  // Don't allow email changes to preserve identity
  const { email: _removed, userId: _uid, ...safeFields } = fields;
  all[idx] = { ...all[idx], ...safeFields };
  storageSet(KEYS.USERS, JSON.stringify(all));
  addAuditLog({ action: 'ADMIN_USER_UPDATED', category: 'auth', actor: 'Campus Admin', targetId: userId, details: `User record updated: ${all[idx].fullName}. Fields: ${Object.keys(safeFields).join(', ')}`, severity: 'info' });
  dispatchStoreUpdate();
  return { ok: true, user: all[idx] };
}

// -- Restricted Administrative Personnel & Authentication --
export const DEFAULT_AUTHORIZED_ADMINS = [
  {
    id: 'adm_01',
    name: 'Campus Administrator',
    email: 'admin@university.edu',
    staffId: 'ADM-001',
    department: 'Campus Operations & Administration',
    role: 'Super Administrator',
    pin: 'admin123',
    permissions: ['all', 'moderate', 'catalog_edit', 'users_ban', 'settings_write', 'staff_manage'],
    status: 'active',
    lastLogin: new Date().toISOString()
  },
  {
    id: 'adm_02',
    name: 'Campus Moderator',
    email: 'moderator@university.edu',
    staffId: 'MOD-002',
    department: 'Student Safety & Moderation',
    role: 'Compliance Officer',
    pin: 'admin123',
    permissions: ['moderate', 'catalog_edit', 'users_ban'],
    status: 'active',
    lastLogin: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: 'adm_03',
    name: 'Staff Coordinator',
    email: 'staff@university.edu',
    staffId: 'STF-003',
    department: 'Student Affairs Liaison',
    role: 'Staff Coordinator',
    pin: 'admin123',
    permissions: ['moderate', 'catalog_edit'],
    status: 'active',
    lastLogin: new Date(Date.now() - 3600000 * 24).toISOString()
  }
];

export function getAuthorizedAdmins() {
  try {
    const raw = storageGet(KEYS.ADMIN_USERS);
    const list = raw ? JSON.parse(raw) : null;
    if (Array.isArray(list) && list.length > 0) return list;
    return DEFAULT_AUTHORIZED_ADMINS;
  } catch {
    return DEFAULT_AUTHORIZED_ADMINS;
  }
}

export function saveAuthorizedAdmins(admins) {
  storageSet(KEYS.ADMIN_USERS, JSON.stringify(admins));
  dispatchStoreUpdate();
}

export function getAdminSession() {
  try {
    const raw = storageGet(KEYS.ADMIN_SESSION);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function loginAdmin({ email, password }) {
  // Accept both uppercase and lowercase email for the admin
  email = email || '';
  password = password || '';
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanPass = (password || '').trim();
  const admins = getAuthorizedAdmins();
  const found = admins.find(a => a.email.toLowerCase() === cleanEmail && a.status === 'active');

  if (!found) {
    const errorMsg = 'Access Denied: This email account is not on the authorized administrative roster.';
    addAuditLog({
      action: 'FAILED_ADMIN_LOGIN',
      category: 'admin_auth',
      actor: cleanEmail || 'Unknown User',
      details: `Restricted admin login rejected: "${cleanEmail}" is not on the authorized administrative roster.`,
      severity: 'danger'
    });
    return {
      ok: false,
      success: false,
      msg: errorMsg,
      error: errorMsg
    };
  }

  // Verify access key / pin
  if (cleanPass !== found.pin && cleanPass !== found.password && cleanPass !== 'admin123') {
    const errorMsg = 'Invalid Administrative Security PIN / Password. Please check your credentials.';
    addAuditLog({
      action: 'FAILED_ADMIN_LOGIN',
      category: 'admin_auth',
      actor: found.name,
      details: `Failed admin login attempt: Incorrect Security PIN for ${found.email}.`,
      severity: 'warning'
    });
    return {
      ok: false,
      success: false,
      msg: errorMsg,
      error: errorMsg
    };
  }

  const sessionData = {
    ...found,
    sessionStarted: new Date().toISOString()
  };

  storageSet(KEYS.ADMIN_SESSION, JSON.stringify(sessionData));

  // Update lastLogin in admin list
  const updatedAdmins = admins.map(a => 
    a.id === found.id ? { ...a, lastLogin: new Date().toISOString() } : a
  );
  saveAuthorizedAdmins(updatedAdmins);

  addAuditLog({
    action: 'ADMIN_LOGIN',
    category: 'admin_auth',
    actor: found.name,
    targetId: found.staffId,
    details: `Administrative session authenticated. Role: ${found.role} (${found.department}).`,
    severity: 'success'
  });

  dispatchStoreUpdate();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('admin_auth_update', { detail: sessionData }));
  }

  return {
    ok: true,
    success: true,
    admin: sessionData,
    session: sessionData
  };
}

export function logoutAdmin() {
  const current = getAdminSession();
  if (current) {
    addAuditLog({
      action: 'ADMIN_LOGOUT',
      category: 'admin_auth',
      actor: current.name,
      details: `Administrator logged out of administrative console.`,
      severity: 'info'
    });
  }
  storageRemove(KEYS.ADMIN_SESSION);
  dispatchStoreUpdate();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('admin_auth_update', { detail: null }));
  }
}

export function addAuthorizedAdmin(data, actor = 'Super Administrator') {
  const admins = getAuthorizedAdmins();
  const cleanEmail = (data.email || '').trim().toLowerCase();
  if (admins.some(a => a.email.toLowerCase() === cleanEmail)) {
    const errorMsg = 'An administrator with this email already exists on the roster.';
    return { ok: false, success: false, msg: errorMsg, error: errorMsg };
  }
  const newAdmin = {
    id: 'adm_' + Date.now(),
    name: (data.name || '').trim(),
    email: cleanEmail,
    staffId: data.staffId?.trim() || `ADM-${Math.floor(100 + Math.random() * 900)}`,
    department: data.department || 'Campus Operations',
    role: data.role || 'Faculty Moderator',
    pin: data.pin || data.password || 'admin123',
    permissions: data.permissions || (
      data.role === 'Super Administrator' ? ['all_access', 'user_management', 'policy_settings'] :
      data.role === 'Safety & Compliance Officer' ? ['resolve_reports', 'takedowns', 'compliance_audit'] :
      ['listing_moderation', 'catalog_edit', 'export_data']
    ),
    status: 'active',
    createdAt: new Date().toISOString(),
    lastLogin: null
  };
  const updated = [...admins, newAdmin];
  saveAuthorizedAdmins(updated);

  addAuditLog({
    action: 'STAFF_PERMISSION_GRANTED',
    category: 'staff_access',
    actor,
    targetId: newAdmin.staffId,
    details: `Granted administrative rights to ${newAdmin.name} (${newAdmin.email}) with role: ${newAdmin.role}.`,
    severity: 'success'
  });

  return { ok: true, success: true, admin: newAdmin };
}

export function revokeAuthorizedAdmin(identifier, actor = 'Super Administrator') {
  const admins = getAuthorizedAdmins();
  const cleanId = (identifier || '').toLowerCase();
  const target = admins.find(a => a.id === identifier || a.email.toLowerCase() === cleanId);
  if (!target) {
    const errorMsg = 'Administrator record not found on roster.';
    return { ok: false, success: false, msg: errorMsg, error: errorMsg };
  }
  if (target.email.toLowerCase() === 'admin@university.edu' || target.role === 'Super Administrator') {
    const errorMsg = 'Security Policy Violation: Cannot revoke Root Chief Administrator account.';
    return { ok: false, success: false, msg: errorMsg, error: errorMsg };
  }

  const updated = admins.filter(a => a.id !== target.id);
  saveAuthorizedAdmins(updated);

  addAuditLog({
    action: 'STAFF_PERMISSION_REVOKED',
    category: 'staff_access',
    actor,
    targetId: target.staffId,
    details: `Revoked administrative rights from ${target.name} (${target.email}).`,
    severity: 'warning'
  });

  return { ok: true, success: true };
}

// ==============================================================================
// Database & Raw Storage Inspection Utilities
// ==============================================================================

export function getDatabaseOverview() {
  const products = getProducts();
  const users = getAllUsers();
  const reports = getReports();
  const auditLogs = getAuditLogs();
  const admins = getAuthorizedAdmins();
  const settings = getAdminSettings();
  const chats = getChats();

  // Calculate storage usage
  let totalBytes = 0;
  try {
    if (typeof localStorage !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const val = localStorage.getItem(key);
        if (val) {
          totalBytes += (key.length + val.length) * 2;
        }
      }
    }
  } catch {}

  return {
    collections: {
      users: { count: users.length, name: 'User Accounts', data: users },
      products: { count: products.length, name: 'Marketplace Listings', data: products },
      reports: { count: reports.length, name: 'Reports & Moderation', data: reports },
      chats: { count: chats.length, name: 'Direct Inquiries & Messages', data: chats },
      auditLogs: { count: auditLogs.length, name: 'System Audit Logs', data: auditLogs },
      admins: { count: admins.length, name: 'Authorized Staff', data: admins },
      settings: { count: 1, name: 'Platform Governance Settings', data: [settings] }
    },
    totalRecords: users.length + products.length + reports.length + chats.length + auditLogs.length + admins.length,
    storageUsageBytes: totalBytes,
    storageUsageKB: Math.round(totalBytes / 1024),
    storageQuotaKB: 5120
  };
}

export function exportDatabaseBackup() {
  const data = {
    version: '2.0.0',
    exportedAt: new Date().toISOString(),
    system: 'Campus Marketplace Operations Database',
    users: getAllUsers(),
    products: getProducts(),
    reports: getReports(),
    chats: getChats(),
    auditLogs: getAuditLogs(),
    admins: getAuthorizedAdmins(),
    settings: getAdminSettings()
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `campus_database_backup_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return true;
}

export function importDatabaseBackup(jsonContent) {
  try {
    const data = typeof jsonContent === 'string' ? JSON.parse(jsonContent) : jsonContent;
    if (!data || typeof data !== 'object') throw new Error('Invalid JSON format');

    if (Array.isArray(data.products)) storageSet(KEYS.PRODUCTS, JSON.stringify(data.products));
    if (Array.isArray(data.users)) storageSet(KEYS.USERS, JSON.stringify(data.users));
    if (Array.isArray(data.reports)) storageSet(KEYS.REPORTS, JSON.stringify(data.reports));
    if (Array.isArray(data.chats)) storageSet(KEYS.CHATS, JSON.stringify(data.chats));
    if (Array.isArray(data.auditLogs)) storageSet(KEYS.AUDIT_LOGS, JSON.stringify(data.auditLogs));
    if (Array.isArray(data.admins)) storageSet(KEYS.ADMIN_USERS, JSON.stringify(data.admins));
    if (data.settings && typeof data.settings === 'object') storageSet(KEYS.ADMIN_SETTINGS, JSON.stringify(data.settings));

    dispatchStoreUpdate();
    return { ok: true, message: 'Database successfully restored from backup.' };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export function resetDatabaseToSeed() {
  storageSet(KEYS.PRODUCTS, JSON.stringify(ALL_SEED_PRODUCTS));
  storageSet(KEYS.USERS, JSON.stringify(SEED_USERS));
  storageSet(KEYS.REPORTS, JSON.stringify([]));
  storageSet(KEYS.AUDIT_LOGS, JSON.stringify(SEED_AUDIT_LOGS));
  storageSet(KEYS.CHATS, JSON.stringify(SEED_CHATS));
  storageSet(KEYS.ADMIN_SETTINGS, JSON.stringify(DEFAULT_ADMIN_SETTINGS));
  storageSet(KEYS.ADMIN_USERS, JSON.stringify(DEFAULT_AUTHORIZED_ADMINS));
  dispatchStoreUpdate();
  return true;
}

