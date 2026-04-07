import jwt from 'jsonwebtoken';
import dbConnect from './mongodb.js';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

// ================= ACTIVE CODE (Bearer Token) =================

// 🔥 SIGN TOKEN
export function signToken(payload) {
  return jwt.sign(
    { ...payload, sessionVersion: payload.sessionVersion ?? 0 },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// 🔥 VERIFY TOKEN
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// 🔥 GET AUTH USER (UPDATED FOR BEARER TOKEN)
export async function getAuthUser(req) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = verifyToken(token);
    if (!decoded || !decoded.id) return null;

    await dbConnect();

    const user = await User.findById(decoded.id).select("-password");
    if (!user) return null;

    return user;

  } catch {
    return null;
  }
}
