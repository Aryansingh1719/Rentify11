import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import dbConnect from '../lib/mongodb.js';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import { signToken, setAuthCookie, removeAuthCookie, getAuthUser } from '../lib/auth.js';
import { generateOTP, hashOTP, getOTPExpiry, verifyOTP } from '../lib/otp.js';
import { sendVerificationEmail, sendLoginOTPEmail, sendPasswordResetEmail } from '../lib/email.js';
import { generateResetToken, hashResetToken, getResetTokenExpiry } from '../lib/token.js';
import { canResendOTP, updateResendCount } from '../lib/rateLimit.js';
import { getClientInfo } from '../lib/clientInfo.js';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;
const ENABLE_EMAIL_VERIFICATION = process.env.ENABLE_EMAIL_VERIFICATION === 'true';
const ENABLE_LOGIN_OTP = process.env.ENABLE_LOGIN_OTP === 'true';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

function frontendBase() {
  return process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

function apiPublicBase() {
  return process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`;
}

function isStrongPassword(password) {
  const strongPasswordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return strongPasswordRegex.test(password);
}

export async function register(req, res) {
  const isProd = process.env.NODE_ENV === 'production';

  try {
    // Basic env / configuration sanity checks – helps avoid opaque 500s in production.
    if (!process.env.MONGODB_URI) {
      console.error('[auth.register] Missing MONGODB_URI env');
      return res.status(500).json({ message: 'Server misconfiguration: database URI not set' });
    }

    await dbConnect();
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        message:
          'Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.',
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const emailVerificationEnabled = ENABLE_EMAIL_VERIFICATION;
    const otp = emailVerificationEnabled ? generateOTP() : null;
    const hashedOtp = emailVerificationEnabled ? await hashOTP(otp) : null;
    const otpExpiry = emailVerificationEnabled ? getOTPExpiry() : null;
    const normalizedRole = role || 'renter';

    console.log('[auth.register] Creating user', email);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: normalizedRole,
      isVerified: !emailVerificationEnabled,
      ...(emailVerificationEnabled
        ? {
            emailVerificationOTP: hashedOtp,
            otpExpiry,
            otpResendCount: 0,
            otpResendWindow: new Date(),
          }
        : {}),
    });

    if (!user) {
      console.error('[auth.register] User.create returned null for', email);
      return res.status(500).json({ message: 'Failed to create user account' });
    }

    if (emailVerificationEnabled) {
      console.log('[auth.register] Triggering verification email (async)', user.email);
      // Non-blocking: signup should return immediately.
      // sendVerificationEmail has internal error handling.
      sendVerificationEmail(user.email, otp, 7);
      return res.status(201).json({
        success: true,
        message: 'Verification email sent',
        redirect: '/verify-email',
        email: user.email,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isVerified: false,
        },
      });
    }

    const token = signToken({
      id: user._id,
      role: user.role,
      sessionVersion: user.sessionVersion ?? 0,
    });
    setAuthCookie(res, token);

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      redirect: normalizedRole === 'seller' ? '/seller/dashboard' : '/dashboard',
      email: user.email,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: true,
      },
    });
  } catch (error) {
    console.error('[auth.register] Unhandled error', error);
    return res.status(500).json({
      message: !isProd && (error?.message || error?.toString?.()) ? error.message || String(error) : 'Internal server error',
    });
  }
}

export async function login(req, res) {
  try {
    await dbConnect();
    const { email, password } = req.body;
    const { ip, userAgent } = getClientInfo(req);

    if (!email || !password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      await AuditLog.create({ action: 'login_failed', email, ip, userAgent, metadata: { reason: 'not_found' } });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: 'Account is blocked. Contact support.' });
    }

    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      await AuditLog.create({ action: 'login_locked', userId: user._id, email, ip, userAgent });
      return res.status(423).json({
        message: 'Account temporarily locked due to too many failed attempts. Try again later.',
        lockedUntil: user.lockedUntil,
      });
    }

    if (user.lockedUntil && new Date(user.lockedUntil) <= new Date()) {
      await User.findByIdAndUpdate(user._id, { failedLoginAttempts: 0, lockedUntil: null });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      const newAttempts = (user.failedLoginAttempts || 0) + 1;
      const updates = { failedLoginAttempts: newAttempts };
      if (newAttempts >= MAX_FAILED_ATTEMPTS) {
        updates.lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
      }
      await User.findByIdAndUpdate(user._id, updates);
      await AuditLog.create({
        action: 'login_failed',
        userId: user._id,
        email,
        ip,
        userAgent,
        metadata: { attempts: newAttempts },
      });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Email-OTP login is only active when email verification is explicitly enabled.
    if (ENABLE_EMAIL_VERIFICATION && ENABLE_LOGIN_OTP) {
      const otp = generateOTP();
      const hashedOtp = await hashOTP(otp);
      const otpExpiry = new Date();
      otpExpiry.setMinutes(otpExpiry.getMinutes() + 5);
      await User.findByIdAndUpdate(user._id, {
        loginOTP: hashedOtp,
        loginOTPExpiry: otpExpiry,
      });
      await sendLoginOTPEmail(user.email, otp);
      return res.status(200).json({
        message: 'OTP sent to your email',
        requiresOtp: true,
        email: user.email,
        redirect: '/verify-login-otp',
      });
    }

    await User.findByIdAndUpdate(user._id, { failedLoginAttempts: 0, lockedUntil: null });

    const token = signToken({
      id: user._id,
      role: user.role,
      sessionVersion: user.sessionVersion ?? 0,
    });
    setAuthCookie(res, token);

    await AuditLog.create({ action: 'login', userId: user._id, email, ip, userAgent });

    return res.json({
      message: 'Login successful',
      token,
      redirect: user.role === 'seller' ? '/seller/dashboard' : '/dashboard',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export function googleAuthStart(req, res) {
  if (!GOOGLE_CLIENT_ID) {
    const base = frontendBase();
    return res.redirect(`${base}/login?error=oauth_not_configured`);
  }

  const state = crypto.randomBytes(32).toString('hex');
  const redirectUri = `${apiPublicBase()}/api/auth/google/callback`;

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'offline',
    prompt: 'select_account',
  });

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  res.cookie('google_oauth_state', state, {
    httpOnly: true,
    secure: true,          // 🔥 force true in production
    sameSite: 'none',      // 🔥 REQUIRED for cross-origin
    maxAge: 600000,
    path: '/',
  });

  return res.redirect(googleAuthUrl);
}

export async function googleAuthCallback(req, res) {
  const base = frontendBase();

  function redirectToLogin(error) {
    const url = new URL('/login', base);
    if (error) url.searchParams.set('error', error);
    res.clearCookie('google_oauth_state', { path: '/' });
    return res.redirect(url.toString());
  }

  try {
    const code = req.query.code;
    const state = req.query.state;
    const error = req.query.error;

    if (error) {
      if (error === 'access_denied') {
        return redirectToLogin('google_cancelled');
      }
      return redirectToLogin('google_failed');
    }

    if (!code || !state) {
      return redirectToLogin('invalid_callback');
    }

    const savedState = req.cookies?.google_oauth_state;
    if (!savedState || savedState !== state) {
      return redirectToLogin('invalid_state');
    }

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return redirectToLogin('oauth_not_configured');
    }

    const redirectUri = `${apiPublicBase()}/api/auth/google/callback`;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const errData = await tokenRes.text();
      console.error('Google token error:', errData);
      return redirectToLogin('token_exchange_failed');
    }

    const tokens = await tokenRes.json();
    const accessToken = tokens.access_token;

    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userInfoRes.ok) {
      return redirectToLogin('userinfo_failed');
    }

    const profile = await userInfoRes.json();
    const { id: googleId, email, name, picture } = profile;

    if (!email) {
      return redirectToLogin('no_email');
    }

    const { ip, userAgent } = getClientInfo(req);
    await dbConnect();

    let user = await User.findOne({ googleId });
    if (user) {
      if (user.isBlocked) {
        return redirectToLogin('account_blocked');
      }
    } else {
      user = await User.findOne({ email });
      if (user) {
        if (user.isBlocked) {
          return redirectToLogin('account_blocked');
        }
        user.googleId = googleId;
        user.isVerified = true;
        if (picture && !user.avatar) user.avatar = picture;
        await user.save();
      } else {
        user = await User.create({
          name: name || email.split('@')[0],
          email,
          googleId,
          avatar: picture || '',
          authProvider: 'google',
          isVerified: true,
          role: 'renter',
        });
      }
    }

    const token = signToken({
      id: user._id,
      role: user.role,
      sessionVersion: user.sessionVersion ?? 0,
    });
    setAuthCookie(res, token);

    await AuditLog.create({
      action: 'login',
      userId: user._id,
      email: user.email,
      ip,
      userAgent,
      metadata: { provider: 'google' },
    });

    // Land on a public route first so middleware runs before client sets the app-origin token cookie.
    const dest = new URL('/', base);
    dest.hash = `token=${encodeURIComponent(token)}`;
    res.clearCookie('google_oauth_state', { path: '/' });
    return res.redirect(dest.toString());
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    return redirectToLogin('server_error');
  }
}
