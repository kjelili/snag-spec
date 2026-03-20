# User Data Ownership & Role-Based Access — Integration Guide

## Overview

This update adds per-user data isolation and role-based access control to Snag-to-Spec. All data stays on each user's device in namespaced localStorage. No data leaks between users.

## Architecture Summary

### Data Isolation Model

```
localStorage keys:
  snag-spec-session-v2           → Current logged-in user
  snag-spec-users-registry-v2    → All registered users (for PM cross-lookup)
  snag-spec-u:{userId}:db-v2     → Per-user snags, instructions, projects, contracts
  snag-spec-p:{projectId}:snag-contributors → Which users contributed to a project
```

Each user gets their own isolated `db-v2` key. A Project Manager can read (not write) other users' data for project-level aggregation.

### Role System

| Role             | Can Create Snags | Can Generate Instructions | Can Approve/Issue | Can View All Project Snags | Can Manage Crew |
|------------------|-----------------|--------------------------|-------------------|---------------------------|-----------------|
| Project Manager  | ✓               | ✓                        | ✓                 | ✓                         | ✓               |
| Architect        | ✓               | ✓                        | ✓                 | ✗                         | ✗               |
| Site Manager     | ✓               | ✗                        | ✗                 | ✗                         | ✗               |
| Contractor       | ✗               | ✗                        | ✗                 | ✗                         | ✗               |
| Viewer           | ✗               | ✗                        | ✗                 | ✗                         | ✗               |

## New/Modified Files

### New Files
- `frontend/src/lib/api.types.ts` — Shared type definitions (extracted from old api.ts)
- `frontend/src/lib/auth.ts` — User identity, roles, permissions, session management
- `frontend/src/lib/userStore.ts` — Per-user scoped localStorage CRUD operations
- `frontend/src/lib/AuthContext.tsx` — React context for auth state
- `frontend/src/components/AuthGuard.tsx` — Route protection component
- `frontend/src/components/UserBadge.tsx` — Current user display in header
- `frontend/src/pages/LoginPage.tsx` — Login/Register screen
- `frontend/src/pages/CrewPage.tsx` — PM-only team management

### Modified Files
- `frontend/src/lib/api.ts` — Now routes to userStore instead of single-namespace localStorage
- `frontend/src/App.tsx` — Added AuthProvider, login route, AuthGuard wrappers, crew route
- `frontend/src/components/Layout.tsx` — Added UserBadge, role-aware nav, crew link for PMs
- `frontend/src/pages/Landing.tsx` — Auth-aware CTAs
- `frontend/src/pages/Dashboard.tsx` — Role-aware stats and PM aggregation view
- `frontend/src/pages/SnagDetail.tsx` — Role-aware action buttons, ownership indicator

### Unchanged Files (no modifications needed)
- `frontend/src/lib/utils.ts`
- `frontend/src/lib/cloudSync.ts`
- `frontend/src/pages/Snags.tsx`
- `frontend/src/pages/Instructions.tsx`
- `frontend/src/pages/InstructionDetail.tsx`
- `frontend/src/pages/CreateSnag.tsx`
- `frontend/src/pages/DataOwnership.tsx`
- All backend files (no changes needed for local-mode operation)

## Integration Steps

1. **Replace** `frontend/src/lib/api.ts` with the new version
2. **Add** all new files listed above to their respective directories
3. **Replace** modified files listed above
4. **Keep** unchanged files as-is — their imports remain compatible

## How It Works

### User Flow
1. User visits `/` → Landing page shows "Sign In" or "Get started"
2. User registers with name, email, and role → Account stored in localStorage
3. User is redirected to `/app/dashboard` → AuthGuard checks session
4. All CRUD operations read/write to `snag-spec-u:{userId}:db-v2`
5. When a snag is created, the user is registered as a project contributor
6. PMs can see all snags from all contributors on their projects

### Data Isolation Guarantees
- Each user's snags/instructions are in their own localStorage key
- A non-PM user NEVER reads another user's localStorage key
- PMs read (but never write to) other users' keys for aggregation
- The users registry is shared but contains only identity info (name, email, role)
- Logging out clears the session but preserves the user's data for next login

### Migration from Old Data
The old single-namespace key (`snag-spec-local-db-v1`) is NOT automatically migrated. Users will start fresh with the new system. If you need migration, you can read the old key and import it into the first user's namespace.
