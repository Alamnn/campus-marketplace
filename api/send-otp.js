// Vercel Serverless Function: /api/send-otp
import crypto from 'crypto';
import nodemailer from 'nodemailer';

const globalOtpStore = global._campusOtpStore || (global._campusOtpStore = new Map());
const OTP_SECRET = process.env.OTP_SECRET || 'campus-marketplace-otp-secret-dev';

export default async function handler(req, res) {
  // Set CORS headers
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
    const { email } = req.body || {};
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@') || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ success: false, message: 'A valid email address is required.' });
    }

    // Optional domain filter (configured via ALLOWED_DOMAINS env var)
    const allowedDomainsEnv = process.env.ALLOWED_DOMAINS || '';
    if (allowedDomainsEnv.trim()) {
      const allowedDomains = allowedDomainsEnv.split(',').map(d => d.trim().toLowerCase()).filter(Boolean);
      const isDomainAllowed = allowedDomains.some(d => cleanEmail.endsWith(d));
      if (!isDomainAllowed) {
        return res.status(400).json({
          success: false,
          message: `Registration is restricted to authorized campus domains (${allowedDomains.join(', ')}).`
        });
      }
    }

    // Generate secure 6-digit OTP
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

    // 1. Generate cryptographic HMAC token (stateless serverless verification)
    const payload = `${cleanEmail}:${code}:${expires}`;
    const signature = crypto.createHmac('sha256', OTP_SECRET).update(payload).digest('hex');
    const verificationToken = `${expires}.${signature}`;

    // 2. Persist in Firestore if configured
    const firebaseProjectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
    if (firebaseProjectId) {
      try {
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${firebaseProjectId}/databases/(default)/documents/otps/${encodeURIComponent(cleanEmail)}`;
        await fetch(firestoreUrl, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              code: { stringValue: code },
              expires: { integerValue: String(expires) },
              createdAt: { integerValue: String(Date.now()) }
            }
          })
        });
      } catch (e) {
        console.warn('[Firestore] Failed to store OTP record:', e.message);
      }
    }

    // 3. Keep in-memory store for local single-instance fallback
    globalOtpStore.set(cleanEmail, {
      code,
      expires
    });

    let delivered = false;
    let deliveryError = null;

    const emailHtml = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:500px;margin:0 auto;padding:24px;background:#f8fafc;color:#1e293b;border-radius:12px;">
        <div style="background:#ffffff;padding:32px;border-radius:12px;border:1px solid #e2e8f0;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
          <div style="text-align:center;margin-bottom:24px;">
            <h2 style="margin:0;color:#0D2C6C;font-size:22px;font-weight:800;letter-spacing:-0.5px;">Campus Marketplace</h2>
            <p style="margin:4px 0 0;color:#64748B;font-size:13px;">Peer-to-Peer Student Commerce</p>
          </div>
          <p style="font-size:15px;line-height:1.5;color:#334155;margin-bottom:16px;">Hello,</p>
          <p style="font-size:14px;line-height:1.6;color:#475569;margin-bottom:24px;">
            Use the following 6-digit verification code to complete your campus account login or registration:
          </p>
          <div style="background:#f0f7ff;border:1px dashed #2563eb;border-radius:10px;padding:20px;text-align:center;margin-bottom:24px;">
            <div style="font-size:34px;font-weight:800;letter-spacing:8px;color:#1e40af;font-family:monospace;">${code}</div>
            <div style="font-size:12px;color:#64748b;margin-top:8px;">Valid for 10 minutes</div>
          </div>
          <p style="font-size:13px;line-height:1.5;color:#64748b;margin:0 0 16px;">
            If you did not request this verification code, please ignore this email. Never share your security code with anyone.
          </p>
          <div style="border-top:1px solid #f1f5f9;margin-top:24px;padding-top:16px;text-align:center;font-size:12px;color:#94a3b8;">
            Campus Marketplace • Open-Source Student Commerce
          </div>
        </div>
      </div>
    `;

    // Strategy 1: Dedicated SMTP Relay (Gmail, Brevo, AWS SES, or University Mail)
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || (smtpUser ? `Campus Marketplace <${smtpUser}>` : '');

    if (smtpHost && smtpUser && smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass
          },
          tls: {
            rejectUnauthorized: false
          }
        });

        const info = await transporter.sendMail({
          from: smtpFrom,
          to: cleanEmail,
          subject: `Your Campus Marketplace Verification Code: ${code}`,
          text: `Your verification code is: ${code}. This code is valid for 10 minutes.`,
          html: emailHtml
        });

        if (info && info.messageId) {
          delivered = true;
          console.log('[SMTP Mailer] Successfully delivered OTP email to', cleanEmail, info.messageId);
        }
      } catch (smtpErr) {
        deliveryError = smtpErr.message;
        console.warn('[SMTP Warning]', smtpErr.message);
      }
    }

    // Strategy 2: Resend API (Transactional Email Gateway)
    const resendApiKey = process.env.RESEND_API_KEY;
    const resendFrom = process.env.RESEND_FROM || 'Campus Marketplace <onboarding@resend.dev>';

    if (!delivered && resendApiKey) {
      try {
        const resp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey.trim()}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: resendFrom,
            to: [cleanEmail],
            subject: `Your Campus Marketplace Verification Code: ${code}`,
            text: `Your verification code is: ${code}. This code is valid for 10 minutes.`,
            html: emailHtml
          })
        });

        const rData = await resp.json();
        if (resp.ok) {
          delivered = true;
          console.log('[Resend Mailer] Successfully dispatched OTP to', cleanEmail, rData.id);
        } else {
          deliveryError = rData.message || 'Resend delivery rejected';
        }
      } catch (err) {
        deliveryError = err.message;
      }
    }

    // Development / Sandbox Fallback: If no mail provider configured, print code to console
    if (!delivered && (!smtpUser || !smtpPass) && !resendApiKey) {
      console.log(`\n=========================================\n[LOCAL DEV OTP SANDBOX]\nVerification Code for ${cleanEmail}: ${code}\nValid for 10 minutes\n=========================================\n`);
      delivered = true;
    }

    if (delivered) {
      return res.status(200).json({
        success: true,
        delivered: true,
        verificationToken,
        message: `Verification code sent to ${cleanEmail}. Please check your inbox (or terminal console in dev mode).`
      });
    }

    return res.status(400).json({
      success: false,
      delivered: false,
      deliveryError: deliveryError || 'Email delivery configuration not active.',
      message: `Unable to dispatch verification code: ${deliveryError || 'Delivery unavailable'}. You can sign in directly using your password.`
    });

  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
}
