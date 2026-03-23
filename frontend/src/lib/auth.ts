import type { AppUser, UserRole } from './AuthContext'

export const ROLES: { value: UserRole; label: string }[] = [
  { value: 'pm', label: 'Project Manager' },
  { value: 'architect', label: 'Architect' },
  { value: 'contract_admin', label: 'Contract Administrator' },
  { value: 'employers_agent', label: "Employer's Agent" },
  { value: 'site_manager', label: 'Site Manager' },
  { value: 'qs', label: 'Quantity Surveyor' },
  { value: 'viewer', label: 'Viewer' },
]

export function roleLabel(role: UserRole): string {
  return ROLES.find((r) => r.value === role)?.label ?? role
}

export function canManageCrew(user: AppUser): boolean {
  return ['pm', 'contract_admin', 'employers_agent'].includes(user.role)
}

export function canCreateInstruction(user: AppUser): boolean {
  return ['architect', 'contract_admin', 'employers_agent', 'pm'].includes(user.role)
}

export function canApproveInstruction(user: AppUser): boolean {
  return ['architect', 'contract_admin', 'employers_agent', 'pm'].includes(user.role)
}

export function canIssueInstruction(user: AppUser): boolean {
  return ['architect', 'contract_admin', 'employers_agent'].includes(user.role)
}
