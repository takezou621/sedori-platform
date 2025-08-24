import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('auth_token')?.value || cookieStore.get('accessToken')?.value;
    const userSessionCookie = cookieStore.get('user_session')?.value;
    
    // For dev-login, allow authentication with just user_session cookie
    if (!userSessionCookie) {
      return NextResponse.json({
        isAuthenticated: false,
        user: null
      });
    }
    
    // If we have a token but no user session, or vice versa for regular login
    if (!token && !userSessionCookie) {
      return NextResponse.json({
        isAuthenticated: false,
        user: null
      });
    }
    
    try {
      // URL decode the user session cookie value
      const decodedUserSession = decodeURIComponent(userSessionCookie);
      const user = JSON.parse(decodedUserSession);
      return NextResponse.json({
        isAuthenticated: true,
        user
      });
    } catch (parseError) {
      console.error('Error parsing user session:', parseError);
      return NextResponse.json({
        isAuthenticated: false,
        user: null
      });
    }
    
  } catch (error) {
    console.error('Auth me error:', error);
    return NextResponse.json(
      { 
        isAuthenticated: false, 
        user: null,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}