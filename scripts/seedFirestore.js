import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, writeBatch } from 'firebase/firestore';
import { ALL_SEED_PRODUCTS } from '../src/data/extendedSeedData.js';
import { SEED_USERS, SEED_ACTIVITIES } from '../src/data/seedData.js';

const firebaseConfig = {
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
  apiKey: process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID
};

if (!firebaseConfig.projectId || !firebaseConfig.apiKey) {
  console.error('❌ Error: Firebase environment variables are required to run this migration.');
  console.log('   Please set VITE_FIREBASE_PROJECT_ID and VITE_FIREBASE_API_KEY in your environment or .env file.');
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seed() {
  console.log('🚀 Starting Cloud Firestore Database Migration for Campus Marketplace...');

  // 1. Seed Users
  console.log(`👤 Migrating ${SEED_USERS.length} users to Firestore...`);
  for (const u of SEED_USERS) {
    await setDoc(doc(db, 'users', u.userId), u, { merge: true });
  }
  console.log('✅ Users migrated successfully.');

  // 2. Seed Activities
  console.log(`📅 Migrating ${SEED_ACTIVITIES.length} campus activities...`);
  for (const a of SEED_ACTIVITIES) {
    await setDoc(doc(db, 'activities', a.id), a, { merge: true });
  }
  console.log('✅ Activities migrated successfully.');

  // 3. Seed Products in batches of 25
  console.log(`📦 Migrating ${ALL_SEED_PRODUCTS.length} campus marketplace listings...`);
  const chunkSize = 25;
  for (let i = 0; i < ALL_SEED_PRODUCTS.length; i += chunkSize) {
    const chunk = ALL_SEED_PRODUCTS.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    for (const p of chunk) {
      batch.set(doc(db, 'products', p.id), p, { merge: true });
    }
    await batch.commit();
    console.log(`   Migrated ${Math.min(i + chunkSize, ALL_SEED_PRODUCTS.length)} / ${ALL_SEED_PRODUCTS.length} listings...`);
  }
  console.log('✅ All listings migrated to Firestore successfully.');

  // 4. Seed Settings
  console.log('⚙️ Migrating admin settings...');
  await setDoc(doc(db, 'adminSettings', 'default'), {
    maintenanceMode: false,
    requireStudentVerification: true,
    allowGuestBrowsing: true,
    autoFlagBannedKeywords: true,
    bannedKeywords: ['leak', 'exam answers', 'vape', 'tobacco', 'weapon', 'gambling', 'cheat sheet', 'counterfeit'],
    allowedDomains: ['@university.edu', '@campus.edu', '@student.edu'],
    maxListingsPerStudent: 25,
    updatedAt: new Date().toISOString()
  }, { merge: true });
  console.log('✅ Admin settings migrated successfully.');

  console.log('\n🎉 Cloud Firestore Migration Complete! Database is fully populated.');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
