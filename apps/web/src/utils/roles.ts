export type WorkspaceRole = 'owner' | 'admin' | 'editor' | 'viewer';

const roleRank: Record<WorkspaceRole, number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
  owner: 4
};

export function hasRequiredRole(role: WorkspaceRole | undefined, requiredRole: WorkspaceRole | undefined) {
  if (!requiredRole) return true;
  if (!role) return false;
  return roleRank[role] >= roleRank[requiredRole];
}
