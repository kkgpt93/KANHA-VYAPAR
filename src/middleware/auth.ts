import type { NextFunction, Request, Response } from 'express';
import {
  isSupabaseServerConfigured,
  verifySupabaseToken,
  type VerifiedAuthUser,
} from '../lib/supabase-admin.ts';
import { getOrCreateUser } from '../db/users.ts';

export interface AuthRequest extends Request {
  user?: VerifiedAuthUser;
  accessToken?: string;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!isSupabaseServerConfigured()) {
    res.status(503).json({
      error: 'Supabase authentication is not configured yet on the server.',
    });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing authentication token' });
    return;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    res.status(401).json({ error: 'Unauthorized: Empty authentication token' });
    return;
  }

  try {
    const verifiedUser = await verifySupabaseToken(token);
    req.user = verifiedUser;
    req.accessToken = token;

    await getOrCreateUser(
      verifiedUser.uid,
      verifiedUser.email,
      verifiedUser.displayName,
      token
    );

    next();
  } catch (error) {
    console.error('Supabase authentication or user sync error:', error);
    const message =
      error instanceof Error && error.message.includes('Database')
        ? 'Service temporarily unavailable. Please try again.'
        : 'Unauthorized: Invalid or expired authentication token';
    const status =
      error instanceof Error && error.message.includes('Database') ? 503 : 401;
    res.status(status).json({ error: message });
  }
};
