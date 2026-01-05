export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  workspaces: WorkspaceMembership[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  tier: WorkspaceTier;
  settings: WorkspaceSettings;
  createdAt: Date;
  updatedAt: Date;
}

export enum WorkspaceTier {
  FREE = 'FREE',
  PROFESSIONAL = 'PROFESSIONAL',
  ENTERPRISE = 'ENTERPRISE',
}

export interface WorkspaceSettings {
  defaultTimezone: string;
  brandVoiceExamples?: string[];
  brandVoiceRules?: string[];
  storageConfig?: StorageConfig;
}

export interface StorageConfig {
  provider: 's3' | 'gcs' | 'azure';
  bucket: string;
  region: string;
  pathPrefix?: string;
  // Credentials stored encrypted separately
}

export interface WorkspaceMembership {
  workspaceId: string;
  userId: string;
  roleId: string;
  role: Role;
  joinedAt: Date;
}

export interface Role {
  id: string;
  workspaceId: string;
  name: string;
  isDefault: boolean;
  permissions: Permission[];
}

export type Permission =
  | 'content:view'
  | 'content:create'
  | 'content:edit'
  | 'content:delete'
  | 'content:approve'
  | 'content:publish'
  | 'analytics:view'
  | 'team:view'
  | 'team:manage'
  | 'integrations:view'
  | 'integrations:manage'
  | 'billing:view'
  | 'billing:manage'
  | 'workspace:settings';

export const DEFAULT_ROLES = {
  ADMIN: [
    'content:view',
    'content:create',
    'content:edit',
    'content:delete',
    'content:approve',
    'content:publish',
    'analytics:view',
    'team:view',
    'team:manage',
    'integrations:view',
    'integrations:manage',
    'billing:view',
    'billing:manage',
    'workspace:settings',
  ] as Permission[],
  PUBLISHER: [
    'content:view',
    'content:create',
    'content:edit',
    'content:delete',
    'content:approve',
    'content:publish',
    'analytics:view',
    'integrations:view',
  ] as Permission[],
  CREATOR: [
    'content:view',
    'content:create',
    'content:edit',
    'analytics:view',
  ] as Permission[],
  VIEWER: ['content:view', 'analytics:view'] as Permission[],
};
