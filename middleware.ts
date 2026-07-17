import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

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
] as const;

const PRIVATE_PREFIXES = [
  ...PROTECTED_PATHS,
  '/api',
  '/login',
] as const;

function isConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    '';
  if (url.length < 10 || key.length < 10) return false;
  if (/xxxxx|\.\.\.|your-|tu-/i.test(url) || /xxxxx|\.\.\.|your-|tu-/i.test(key)) return false;
  return url.includes('supabase.co') || key.startsWith('eyJ') || key.startsWith('sb_publishable_');
}

function isPrivatePath(pathname: string): boolean {
  return PRIVATE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

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

function passThrough(request: NextRequest, pathname: string) {
  return withSecurityHeaders(NextResponse.next({ request }), pathname);
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  try {
    const isProtected = PROTECTED_PATHS.some((path) => pathname.startsWith(path));

    if (!isConfigured()) {
      if (isProtected) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        url.searchParams.set('error', 'supabase_not_configured');
        return withSecurityHeaders(NextResponse.redirect(url), pathname);
      }
      return passThrough(request, pathname);
    }

    let supabaseResponse = NextResponse.next({ request });
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim();
    const anonKey = (
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
      ''
    );

    const supabase = createServerClient(supabaseUrl, anonKey, {
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
  } catch (err) {
    // Nunca tumbar el sitio entero por un fallo de auth/edge
    console.error('middleware error:', err);
    return passThrough(request, pathname);
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|html|txt|xml)$).*)',
  ],
};
