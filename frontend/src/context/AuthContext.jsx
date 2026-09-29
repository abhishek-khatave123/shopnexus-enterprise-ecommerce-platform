import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { authService } from '../services/authService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('shopnexus_token')
    if (!token) {
      setLoading(false)
      return
    }
    try {
      const me = await authService.me()
      setUser(me)
    } catch {
      localStorage.removeItem('shopnexus_token')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUser()
  }, [loadUser])

  const login = async (email, password) => {
    const { access_token } = await authService.login({ email, password })
    localStorage.setItem('shopnexus_token', access_token)
    const me = await authService.me()
    setUser(me)
    return me
  }

  const register = async (data) => {
    const { access_token } = await authService.register(data)
    localStorage.setItem('shopnexus_token', access_token)
    const me = await authService.me()
    setUser(me)
    return me
  }

  const logout = () => {
    localStorage.removeItem('shopnexus_token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAdmin: user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
