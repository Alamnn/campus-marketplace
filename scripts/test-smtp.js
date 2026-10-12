import nodemailer from 'nodemailer';

const {
  SMTP_HOST = 'smtp.gmail.com',
  SMTP_PORT = '465',
  SMTP_SECURE = 'true',
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM
} = process.env;

const recipient = process.argv[2] || SMTP_USER;

console.log('Testing SMTP connection with:');
console.log({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE === 'true' || SMTP_PORT === '465',
  user: SMTP_USER,
  from: SMTP_FROM || SMTP_USER,
  to: recipient
});

if (!SMTP_USER || !SMTP_PASS) {
  console.error('\n❌ Error: SMTP_USER and SMTP_PASS are not yet set in .env');
  console.log('   Add your credentials in .env, then rerun this test script.');
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: parseInt(SMTP_PORT, 10),
  secure: SMTP_SECURE === 'true' || SMTP_PORT === '465',
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

async function main() {
  try {
    console.log('Verifying SMTP transporter connection...');
    await transporter.verify();
    console.log('✅ SMTP connection successful!');

    if (!recipient) {
      console.log('No recipient provided. Verification complete.');
      return;
    }

    console.log(`Sending test email to ${recipient}...`);
    const info = await transporter.sendMail({
      from: SMTP_FROM || `"Campus Marketplace" <${SMTP_USER}>`,
      to: recipient,
      subject: 'Campus Marketplace - Verification Test',
      text: 'Congratulations! Your SMTP email server is working perfectly and ready to send real verification codes.',
      html: `
        <div style="font-family: sans-serif; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; max-width: 500px; margin: 0 auto;">
          <h2 style="color: #0D2C6C; margin-top: 0;">Campus Marketplace</h2>
          <p style="font-size: 15px; color: #334155;">Your SMTP email configuration is active and working!</p>
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; padding: 12px 16px; border-radius: 8px; font-weight: 600;">
            ✓ Verification delivery confirmed
          </div>
          <p style="font-size: 13px; color: #64748b; margin-top: 16px;">
            Real verification codes will now arrive directly in your inbox.
          </p>
        </div>
      `
    });
    console.log('✅ Test email sent successfully! Message ID:', info.messageId);
  } catch (err) {
    console.error('❌ SMTP Error:', err.message);
    process.exit(1);
  }
}

main();
