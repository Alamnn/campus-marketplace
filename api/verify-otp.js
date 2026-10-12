// Vercel Serverless Function: /api/verify-otp
import crypto from 'crypto';

const globalOtpStore = global._campusOtpStore || (global._campusOtpStore = new Map());
const OTP_SECRET = process.env.OTP_SECRET || 'campus-marketplace-otp-secret-dev';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { email, code, token, verificationToken } = req.body || {};
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanCode = (code || '').trim();
    const passedToken = (token || verificationToken || '').trim();

    if (!cleanEmail || !cleanCode) {
      return res.status(400).json({ success: false, valid: false, message: 'Email and verification code are required.' });
    }

    const firebaseProjectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
    const firestoreUrl = firebaseProjectId
      ? `https://firestore.googleapis.com/v1/projects/${firebaseProjectId}/databases/(default)/documents/otps/${encodeURIComponent(cleanEmail)}`
      : null;

    // Helper: cleanup persistence once verified
    const cleanupOtp = async () => {
      globalOtpStore.delete(cleanEmail);
      if (firestoreUrl) {
        try {
          await fetch(firestoreUrl, { method: 'DELETE' });
        } catch {}
      }
    };

    // 1. Cryptographic HMAC Token Verification (Stateless & Serverless immune)
    if (passedToken && passedToken.includes('.')) {
      try {
        const [expiresStr, signature] = passedToken.split('.');
        const expires = parseInt(expiresStr, 10);

        if (expires && !isNaN(expires)) {
          if (Date.now() > expires) {
            await cleanupOtp();
            return res.status(200).json({
              success: false,
              valid: false,
              message: 'Verification code has expired. Please request a new code.'
            });
          }

          const payload = `${cleanEmail}:${cleanCode}:${expires}`;
          const expectedSig = crypto.createHmac('sha256', OTP_SECRET).update(payload).digest('hex');

          const sigBuf = Buffer.from(signature, 'hex');
          const expBuf = Buffer.from(expectedSig, 'hex');

          if (sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf)) {
            await cleanupOtp();
            return res.status(200).json({ success: true, valid: true });
          }
        }
      } catch (err) {
        console.warn('[VerifyOTP] Token validation error:', err.message);
      }
    }

    // 2. Cloud Firestore Verification (Optional shared database persistence)
    if (firestoreUrl) {
      try {
        const fsRes = await fetch(firestoreUrl);
        if (fsRes.ok) {
          const fsDoc = await fsRes.json();
          const storedCode = fsDoc.fields?.code?.stringValue;
          const storedExpires = parseInt(fsDoc.fields?.expires?.integerValue, 10);

          if (storedExpires && Date.now() > storedExpires) {
            await cleanupOtp();
            return res.status(200).json({
              success: false,
              valid: false,
              message: 'Verification code has expired. Please request a new code.'
            });
          }

          if (storedCode && storedCode === cleanCode) {
            await cleanupOtp();
            return res.status(200).json({ success: true, valid: true });
          }
        }
      } catch (fsErr) {
        console.warn('[VerifyOTP] Firestore read fallback warning:', fsErr.message);
      }
    }

    // 3. In-Memory Store Verification (Local single-instance fallback)
    const memEntry = globalOtpStore.get(cleanEmail);
    if (memEntry) {
      if (Date.now() > memEntry.expires) {
        globalOtpStore.delete(cleanEmail);
        return res.status(200).json({
          success: false,
          valid: false,
          message: 'Verification code has expired. Please request a new code.'
        });
      }

      if (memEntry.code === cleanCode) {
        await cleanupOtp();
        return res.status(200).json({ success: true, valid: true });
      }
    }

    // If none matched
    return res.status(200).json({
      success: false,
      valid: false,
      message: 'Incorrect or expired verification code. Please check your inbox and try again.'
    });

  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
}
