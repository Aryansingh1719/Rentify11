import { Resend } from 'resend';

// Resend client is created once and reused for all requests.
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const APP_NAME = process.env.APP_NAME || 'Rentify';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.BASE_URL || 'http://localhost:3000';
// For development without a verified domain, use Resend's testing sender.
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendWithRetry({ kind, from, to, subject, html, retries = 2, delayMs = 1000 }) {
  const totalStart = Date.now();
  let lastErr = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    const start = Date.now();
    try {
      console.log(`[email.${kind}] attempt ${attempt} -> to=${to} from=${from}`);
      const result = await resend.emails.send({ from, to, subject, html });
      console.log(`[email.${kind}] resend response`, result);
      console.log(`[email.${kind}] messageId`, result?.data?.id || null);
      console.log(`[email.${kind}] sent (attempt ${attempt}) in ${Date.now() - start}ms`);
      console.log(`[email.${kind}] total ${Date.now() - totalStart}ms`);
      return result;
    } catch (err) {
      lastErr = err;
      console.error(`[email.${kind}] failed (attempt ${attempt}) in ${Date.now() - start}ms`, err);
      if (attempt < retries) {
        await sleep(delayMs * attempt);
      }
    }
  }

  throw lastErr;
}

function getEmailTemplate(type, data) {
  const styles = `
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .card { background: #fff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .logo { font-size: 24px; font-weight: 800; color: #000; margin-bottom: 24px; }
    .logo span { color: #059669; }
    .otp { font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #059669; background: #ecfdf5; padding: 16px 24px; border-radius: 12px; display: inline-block; margin: 24px 0; }
    .expiry { color: #6b7280; font-size: 14px; margin-top: 8px; }
    .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 24px 0; border-radius: 0 8px 8px 0; font-size: 13px; color: #92400e; }
    .btn { display: inline-block; background: #000; color: #fff; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: 600; margin-top: 16px; }
    .footer { color: #9ca3af; font-size: 12px; margin-top: 32px; }
  `;

  switch (type) {
    case 'verification':
      return `
        <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${styles}</style></head>
        <body><div class="container"><div class="card">
          <div class="logo">${APP_NAME}</div>
          <h1 style="margin:0 0 8px; font-size:22px;">Verify your email</h1>
          <p style="color:#6b7280; margin:0;">Enter this code to complete your registration:</p>
          <div class="otp">${data.otp}</div>
          <p class="expiry">Expires in ${data.expiryMinutes || 7} minutes</p>
          <div class="warning">Never share this code with anyone. ${APP_NAME} will never ask for it.</div>
          <p class="footer">If you didn't create an account, you can safely ignore this email.</p>
        </div></div></body></html>
      `;
    case 'login-otp':
      return `
        <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${styles}</style></head>
        <body><div class="container"><div class="card">
          <div class="logo">${APP_NAME}</div>
          <h1 style="margin:0 0 8px; font-size:22px;">Your login code</h1>
          <p style="color:#6b7280; margin:0;">Use this code to sign in:</p>
          <div class="otp">${data.otp}</div>
          <p class="expiry">Expires in 5 minutes</p>
          <div class="warning">If you didn't request this code, secure your account immediately.</div>
          <p class="footer">If you didn't try to log in, change your password right away.</p>
        </div></div></body></html>
      `;
    case 'reset-password':
      return `
        <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${styles}</style></head>
        <body><div class="container"><div class="card">
          <div class="logo">${APP_NAME}</div>
          <h1 style="margin:0 0 8px; font-size:22px;">Reset your password</h1>
          <p style="color:#6b7280; margin:0;">Click the button below to set a new password:</p>
          <a href="${data.resetUrl}" class="btn">Reset Password</a>
          <p class="expiry" style="margin-top:16px;">This link expires in 10 minutes.</p>
          <div class="warning">If you didn't request a password reset, ignore this email. Your password will remain unchanged.</div>
          <p class="footer">If the button doesn't work, copy and paste: ${data.resetUrl}</p>
        </div></div></body></html>
      `;
    default:
      return '';
  }
}

export async function sendVerificationEmail(email, otp, expiryMinutes = 7) {
  const kind = 'verification';
  try {
    if (!resend || !process.env.RESEND_API_KEY || !FROM_EMAIL) {
      console.warn(`[email.${kind}] Resend not configured. Skipping email.`, { to: email });
      return;
    }

    const from = `"${APP_NAME}" <${FROM_EMAIL}>`;
    const subject = `Verify your email - ${APP_NAME}`;
    const html = getEmailTemplate('verification', { otp, expiryMinutes });

    await sendWithRetry({
      kind,
      from,
      to: email,
      subject,
      html,
      retries: parseInt(process.env.EMAIL_RETRY_COUNT || '2', 10),
      delayMs: parseInt(process.env.EMAIL_RETRY_DELAY_MS || '1000', 10),
    });
  } catch (err) {
    // Signup should never fail because of an email provider issue.
    console.error(`[email.${kind}] give up after retries`, err);
  }
}

export async function sendLoginOTPEmail(email, otp) {
  const kind = 'login-otp';
  try {
    if (!resend || !process.env.RESEND_API_KEY || !FROM_EMAIL) {
      console.warn(`[email.${kind}] Resend not configured. Skipping email.`, { to: email });
      return;
    }

    const from = `"${APP_NAME}" <${FROM_EMAIL}>`;
    const subject = `Your login code - ${APP_NAME}`;
    const html = getEmailTemplate('login-otp', { otp });

    await sendWithRetry({
      kind,
      from,
      to: email,
      subject,
      html,
      retries: parseInt(process.env.EMAIL_RETRY_COUNT || '2', 10),
      delayMs: parseInt(process.env.EMAIL_RETRY_DELAY_MS || '1000', 10),
    });
  } catch (err) {
    console.error(`[email.${kind}] give up after retries`, err);
  }
}

export async function sendPasswordResetEmail(email, token) {
  const kind = 'reset-password';
  try {
    if (!resend || !process.env.RESEND_API_KEY || !FROM_EMAIL) {
      console.warn(`[email.${kind}] Resend not configured. Skipping email.`, { to: email });
      return;
    }

    const resetUrl = `${BASE_URL}/reset-password?token=${token}`;
    const from = `"${APP_NAME}" <${FROM_EMAIL}>`;
    const subject = `Reset your password - ${APP_NAME}`;
    const html = getEmailTemplate('reset-password', { resetUrl });

    await sendWithRetry({
      kind,
      from,
      to: email,
      subject,
      html,
      retries: parseInt(process.env.EMAIL_RETRY_COUNT || '2', 10),
      delayMs: parseInt(process.env.EMAIL_RETRY_DELAY_MS || '1000', 10),
    });
  } catch (err) {
    console.error(`[email.${kind}] give up after retries`, err);
  }
}

export async function sendTestEmail(email) {
  const kind = 'test';
  try {
    if (!resend || !process.env.RESEND_API_KEY || !FROM_EMAIL) {
      console.warn(`[email.${kind}] Resend not configured. Skipping email.`, { to: email });
      return { ok: false, reason: 'resend_not_configured' };
    }

    const from = `"${APP_NAME}" <${FROM_EMAIL}>`;
    const subject = `${APP_NAME} email delivery test`;
    const html = `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
          <h2 style="margin-bottom: 8px;">Email delivery test</h2>
          <p>This is a test message from <strong>${APP_NAME}</strong>.</p>
          <p>If this reached your inbox, your Resend integration is working.</p>
          <p style="color:#666;font-size:12px;">Sent at: ${new Date().toISOString()}</p>
        </body>
      </html>
    `;

    const result = await sendWithRetry({
      kind,
      from,
      to: email,
      subject,
      html,
      retries: parseInt(process.env.EMAIL_RETRY_COUNT || '2', 10),
      delayMs: parseInt(process.env.EMAIL_RETRY_DELAY_MS || '1000', 10),
    });

    return { ok: true, id: result?.data?.id || null };
  } catch (err) {
    console.error(`[email.${kind}] give up after retries`, err);
    return { ok: false, reason: err?.message || 'send_failed' };
  }
}