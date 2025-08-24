import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // バックエンドのAPIに直接リクエスト（サーバーサイドから）
    const backendResponse = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: body.name,
        email: body.email,
        password: body.password,
      }),
    });

    const data = await backendResponse.json();
    
    if (!backendResponse.ok) {
      return NextResponse.json(data, { status: backendResponse.status });
    }

    // 成功した場合、レスポンスにCookieを設定
    const response = NextResponse.json(data);
    
    if (data.accessToken) {
      response.cookies.set('auth_token', data.accessToken, {
        httpOnly: false, // フロントエンドからもアクセス可能にする
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });
    }

    if (data.user) {
      response.cookies.set('user_data', JSON.stringify(data.user), {
        httpOnly: false, // フロントエンドからもアクセス可能にする
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });
    }

    return response;
  } catch (error) {
    console.error('Dev register proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}