export enum Platform {
  META = 'META',
  X = 'X',
  LINKEDIN = 'LINKEDIN',
  TIKTOK = 'TIKTOK',
}

export interface PlatformAccount {
  id: string;
  userId: string;
  platform: Platform;
  platformAccountId: string;
  platformUsername: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  timezone: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlatformConfig {
  platform: Platform;
  maxCharacters: number;
  maxHashtags: number;
  supportedMediaTypes: MediaType[];
  maxMediaSize: number; // in bytes
  maxVideoDuration?: number; // in seconds
}

export type MediaType = 'image' | 'video' | 'gif';

export const PLATFORM_CONFIGS: Record<Platform, PlatformConfig> = {
  [Platform.META]: {
    platform: Platform.META,
    maxCharacters: 2200,
    maxHashtags: 30,
    supportedMediaTypes: ['image', 'video', 'gif'],
    maxMediaSize: 100 * 1024 * 1024, // 100MB
    maxVideoDuration: 60,
  },
  [Platform.X]: {
    platform: Platform.X,
    maxCharacters: 280,
    maxHashtags: 10,
    supportedMediaTypes: ['image', 'video', 'gif'],
    maxMediaSize: 512 * 1024 * 1024, // 512MB for video
    maxVideoDuration: 140,
  },
  [Platform.LINKEDIN]: {
    platform: Platform.LINKEDIN,
    maxCharacters: 3000,
    maxHashtags: 5,
    supportedMediaTypes: ['image', 'video'],
    maxMediaSize: 200 * 1024 * 1024, // 200MB
    maxVideoDuration: 600,
  },
  [Platform.TIKTOK]: {
    platform: Platform.TIKTOK,
    maxCharacters: 2200,
    maxHashtags: 100,
    supportedMediaTypes: ['video'],
    maxMediaSize: 287 * 1024 * 1024, // 287MB
    maxVideoDuration: 180,
  },
};
