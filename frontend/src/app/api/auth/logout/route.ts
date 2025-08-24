import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;

    // Forward the logout request to the backend if token exists
    if (token) {
      try {
        await fetch(`${API_BASE_URL}/v1/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        // Even if backend logout fails, we'll clear cookies
        console.error('Backend logout failed:', error);
      }
    }

    // Create the response
    const nextResponse = NextResponse.json({ success: true, message: 'Logged out successfully' });

    // Clear the authentication cookies
    nextResponse.cookies.delete('auth_token');
    nextResponse.cookies.delete('user_session');

    return nextResponse;
  } catch (error) {
    console.error('Logout API error:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: 'Logout failed' },
      { status: 500 }
    );
  }
}