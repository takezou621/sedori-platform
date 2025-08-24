import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // バックエンドのAPIに直接リクエスト（サーバーサイドから）
    const backendResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: body.email,
        password: body.password,
      }),
    });

    const data = await backendResponse.json();
    
    if (!backendResponse.ok) {
      // アカウントが存在しない場合は自動登録を試行
      const registerResponse = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: body.email.split('@')[0], // Use email prefix as name
          email: body.email,
          password: body.password,
        }),
      });

      if (registerResponse.ok) {
        const registerData = await registerResponse.json();
        
        // 登録成功時にCookieを設定
        const response = NextResponse.json(registerData);
        
        if (registerData.accessToken) {
          response.cookies.set('auth_token', registerData.accessToken, {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/',
          });
        }

        if (registerData.user) {
          response.cookies.set('user_data', JSON.stringify(registerData.user), {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/',
          });
        }
        
        return response;
      } else {
        // 登録も失敗した場合は元のログインエラーを返す
        return NextResponse.json(data, { status: backendResponse.status });
      }
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
    console.error('Dev login proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}