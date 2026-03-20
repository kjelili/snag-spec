/**
 * User Authentication & Session Management
 *
 * Principles:
 * - Each user owns their data — nothing leaves their system
 * - localStorage is namespaced per user ID
 * - Project Managers can see all snags for their project
 * - Role-based access: creator vs corrector vs PM
 * - No data leaks between users
 */

export type UserRole = 'project_manager' | 'architect' | 'site_manager' | 'contractor' | 'viewer'

export interface AppUser {
  id: string
  name: string
  email: string
  role: UserRole
  /** Projects this user has access to (by project ID) */
  projectIds: string[]
  createdAt: string
}

const SESSION_KEY = 'snag-spec-session-v2'
const USERS_REGISTRY_KEY = 'snag-spec-users-registry-v2'

// ─── Session helpers ───────────────────────────────────────────────

export function getCurrentUser(): AppUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const user = JSON.parse(raw) as AppUser
    // Validate required fields
    if (!user.id || !user.name || !user.role) return null
    return user
  } catch {
    return null
  }
}

export function setCurrentUser(user: AppUser): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user))
  // Also register in user registry (for PM cross-lookup)
  registerUser(user)
}

export function clearCurrentUser(): void {
  localStorage.removeItem(SESSION_KEY)
}

export function isLoggedIn(): boolean {
  return getCurrentUser() !== null
}

// ─── User Registry (shared across sessions for PM access) ──────────

interface UsersRegistry {
  users: AppUser[]
}

function readUsersRegistry(): UsersRegistry {
  try {
    const raw = localStorage.getItem(USERS_REGISTRY_KEY)
    if (!raw) return { users: [] }
    return JSON.parse(raw) as UsersRegistry
  } catch {
    return { users: [] }
  }
}

function writeUsersRegistry(registry: UsersRegistry): void {
  localStorage.setItem(USERS_REGISTRY_KEY, JSON.stringify(registry))
}

function registerUser(user: AppUser): void {
  const registry = readUsersRegistry()
  const existingIndex = registry.users.findIndex((u) => u.id === user.id)
  if (existingIndex >= 0) {
    registry.users[existingIndex] = user
  } else {
    registry.users.push(user)
  }
  writeUsersRegistry(registry)
}

export function getRegisteredUsers(): AppUser[] {
  return readUsersRegistry().users
}

export function getProjectUsers(projectId: string): AppUser[] {
  return readUsersRegistry().users.filter((u) => u.projectIds.includes(projectId))
}

// ─── Per-user localStorage key generation ──────────────────────────

/**
 * Returns a localStorage key scoped to a specific user.
 * This ensures complete data isolation between users.
 */
export function userScopedKey(userId: string, key: string): string {
  return `snag-spec-u:${userId}:${key}`
}

/**
 * Returns a localStorage key scoped to a project.
 * Used by PMs to aggregate data across users for a project.
 */
export function projectScopedKey(projectId: string, key: string): string {
  return `snag-spec-p:${projectId}:${key}`
}

// ─── Role permission checks ────────────────────────────────────────

export function canManageProject(user: AppUser): boolean {
  return user.role === 'project_manager'
}

export function canCreateSnag(user: AppUser): boolean {
  return ['project_manager', 'architect', 'site_manager'].includes(user.role)
}

export function canCorrectSnag(user: AppUser): boolean {
  return ['project_manager', 'contractor', 'site_manager'].includes(user.role)
}

export function canGenerateInstruction(user: AppUser): boolean {
  return ['project_manager', 'architect'].includes(user.role)
}

export function canApproveInstruction(user: AppUser): boolean {
  return ['project_manager', 'architect'].includes(user.role)
}

export function canIssueInstruction(user: AppUser): boolean {
  return ['project_manager', 'architect'].includes(user.role)
}

export function canViewAllProjectSnags(user: AppUser): boolean {
  return user.role === 'project_manager'
}

export function canManageCrew(user: AppUser): boolean {
  return user.role === 'project_manager'
}

// ─── New user creation helper ──────────────────────────────────────

export function createNewUser(
  name: string,
  email: string,
  role: UserRole,
  projectIds: string[] = []
): AppUser {
  return {
    id: crypto.randomUUID(),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    role,
    projectIds,
    createdAt: new Date().toISOString(),
  }
}

/**
 * Find a user by email in the registry (for login).
 */
export function findUserByEmail(email: string): AppUser | null {
  const registry = readUsersRegistry()
  return registry.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null
}

/**
 * Role display labels
 */
export function roleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    project_manager: 'Project Manager',
    architect: 'Architect',
    site_manager: 'Site Manager',
    contractor: 'Contractor',
    viewer: 'Viewer',
  }
  return labels[role] || role
}
