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
        
        // Create secure response with HTTP-only cookies for registration
        const response = NextResponse.json({
          success: true,
          user: registerData.user,
          accessToken: registerData.accessToken,
        });
        
        if (registerData.accessToken) {
          response.cookies.set('auth_token', registerData.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/',
          });
        }

        if (registerData.user) {
          const userSession = {
            id: registerData.user.id,
            name: registerData.user.name,
            email: registerData.user.email,
            role: registerData.user.role,
            plan: registerData.user.plan,
            status: registerData.user.status
          };
          response.cookies.set('user_session', JSON.stringify(userSession), {
            httpOnly: true,
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

    // Create secure response with HTTP-only cookies  
    const response = NextResponse.json({
      success: true,
      user: data.user,
      accessToken: data.accessToken,
    });

    // Set secure HTTP-only cookies
    if (data.accessToken) {
      response.cookies.set('auth_token', data.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });
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
      response.cookies.set('user_session', JSON.stringify(userSession), {
        httpOnly: true,
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