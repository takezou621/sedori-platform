import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Get the pathname
  const { pathname } = request.nextUrl;

  // Define route access levels
  const protectedRoutes = ['/dashboard', '/products', '/analytics'];
  const adminOnlyRoutes = ['/admin', '/admin/beta'];
  const sellerRoutes = ['/seller']; // Future seller-specific routes
  const authRoutes = ['/auth/login', '/auth/register', '/login', '/register'];
  
  // Get auth token and user session from HTTP-only cookies
  const token = request.cookies.get('auth_token');
  const userSessionCookie = request.cookies.get('user_session');
  const isAuthenticated = !!token?.value;
  
  let user: any = null;
  if (userSessionCookie?.value) {
    try {
      const decodedValue = decodeURIComponent(userSessionCookie.value);
      user = JSON.parse(decodedValue);
    } catch (error) {
      console.error('Error parsing user session in middleware:', error);
      console.error('Raw cookie value:', userSessionCookie.value);
    }
  }

  // Check route types
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  );
  
  const isAdminOnlyRoute = adminOnlyRoutes.some(route => 
    pathname.startsWith(route)
  );
  
  const isSellerRoute = sellerRoutes.some(route => 
    pathname.startsWith(route)
  );
  
  const isAuthRoute = authRoutes.some(route => 
    pathname.startsWith(route)
  );

  // If user is not authenticated and tries to access protected route
  if ((isProtectedRoute || isAdminOnlyRoute || isSellerRoute) && !isAuthenticated) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If user is authenticated but tries to access admin route without admin role
  if (isAdminOnlyRoute && isAuthenticated) {
    console.log('Admin route check:', {
      pathname,
      isAuthenticated,
      user: user ? { email: user.email, role: user.role } : null,
      token: !!token?.value,
      userSessionCookie: !!userSessionCookie?.value
    });
    
    if (!user || user.role !== 'admin') {
      console.log('Access denied - redirecting to /not-found');
      const errorUrl = new URL('/not-found', request.url);
      return NextResponse.redirect(errorUrl);
    }
    
    console.log('Admin access granted');
  }

  // If user is authenticated but tries to access seller route without seller/admin role
  if (isSellerRoute && isAuthenticated) {
    if (!user || (user.role !== 'seller' && user.role !== 'admin')) {
      const errorUrl = new URL('/not-found', request.url);
      return NextResponse.redirect(errorUrl);
    }
  }

  // If user is authenticated and tries to access auth routes, redirect to dashboard
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};