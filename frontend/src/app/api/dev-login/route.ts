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
      accessToken: data.accessToken,
    });

    // Set cookies
    if (data.accessToken) {
      nextResponse.cookies.set('auth_token', data.accessToken, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });
    }

    if (data.user) {
      nextResponse.cookies.set('user_data', JSON.stringify(data.user), {
        httpOnly: false,
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