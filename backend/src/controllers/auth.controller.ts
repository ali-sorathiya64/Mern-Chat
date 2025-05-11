import { NextFunction, Request, Response } from "express";
import jwt from 'jsonwebtoken';
import { config } from "../config/env.config.js";
import { prisma } from '../lib/prisma.lib.js';
import { env } from "../schemas/env.schema.js";
import { CustomError, asyncErrorHandler } from "../utils/error.utils.js";

// Types
interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  avatar?: string;
  publicKey?: string | null;
  createdAt: Date;
  updatedAt: Date;
  emailVerified: Date | null;
  notificationsEnabled: boolean;
  verificationBadge?: boolean;
  fcmToken?: string | null;
  oAuthSignup: boolean;
  newUser?: boolean;
  lastSeen?: Date | null;
  avatarCloudinaryPublicId?: string | null;
}

interface AuthenticatedRequest extends Request {
  user: User;
}

interface OAuthAuthenticatedRequest extends Request {
  user: User & {
    newUser?: boolean;
  };
}

interface fcmTokenSchemaType {
  fcmToken: string;
}

// Helper function
const getSecureUserInfo = (user: User) => ({
  id: user.id,
  name: user.name,
  username: user.username,
  avatar: user.avatar,
  email: user.email,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
  emailVerified: user.emailVerified,
  publicKey: user.publicKey,
  notificationsEnabled: user.notificationsEnabled,
  verificationBadge: user.verificationBadge,
  fcmToken: user.fcmToken,
  oAuthSignup: user.oAuthSignup
});

// Controller functions
export const getUserInfo = asyncErrorHandler(async (req: AuthenticatedRequest, res: Response) => {
  res.status(200).json(getSecureUserInfo(req.user));
});

export const updateFcmToken = asyncErrorHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { fcmToken } = req.body as fcmTokenSchemaType;
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { fcmToken }
  });
  res.status(200).json({ fcmToken: user.fcmToken });
});

export const checkAuth = asyncErrorHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) return next(new CustomError("Token missing, please login again", 401));
  res.status(200).json(getSecureUserInfo(req.user));
});

export const redirectHandler = asyncErrorHandler(async (req: OAuthAuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.redirect(`${config.clientUrl}/auth/login`);
    
    const tempToken = jwt.sign(
      { user: req.user.id, oAuthNewUser: req.user.newUser },
      env.JWT_SECRET,
      { expiresIn: "5m" }
    );
    
    res.redirect(307, `${config.clientUrl}/auth/oauth-redirect?token=${tempToken}`);
  } catch (error) {
    console.error('OAuth redirect error:', error);
    res.redirect(`${config.clientUrl}/auth/login`);
  }
});