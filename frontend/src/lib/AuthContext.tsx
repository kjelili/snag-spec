import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

export type UserRole =
  | 'architect'
  | 'contract_admin'
  | 'employers_agent'
  | 'pm'
  | 'site_manager'
  | 'qs'
  | 'viewer'

export interface AppUser {
  id: string
  name: string
  email: string
  role: UserRole
}

interface AuthContextType {
  user: AppUser | null
  isAuthenticated: boolean
  login: (user: AppUser) => void
  logout: () => void
}

const AUTH_KEY = 'snag-spec-auth-user'

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(() => {
    try {
      const stored = localStorage.getItem(AUTH_KEY)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    if (user) {
      localStorage.setItem(AUTH_KEY, JSON.stringify(user))
    } else {
      localStorage.removeItem(AUTH_KEY)
    }
  }, [user])

  const login = (u: AppUser) => setUser(u)
  const logout = () => setUser(null)

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
