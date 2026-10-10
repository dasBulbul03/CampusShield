import { createContext, useState, useContext } from 'react'
import { toast } from 'react-toastify'
import api, { setAuthToken } from '../services/api'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

const readStoredToken = () => localStorage.getItem('token')

const readStoredUser = () => {
  try {
    const raw = localStorage.getItem('user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(readStoredUser)
  const [token, setToken] = useState(readStoredToken)
  const loading = false

  const login = async (email, password) => {
    try {
      const formData = new FormData()
      formData.append('username', email)
      formData.append('password', password)

      const response = await api.post('/auth/login', formData)
      const { access_token, role, full_name } = response.data

      localStorage.setItem('token', access_token)
      localStorage.setItem('user', JSON.stringify({ email, role, full_name }))

      setAuthToken(access_token)
      setToken(access_token)
      setUser({ email, role, full_name })

      toast.success('Login successful!')
      return { success: true, role }
    } catch (error) {
      const message = error.response?.data?.detail || 'Login failed'
      toast.error(message)
      return { success: false, error: message }
    }
  }

  const register = async (fullName, email, password) => {
    try {
      const response = await api.post('/auth/register', {
        full_name: fullName,
        email,
        password,
      })
      const { access_token, role, full_name } = response.data

      localStorage.setItem('token', access_token)
      localStorage.setItem('user', JSON.stringify({ email, role, full_name }))

      setAuthToken(access_token)
      setToken(access_token)
      setUser({ email, role, full_name })

      toast.success('Registration successful!')
      return { success: true, role }
    } catch (error) {
      const message = error.response?.data?.detail || 'Registration failed'
      toast.error(message)
      return { success: false, error: message }
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setAuthToken(null)
    setToken(null)
    setUser(null)
    toast.info('Logged out successfully')
  }

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'ADMIN',
    isStudent: user?.role === 'STUDENT',
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
