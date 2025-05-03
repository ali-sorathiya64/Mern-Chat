import { Prisma } from "@prisma/client";
import { Request } from "express";

export interface AuthenticatedRequest extends Request {
    user: Omit<Prisma.UserUncheckedCreateInput, 'id' | 'name' | 'email' | 'username' | 'hashedPassword'> 
        & Required<Pick<Prisma.UserUncheckedCreateInput, 'id' | 'name' | 'email' | 'username'>>
        & { hashedPassword?: string };
}

export interface OAuthAuthenticatedRequest extends Request {
    user?: Prisma.UserUncheckedCreateInput & { newUser: boolean; googleId: string };
}

export interface IAvatar {
    secureUrl: string;
    publicId: string;
}

export interface IGithub {
    id: string;
    displayName: string;
    username: string;
    photos: Array<{ value: string }>;
    _json: { email: string };
}
