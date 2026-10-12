import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query 
} from 'firebase/firestore';
import { db } from './firebase.js';

/**
 * Cloud Firestore Database Operations
 */

export async function fetchFirestoreProducts() {
  if (!db) return null;
  try {
    const snap = await getDocs(collection(db, 'products'));
    const items = [];
    snap.forEach(d => items.push({ id: d.id, ...d.data() }));
    return items;
  } catch (err) {
    console.warn('[Firestore] Failed to fetch products, falling back to local cache:', err.message);
    return null;
  }
}

export async function fetchFirestoreUsers() {
  if (!db) return null;
  try {
    const snap = await getDocs(collection(db, 'users'));
    const users = [];
    snap.forEach(d => users.push({ userId: d.id, ...d.data() }));
    return users;
  } catch (err) {
    console.warn('[Firestore] Failed to fetch users, falling back to local cache:', err.message);
    return null;
  }
}

export async function syncProductToFirestore(product) {
  if (!db) return;
  try {
    await setDoc(doc(db, 'products', product.id), product, { merge: true });
  } catch (err) {
    console.error('[Firestore] Error saving product to Firestore:', err.message);
  }
}

export async function deleteProductFromFirestore(productId) {
  if (!db) return;
  try {
    await deleteDoc(doc(db, 'products', productId));
  } catch (err) {
    console.error('[Firestore] Error deleting product from Firestore:', err.message);
  }
}

export async function syncUserToFirestore(user) {
  if (!db) return;
  try {
    await setDoc(doc(db, 'users', user.userId), user, { merge: true });
  } catch (err) {
    console.error('[Firestore] Error saving user to Firestore:', err.message);
  }
}

export async function syncActivityToFirestore(activity) {
  if (!db) return;
  try {
    await setDoc(doc(db, 'activities', activity.id), activity, { merge: true });
  } catch (err) {
    console.error('[Firestore] Error saving activity to Firestore:', err.message);
  }
}

export async function syncAdminSettingsToFirestore(settings) {
  if (!db) return;
  try {
    await setDoc(doc(db, 'adminSettings', 'default'), settings, { merge: true });
  } catch (err) {
    console.error('[Firestore] Error saving admin settings to Firestore:', err.message);
  }
}
