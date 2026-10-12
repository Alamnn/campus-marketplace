import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import crypto from 'crypto'
import nodemailer from 'nodemailer'

const otpMemoryStore = new Map();
const OTP_SECRET = process.env.OTP_SECRET || 'campus-marketplace-otp-secret-dev';

function emailOtpPlugin() {
  return {
    name: 'email-otp-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        // Handle Send OTP endpoint
        if (req.url === '/api/send-otp' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            try {
              const data = JSON.parse(body || '{}');
              const email = (data.email || '').trim().toLowerCase();
              if (!email || !email.includes('@') || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: 'A valid email address is required.' }));
                return;
              }

              const env = loadEnv('development', process.cwd(), '');

              // Optional domain filter
              const allowedDomainsEnv = env.ALLOWED_DOMAINS || '';
              if (allowedDomainsEnv.trim()) {
                const allowed = allowedDomainsEnv.split(',').map(d => d.trim().toLowerCase()).filter(Boolean);
                const isPermitted = allowed.some(d => email.endsWith(d));
                if (!isPermitted) {
                  res.writeHead(400, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ 
                    success: false, 
                    message: `Registration is restricted to authorized campus domains (${allowed.join(', ')}).` 
                  }));
                  return;
                }
              }

              // Generate 6-digit numeric OTP
              const code = String(Math.floor(100000 + Math.random() * 900000));
              const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

              // Cryptographic HMAC token for stateless verification
              const payload = `${email}:${code}:${expires}`;
              const signature = crypto.createHmac('sha256', OTP_SECRET).update(payload).digest('hex');
              const verificationToken = `${expires}.${signature}`;

              otpMemoryStore.set(email, {
                code,
                expires,
                verificationToken
              });

              // Check Email Configuration
              const smtpHost = env.SMTP_HOST;
              const smtpPort = parseInt(env.SMTP_PORT || '465', 10);
              const smtpUser = env.SMTP_USER;
              const smtpPass = env.SMTP_PASS;
              const smtpFrom = env.SMTP_FROM || (smtpUser ? `Campus Marketplace <${smtpUser}>` : '');

              let delivered = false;
              let deliveryError = null;

              const emailSubject = `Your Campus Marketplace Verification Code: ${code}`;
              const emailText = `Your Campus Marketplace verification code is: ${code}. This code is valid for 10 minutes.`;
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

              // Strategy 1: Dedicated SMTP Relay
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
                    to: email,
                    subject: emailSubject,
                    text: emailText,
                    html: emailHtml
                  });

                  if (info && info.messageId) {
                    delivered = true;
                    console.log(`[SMTP Mailer] Successfully delivered code to ${email} (${info.messageId})`);
                  }
                } catch (err) {
                  deliveryError = err.message;
                  console.error(`[SMTP Mailer] Delivery error:`, err.message);
                }
              }

              // Strategy 2: Resend API (Fallback if configured)
              const resendApiKey = env.RESEND_API_KEY;
              const resendFrom = env.RESEND_FROM || 'Campus Marketplace <onboarding@resend.dev>';
              if (!delivered && resendApiKey) {
                try {
                  const resendResp = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${resendApiKey.trim()}`,
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                      from: resendFrom,
                      to: [email],
                      subject: emailSubject,
                      text: emailText,
                      html: emailHtml
                    })
                  });

                  const resendData = await resendResp.json();
                  if (resendResp.ok) {
                    delivered = true;
                    console.log(`[Resend Mailer] Verification code sent to ${email} (ID: ${resendData.id})`);
                  } else {
                    deliveryError = resendData.message || 'Resend API rejected';
                  }
                } catch (err) {
                  deliveryError = err.message;
                }
              }

              // Local Dev Sandbox: If no credentials configured, log OTP to terminal console
              if (!delivered && (!smtpUser || !smtpPass) && !resendApiKey) {
                console.log(`\n=========================================\n[LOCAL DEV OTP SANDBOX]\nVerification Code for ${email}: ${code}\nValid for 10 minutes\n=========================================\n`);
                delivered = true;
              }

              const isOk = delivered;
              res.writeHead(isOk ? 200 : 400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: isOk,
                delivered,
                verificationToken: isOk ? verificationToken : undefined,
                deliveryError: isOk ? null : (deliveryError || 'Unable to deliver verification code to this address.'),
                message: delivered
                  ? `Verification code sent to ${email}. Please check your inbox (or terminal console in dev mode).`
                  : `Unable to dispatch verification code: ${deliveryError || 'Delivery rejected'}.`
              }));

            } catch (err) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, message: 'Server error: ' + err.message }));
            }
          });
          return;
        }

        // Handle Verify OTP endpoint
        if (req.url === '/api/verify-otp' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const { email, code, token, verificationToken } = JSON.parse(body || '{}');
              const cleanEmail = (email || '').trim().toLowerCase();
              const cleanCode = (code || '').trim();
              const passedToken = (token || verificationToken || '').trim();

              if (!cleanEmail || !cleanCode) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, valid: false, message: 'Email and verification code are required.' }));
                return;
              }

              // 1. Cryptographic HMAC Token Verification
              if (passedToken && passedToken.includes('.')) {
                try {
                  const [expiresStr, signature] = passedToken.split('.');
                  const expires = parseInt(expiresStr, 10);
                  if (expires && !isNaN(expires)) {
                    if (Date.now() > expires) {
                      otpMemoryStore.delete(cleanEmail);
                      res.writeHead(200, { 'Content-Type': 'application/json' });
                      res.end(JSON.stringify({ success: false, valid: false, message: 'Verification code has expired. Please request a new code.' }));
                      return;
                    }
                    const payload = `${cleanEmail}:${cleanCode}:${expires}`;
                    const expectedSig = crypto.createHmac('sha256', OTP_SECRET).update(payload).digest('hex');
                    const sigBuf = Buffer.from(signature, 'hex');
                    const expBuf = Buffer.from(expectedSig, 'hex');
                    if (sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf)) {
                      otpMemoryStore.delete(cleanEmail);
                      res.writeHead(200, { 'Content-Type': 'application/json' });
                      res.end(JSON.stringify({ success: true, valid: true }));
                      return;
                    }
                  }
                } catch (err) {
                  console.warn('[Vite VerifyOTP] HMAC Token validation error:', err.message);
                }
              }

              // 2. In-Memory Store Verification Fallback
              const entry = otpMemoryStore.get(cleanEmail);
              if (!entry) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, valid: false, message: 'No verification code found. Please request a new one.' }));
                return;
              }
              if (Date.now() > entry.expires) {
                otpMemoryStore.delete(cleanEmail);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, valid: false, message: 'Verification code has expired. Please request a new one.' }));
                return;
              }
              if (entry.code === cleanCode) {
                otpMemoryStore.delete(cleanEmail);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, valid: true }));
                return;
              }
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, valid: false, message: 'Incorrect verification code. Please check and try again.' }));
            } catch (err) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, message: 'Server error: ' + err.message }));
            }
          });
          return;
        }

        next();
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    emailOtpPlugin()
  ],
})
