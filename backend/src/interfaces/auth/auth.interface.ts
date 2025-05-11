import { Prisma, User } from "@prisma/client";
import { Request } from "express";

/**
 * Core User type without sensitive/auto-generated fields
 */
export type SafeUser = Omit<User, 'hashedPassword' | 'createdAt' | 'updatedAt'>;

/**
 * Authenticated Request type with minimal required user fields
 */
export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    name: string;
    email: string;
    username: string;
    avatar?: string;
    publicKey?: string | null;
    isOnline?: boolean;
    lastSeen?: Date | null;
    verificationBadge?: boolean;
    hashedPassword?: never; // Explicitly excluded
  };
}

/**
 * OAuth Request type with Google-specific fields
 */
export interface OAuthAuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    username: string;
    avatar?: string;
    newUser: boolean;
    googleId: string;
    hashedPassword?: never;
  };
}

/**
 * Cloudinary avatar response structure
 */
export interface IAvatar {
  secureUrl: string;
  publicId: string;
}

/**
 * GitHub OAuth response structure
 */
export interface IGithubProfile {
  id: string;
  displayName: string;
  username: string;
  photos: Array<{ value: string }>;
  _json: {
    email: string;
    avatar_url?: string;
    login?: string;
  };
}

// Optional: Utility types for Prisma operations
export type UserCreateInput = Prisma.UserCreateInput;
export type UserUpdateInput = Prisma.UserUpdateInput;