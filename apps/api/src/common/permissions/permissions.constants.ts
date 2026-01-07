/**
 * Permission constants for role-based access control
 */
export enum Permission {
  // Workspace permissions
  WORKSPACE_UPDATE = 'workspace.update',
  WORKSPACE_DELETE = 'workspace.delete',
  WORKSPACE_MEMBERS_INVITE = 'workspace.members.invite',
  WORKSPACE_MEMBERS_REMOVE = 'workspace.members.remove',
  WORKSPACE_MEMBERS_UPDATE = 'workspace.members.update',

  // Post permissions
  POSTS_VIEW = 'posts.view',
  POSTS_CREATE = 'posts.create',
  POSTS_EDIT = 'posts.edit',
  POSTS_DELETE = 'posts.delete',
  POSTS_PUBLISH = 'posts.publish',
  POSTS_APPROVE = 'posts.approve',

  // Platform permissions
  PLATFORMS_VIEW = 'platforms.view',
  PLATFORMS_CONNECT = 'platforms.connect',
  PLATFORMS_DISCONNECT = 'platforms.disconnect',

  // Analytics permissions
  ANALYTICS_VIEW = 'analytics.view',

  // AI permissions
  AI_GENERATE = 'ai.generate',

  // Blog monitoring permissions
  BLOG_SOURCES_MANAGE = 'blog.sources.manage',
}

/**
 * Wildcard permission that grants full access
 */
export const WILDCARD_PERMISSION = '*';

/**
 * Default permission sets for each role type
 */
export const DEFAULT_ROLE_PERMISSIONS = {
  Admin: [WILDCARD_PERMISSION],
  Publisher: [
    Permission.POSTS_VIEW,
    Permission.POSTS_CREATE,
    Permission.POSTS_EDIT,
    Permission.POSTS_DELETE,
    Permission.POSTS_PUBLISH,
    Permission.POSTS_APPROVE,
    Permission.PLATFORMS_VIEW,
    Permission.PLATFORMS_CONNECT,
    Permission.PLATFORMS_DISCONNECT,
    Permission.ANALYTICS_VIEW,
  ],
  Creator: [
    Permission.POSTS_VIEW,
    Permission.POSTS_CREATE,
    Permission.POSTS_EDIT,
    Permission.PLATFORMS_VIEW,
    Permission.ANALYTICS_VIEW,
  ],
  Viewer: [
    Permission.POSTS_VIEW,
    Permission.PLATFORMS_VIEW,
    Permission.ANALYTICS_VIEW,
  ],
};
