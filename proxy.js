import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function proxy(request) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  if (!supabaseUrl || !supabaseAnonKey || supabaseAnonKey === 'YOUR_SUPABASE_ANON_KEY') {
    return response
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        } catch (err) {
          // ignore set errors during server components render
        }
      },
    },
  })

  // Get current user session safely
  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  const isDashboard = path.startsWith('/dashboard')
  const isSenior = path.startsWith('/senior') && !path.startsWith('/seniors')
  const isAdmin = path.startsWith('/admin')

  // 1. Guard against unauthenticated users trying to access protected paths
  if (!user && (isDashboard || isSenior || isAdmin)) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (user) {
    // Query role from profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role || 'student'

    // Admin pages protection
    if (isAdmin && role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // Senior/Mentor pages protection
    if (isSenior && role !== 'senior' && role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // Student dashboard page protection
    if (isDashboard && role !== 'student' && role !== 'admin') {
      if (role === 'senior') {
        return NextResponse.redirect(new URL('/senior', request.url))
      } else if (role === 'admin') {
        return NextResponse.redirect(new URL('/admin', request.url))
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Images/static assets ending in extensions
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
