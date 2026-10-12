import nodemailer from 'nodemailer';

const {
  RESEND_API_KEY,
  RESEND_FROM = 'Campus Marketplace <onboarding@resend.dev>',
  SMTP_HOST = 'smtp.resend.com',
  SMTP_PORT = '465',
  SMTP_SECURE = 'true',
  SMTP_USER = 'resend',
  SMTP_PASS
} = process.env;

const recipient = process.argv[2];

if (!recipient) {
  console.log('Usage: node --env-file=.env scripts/test-resend.js <recipient-email>');
  process.exit(1);
}

async function testWithResendAPI() {
  console.log(`\n🚀 Testing via direct Resend REST API...`);
  console.log(`   To: ${recipient}`);
  console.log(`   From: ${RESEND_FROM}`);

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY.trim()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: [recipient],
      subject: 'Campus Marketplace - Verification Delivery Test',
      html: `
        <div style="font-family: sans-serif; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; max-width: 500px; margin: 0 auto;">
          <h2 style="color: #0D2C6C; margin-top: 0;">Campus Marketplace</h2>
          <p style="font-size: 15px; color: #334155;">Your Resend email delivery is working perfectly!</p>
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; padding: 12px 16px; border-radius: 8px; font-weight: 600;">
            ✓ Real verification code delivery confirmed
          </div>
          <p style="font-size: 13px; color: #64748b; margin-top: 16px;">
            Your users will now receive 6-digit verification codes in their inbox.
          </p>
        </div>
      `
    })
  });

  const data = await res.json();
  if (res.ok) {
    console.log('✅ Email successfully dispatched via Resend! ID:', data.id);
  } else {
    console.error('❌ Resend API Error:', data);
  }
}

async function testWithResendSMTP() {
  console.log(`\n📬 Testing via Resend SMTP (${SMTP_HOST}:${SMTP_PORT})...`);
  const apiKey = SMTP_PASS || RESEND_API_KEY;

  if (!apiKey) {
    console.error('❌ Missing Resend API key in RESEND_API_KEY or SMTP_PASS');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT, 10),
    secure: SMTP_SECURE === 'true' || SMTP_PORT === '465',
    auth: {
      user: SMTP_USER,
      pass: apiKey
    }
  });

  try {
    await transporter.verify();
    console.log('✅ Resend SMTP connection verified.');

    const info = await transporter.sendMail({
      from: RESEND_FROM,
      to: recipient,
      subject: 'Campus Marketplace - SMTP Delivery Test',
      text: 'Resend SMTP test successful! Your campus marketplace can now send real verification codes.',
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #0D2C6C;">Campus Marketplace</h2>
          <p>Resend SMTP connection is verified and functioning.</p>
        </div>
      `
    });
    console.log('✅ Email sent via Resend SMTP! Message ID:', info.messageId);
  } catch (err) {
    console.error('❌ Resend SMTP Error:', err.message);
  }
}

async function run() {
  if (RESEND_API_KEY) {
    await testWithResendAPI();
  } else if (SMTP_PASS) {
    await testWithResendSMTP();
  } else {
    console.error('❌ Neither RESEND_API_KEY nor SMTP_PASS is configured in .env');
    console.log('   Add RESEND_API_KEY=re_... in .env');
  }
}

run();
