import type { Platform } from './platforms';

export enum PostStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  SCHEDULED = 'SCHEDULED',
  PUBLISHING = 'PUBLISHING',
  PUBLISHED = 'PUBLISHED',
  FAILED = 'FAILED',
}

export interface Post {
  id: string;
  workspaceId: string;
  createdById: string;
  title?: string;
  content: string;
  mediaUrls: string[];
  platforms: PostPlatformConfig[];
  scheduledAt?: Date;
  publishedAt?: Date;
  status: PostStatus;
  approvalChain?: ApprovalStep[];
  sourceUrl?: string; // Blog source if auto-generated
  aiGenerated: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PostPlatformConfig {
  platform: Platform;
  accountId: string;
  content?: string; // Platform-specific override
  mediaUrls?: string[]; // Platform-specific media
  hashtags?: string[];
  publishedPostId?: string;
  publishedAt?: Date;
  status: PostStatus;
  failureReason?: string;
}

export interface ApprovalStep {
  order: number;
  approverId: string;
  delegatedTo?: string;
  status: 'pending' | 'approved' | 'rejected';
  comment?: string;
  decidedAt?: Date;
}

export interface CreatePostDto {
  title?: string;
  content: string;
  mediaUrls?: string[];
  platforms: {
    platform: Platform;
    accountId: string;
    content?: string;
    hashtags?: string[];
  }[];
  scheduledAt?: string; // ISO date string
}

export interface UpdatePostDto {
  title?: string;
  content?: string;
  mediaUrls?: string[];
  scheduledAt?: string;
}
