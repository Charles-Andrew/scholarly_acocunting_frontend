import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

console.log('🔐 Middleware loaded');

const protectedRoutes = ['/dashboard'];
const publicRoutes = ['/login', '/signup', '/auth/callback'];

export async function middleware(request: NextRequest) {
  console.log('🔐 Middleware running for:', request.nextUrl.pathname);

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Get session - this also refreshes the token
  const { data: { session } } = await supabase.auth.getSession();
  console.log('🔐 Session exists:', !!session);

  const pathname = request.nextUrl.pathname;

  // Handle root route - redirect based on auth status
  if (pathname === '/') {
    if (session) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    } else {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Redirect unauthenticated users from protected routes
  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    if (!session) {
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Redirect authenticated users away from public auth routes
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    if (session) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Match all routes including root
    '/',
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
