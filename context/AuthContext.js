'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const AuthContext = createContext({
  user: null,
  profile: null,
  loading: true,
  loginModalOpen: false,
  setLoginModalOpen: () => {},
  signInWithGoogle: async () => {},
  signInWithOtp: async () => {},
  logout: async () => {},
  openLoginModal: () => {},
  authError: null,
  setAuthError: () => {},
})

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)
  const [authError, setAuthError] = useState(null)

  // Fetch or create profile in Supabase database
  const fetchProfile = async (sessionUser) => {
    if (!sessionUser) {
      setProfile(null)
      return null
    }

    try {
      let data = null
      let error = null

      // Attempt to query profiles with a short delay retry to let the DB trigger settle
      for (let attempt = 0; attempt < 3; attempt++) {
        const res = await supabase
          .from('profiles')
          .select('*')
          .eq('id', sessionUser.id)
          .single()

        if (!res.error && res.data) {
          data = res.data
          error = null
          break
        }

        error = res.error
        if (res.error && res.error.code !== 'PGRST116') {
          // Break early if it's a structural or connection error instead of just missing row
          break
        }

        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 150))
        }
      }

      if (error && error.code === 'PGRST116') {
        // Profile does not exist (trigger didn't run), insert it as fallback
        const newProfile = {
          id: sessionUser.id,
          name: sessionUser.user_metadata?.full_name || sessionUser.email?.split('@')[0] || 'Student',
          email: sessionUser.email || '',
          avatar_url: sessionUser.user_metadata?.avatar_url || '',
          phone: '',
          college: '',
          target_college: '',
          branch: '',
          year: 'Pre-college',
          role: 'student',
          verification_status: 'unverified',
          official_email: '',
          is_verified: false,
        }
        
        const { data: insertedData, error: insertError } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          .single()

        if (!insertError && insertedData) {
          setProfile(insertedData)
          return insertedData
        } else if (insertError && (insertError.code === '23505' || insertError.message?.includes('duplicate'))) {
          // If insert failed due to duplicate key, the profile was created concurrently. Refetch it.
          const { data: refetchedData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', sessionUser.id)
            .single()

          if (refetchedData) {
            setProfile(refetchedData)
            return refetchedData
          }
        }
        
        // Return structured local fallback state without throwing console errors
        setProfile(newProfile)
        return newProfile
      } else if (data) {
        setProfile(data)
        return data
      } else {
        const fallback = {
          id: sessionUser.id,
          name: sessionUser.user_metadata?.full_name || sessionUser.email?.split('@')[0] || 'Student',
          email: sessionUser.email || '',
          avatar_url: sessionUser.user_metadata?.avatar_url || '',
          role: 'student',
          verification_status: 'unverified',
          is_verified: false,
        }
        setProfile(fallback)
        return fallback
      }
    } catch (err) {
      console.warn('Silent fallback on fetchProfile exception:', err)
      return null
    }
  }

  // Restore session on load and listen to changes
  useEffect(() => {
    let active = true

    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user && active) {
          setUser(session.user)
          await fetchProfile(session.user)
        }
      } catch (err) {
        console.error('Session restore error:', err)
      } finally {
        if (active) setLoading(false)
      }
    }

    getInitialSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user)
        await fetchProfile(session.user)
      } else {
        setUser(null)
        setProfile(null)
      }
      if (active) setLoading(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  // Action hook to automatically resume action after successful login
  useEffect(() => {
    if (user && pendingAction) {
      pendingAction()
      setPendingAction(null)
    }
  }, [user, pendingAction])

  // Check for authentication callback errors in URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const errType = params.get('auth_error')
      const errMsg = params.get('message')
      if (errType) {
        const formattedMsg = `${errType}: ${errMsg || 'Authentication failed'}`
        console.error('Authentication Error:', formattedMsg)
        setAuthError(formattedMsg)
        setLoginModalOpen(true)
        // Clean URL params
        const newUrl = window.location.pathname
        window.history.replaceState({}, document.title, newUrl)
      }
    }
  }, [])

  // Route-Level Authorization & Automatic Redirects Central Checker
  useEffect(() => {
    if (loading) return

    const handleRouting = () => {
      const path = window.location.pathname
      
      // 1. Guest protection
      if (!user) {
        if (path.startsWith('/dashboard') || (path.startsWith('/senior') && !path.startsWith('/seniors')) || path.startsWith('/admin')) {
          window.location.href = '/'
        }
        return
      }

      if (!profile) return

      // 2. Determine proper dashboard redirect route
      let targetPath = '/dashboard'
      if (profile.role === 'admin') {
        targetPath = '/admin'
      } else if (profile.role === 'senior') {
        targetPath = '/senior'
      } else {
        // If they are a student:
        // Did they choose the senior signup track? Or do they have an ongoing verification?
        const flowChoice = localStorage.getItem('sahi_seat_login_role')
        if (flowChoice === 'senior' || profile.verification_status !== 'unverified') {
          targetPath = '/senior'
        } else {
          targetPath = '/dashboard'
        }
      }

      // 3. Route enforcement
      const isOnDashboard = path.startsWith('/dashboard')
      const isOnSenior = path.startsWith('/senior') && !path.startsWith('/seniors')
      const isOnAdmin = path.startsWith('/admin')

      if (isOnDashboard && targetPath !== '/dashboard') {
        window.location.href = targetPath
      } else if (isOnSenior && targetPath !== '/senior') {
        window.location.href = targetPath
      } else if (isOnAdmin && targetPath !== '/admin') {
        window.location.href = targetPath
      } else if (path === '/' || path === '/seniors') {
        // If login modal was open, we assume they just logged in -> close modal
        if (loginModalOpen) {
          setLoginModalOpen(false)
          localStorage.removeItem('sahi_seat_login_role') // clean up local storage
          if (targetPath === '/admin' || targetPath === '/senior') {
            window.location.href = targetPath
          }
        }
      }
    }

    handleRouting()
  }, [user, profile, loading])

  const signInWithGoogle = async (role) => {
    const callbackUrl = new URL(`${window.location.origin}/auth/callback`)
    if (role) {
      callbackUrl.searchParams.set('role', role)
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl.toString(),
      },
    })
    if (error) throw error
  }

  const signInWithOtp = async (email) => {
    const callbackUrl = new URL(`${window.location.origin}/auth/callback`)
    callbackUrl.searchParams.set('role', 'student')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: callbackUrl.toString(),
      },
    })
    if (error) throw error
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    localStorage.removeItem('sahi_seat_login_role')
    localStorage.removeItem('sahiseat_preferences') // Securely clear preferences on logout
    window.location.href = '/'
  }

  const openLoginModal = (onSuccess) => {
    if (onSuccess) {
      setPendingAction(() => onSuccess)
    } else {
      setPendingAction(null)
    }
    setLoginModalOpen(true)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        loginModalOpen,
        setLoginModalOpen,
        signInWithGoogle,
        signInWithOtp,
        logout,
        openLoginModal,
        authError,
        setAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
