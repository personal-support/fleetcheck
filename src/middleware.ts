import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/login', '/login-cpf', '/cadastro', '/esqueci-senha', '/recuperar-senha', '/selecionar-perfil', '/definir-senha', '/auth/callback', '/admin/solicitar-acesso', '/check/veiculo', '/manual.html']
const ADMIN_ROUTES = ['/admin']
const DRIVER_ROUTES = ['/check']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes and API routes
  if (PUBLIC_ROUTES.some(r => pathname.startsWith(r)) || pathname.startsWith('/api/') || pathname.startsWith('/_next/')) {
    return NextResponse.next()
  }

  const response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Not logged in → /login
  if (!user) return NextResponse.redirect(new URL('/login', request.url))

  // Get role from users table
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = userData?.role ?? 'driver'

  // Driver trying to access /admin → redirect to checklist
  if (role === 'driver' && ADMIN_ROUTES.some(r => pathname.startsWith(r))) {
    return NextResponse.redirect(new URL('/check/selecionar', request.url))
  }

  // Root path → redirect by role
  if (pathname === '/') {
    return NextResponse.redirect(new URL(role === 'admin' ? '/admin' : '/check/selecionar', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|icons|favicon.ico|manifest.json|sw.js|LOGO_CONSULDATA.png).*)'],
}
