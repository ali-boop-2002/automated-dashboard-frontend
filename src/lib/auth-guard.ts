import { redirect } from '@tanstack/react-router'
import { supabase } from '@/lib/supabase'

export async function requireAuth() {
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    throw redirect({
      to: '/login',
      search: {
        redirect: window.location.pathname,
      },
    })
  }
  
  return session
}
