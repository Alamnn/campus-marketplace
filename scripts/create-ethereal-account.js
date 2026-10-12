import nodemailer from 'nodemailer';

async function setupEthereal() {
  console.log('Creating free instant test SMTP account via Ethereal...');
  try {
    const testAccount = await nodemailer.createTestAccount();
    console.log('\n✅ Created instant free SMTP account:');
    console.log('--------------------------------------------------');
    console.log(`SMTP_HOST=${testAccount.smtp.host}`);
    console.log(`SMTP_PORT=${testAccount.smtp.port}`);
    console.log(`SMTP_SECURE=${testAccount.smtp.secure}`);
    console.log(`SMTP_USER=${testAccount.user}`);
    console.log(`SMTP_PASS=${testAccount.pass}`);
    console.log('--------------------------------------------------');
    console.log('\nPreview sent emails anytime at: https://ethereal.email/messages');
  } catch (err) {
    console.error('Failed to create Ethereal account:', err.message);
  }
}

setupEthereal();
