/**
 * React Auth Context
 *
 * Provides current user state and auth actions to the component tree.
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { AppUser, UserRole } from './auth'
import {
  getCurrentUser,
  setCurrentUser as persistUser,
  clearCurrentUser,
  createNewUser,
  findUserByEmail,
} from './auth'

interface AuthContextValue {
  user: AppUser | null
  isAuthenticated: boolean
  login: (email: string) => AppUser | null
  register: (name: string, email: string, role: UserRole) => AppUser
  logout: () => void
  updateUser: (updates: Partial<AppUser>) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(() => getCurrentUser())

  const login = useCallback((email: string): AppUser | null => {
    const found = findUserByEmail(email)
    if (found) {
      persistUser(found)
      setUser(found)
      return found
    }
    return null
  }, [])

  const register = useCallback((name: string, email: string, role: UserRole): AppUser => {
    // Check if user already exists
    const existing = findUserByEmail(email)
    if (existing) {
      persistUser(existing)
      setUser(existing)
      return existing
    }

    const newUser = createNewUser(name, email, role)
    persistUser(newUser)
    setUser(newUser)
    return newUser
  }, [])

  const logout = useCallback(() => {
    clearCurrentUser()
    setUser(null)
  }, [])

  const updateUser = useCallback((updates: Partial<AppUser>) => {
    setUser((prev) => {
      if (!prev) return null
      const updated = { ...prev, ...updates }
      persistUser(updated)
      return updated
    })
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
