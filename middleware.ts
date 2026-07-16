import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isSupabaseConfigured, getSupabaseEnv } from '@/lib/supabase/env';
import { isPrivatePath } from '@/lib/seo/site';

const PROTECTED_PATHS = [
  '/dashboard',
  '/upload',
  '/analysis',
  '/miop',
  '/comparator',
  '/calendar',
  '/settings',
  '/jubilacion',
  '/prestaciones',
  '/vida-laboral',
  '/futuro',
  '/asesoria',
  '/revision-internacional',
  '/informes',
];

function withSecurityHeaders(response: NextResponse, pathname: string) {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
  );

  if (isPrivatePath(pathname)) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
    response.headers.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
  }

  return response;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isProtected = PROTECTED_PATHS.some((path) => pathname.startsWith(path));

  if (!isSupabaseConfigured()) {
    if (isProtected) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('error', 'supabase_not_configured');
      return withSecurityHeaders(NextResponse.redirect(url), pathname);
    }
    return withSecurityHeaders(NextResponse.next(), pathname);
  }

  let supabaseResponse = NextResponse.next({ request });

  const { url, anonKey } = getSupabaseEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return withSecurityHeaders(NextResponse.redirect(url), pathname);
  }

  if (user && pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return withSecurityHeaders(NextResponse.redirect(url), pathname);
  }

  return withSecurityHeaders(supabaseResponse, pathname);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
