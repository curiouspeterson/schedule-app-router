import { createClient } from '@/lib/supabase/client'

export function useSignOut() {
  const supabase = createClient()

  const signOut = async () => {
    try {
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        // If we have a session, try to sign out
        const { error } = await supabase.auth.signOut()
        if (error) console.error('Error signing out:', error)
      }
      
      // Clear all storage and cache
      if (typeof window !== 'undefined') {
        window.localStorage.clear()
        window.sessionStorage.clear()
        // Clear cookies
        document.cookie.split(';').forEach(cookie => {
          document.cookie = cookie.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/')
        })
      }
      
      // Force reload to clear any remaining state
      window.location.href = '/login'
    } catch (error) {
      console.error('Error in sign out process:', error)
      // Still try to redirect even if there's an error
      window.location.href = '/login'
    }
  }

  return { signOut }
} 