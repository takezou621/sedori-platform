import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Call the backend dev-login API
    const response = await fetch('http://localhost:3000/api/auth/dev-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies from backend
      body: JSON.stringify({
        email,
        password,
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: 'Dev login failed' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Create response with cookies
    const nextResponse = NextResponse.json({
      success: true,
      user: data.user,
    });

    // Forward the HTTP-only cookies from backend to frontend
    // Get all set-cookie headers from the backend response
    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
      // Backend should set both accessToken and any other cookies
      nextResponse.headers.set('set-cookie', setCookieHeader);
    }

    // Store minimal user info in secure cookie
    if (data.user) {
      const userSession = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
        plan: data.user.plan,
        status: data.user.status
      };
      nextResponse.cookies.set('user_session', JSON.stringify(userSession), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });
    }

    return nextResponse;
  } catch (error) {
    console.error('Dev login error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}