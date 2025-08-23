import { test, expect } from '@playwright/test';

test.describe('🔐 Authentication Flow - Browser E2E Tests', () => {
  const API_BASE = 'http://localhost:3000/v1';
  
  // Test user credentials
  const testUser = {
    email: 'browser.test@example.com',
    password: 'BrowserTest123!',
    name: 'Browser Test User'
  };

  const adminUser = {
    email: 'admin.browser@example.com', 
    password: 'AdminBrowser123!',
    name: 'Admin Browser User'
  };

  test.beforeAll('Set up test environment', async ({ request }) => {
    // Clean up existing test users
    try {
      await request.delete(`${API_BASE}/users/cleanup-test-users`);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  test('🎯 User Registration Flow', async ({ request, page }) => {
    // Test user registration via API
    const registerResponse = await request.post(`${API_BASE}/auth/register`, {
      data: testUser
    });
    
    expect(registerResponse.status()).toBe(201);
    const registerResult = await registerResponse.json();
    expect(registerResult).toHaveProperty('access_token');
    expect(registerResult).toHaveProperty('user');
    expect(registerResult.user.email).toBe(testUser.email);
  });

  test('🎯 User Login Flow', async ({ request, page }) => {
    // Ensure user exists first
    await request.post(`${API_BASE}/auth/register`, {
      data: testUser
    });

    // Test login via API
    const loginResponse = await request.post(`${API_BASE}/auth/login`, {
      data: {
        email: testUser.email,
        password: testUser.password
      }
    });

    expect(loginResponse.status()).toBe(200);
    const loginResult = await loginResponse.json();
    expect(loginResult).toHaveProperty('access_token');
    expect(loginResult).toHaveProperty('user');
    expect(loginResult.user.email).toBe(testUser.email);
  });

  test('🎯 Admin Registration and Login Flow', async ({ request }) => {
    // Register admin user
    const adminRegisterResponse = await request.post(`${API_BASE}/auth/register`, {
      data: {
        ...adminUser,
        role: 'admin'
      }
    });

    expect(adminRegisterResponse.status()).toBe(201);
    const adminRegisterResult = await adminRegisterResponse.json();
    expect(adminRegisterResult.user.role).toBe('admin');

    // Login as admin
    const adminLoginResponse = await request.post(`${API_BASE}/auth/login`, {
      data: {
        email: adminUser.email,
        password: adminUser.password
      }
    });

    expect(adminLoginResponse.status()).toBe(200);
    const adminLoginResult = await adminLoginResponse.json();
    expect(adminLoginResult.user.role).toBe('admin');
  });

  test('🎯 JWT Token Validation', async ({ request }) => {
    // Login to get token
    const loginResponse = await request.post(`${API_BASE}/auth/login`, {
      data: {
        email: testUser.email,
        password: testUser.password
      }
    });

    const { access_token } = await loginResponse.json();

    // Test protected endpoint with valid token
    const profileResponse = await request.get(`${API_BASE}/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });

    expect(profileResponse.status()).toBe(200);
    const profile = await profileResponse.json();
    expect(profile.email).toBe(testUser.email);
  });

  test('🎯 Protected Route Access Control', async ({ request }) => {
    // Test access without token
    const unauthorizedResponse = await request.get(`${API_BASE}/auth/profile`);
    expect(unauthorizedResponse.status()).toBe(401);

    // Test access with invalid token
    const invalidTokenResponse = await request.get(`${API_BASE}/auth/profile`, {
      headers: {
        'Authorization': 'Bearer invalid-token'
      }
    });
    expect(invalidTokenResponse.status()).toBe(401);
  });

  test('🎯 Role-Based Access Control (RBAC)', async ({ request }) => {
    // Get admin token
    await request.post(`${API_BASE}/auth/register`, {
      data: {
        ...adminUser,
        role: 'admin'
      }
    });

    const adminLoginResponse = await request.post(`${API_BASE}/auth/login`, {
      data: {
        email: adminUser.email,
        password: adminUser.password
      }
    });

    const { access_token: adminToken } = await adminLoginResponse.json();

    // Get regular user token
    const userLoginResponse = await request.post(`${API_BASE}/auth/login`, {
      data: {
        email: testUser.email,
        password: testUser.password
      }
    });

    const { access_token: userToken } = await userLoginResponse.json();

    // Test admin-only endpoint with admin token
    const adminEndpointResponse = await request.get(`${API_BASE}/analytics/dashboard`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    expect(adminEndpointResponse.status()).toBe(200);

    // Test admin-only endpoint with user token (should fail)
    const userToAdminResponse = await request.get(`${API_BASE}/analytics/dashboard`, {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });
    expect(userToAdminResponse.status()).toBe(403);
  });

  test('🎯 Password Security Validation', async ({ request }) => {
    // Test weak password rejection
    const weakPasswordResponse = await request.post(`${API_BASE}/auth/register`, {
      data: {
        email: 'weak@example.com',
        password: '123',
        name: 'Weak Password User'
      }
    });
    expect(weakPasswordResponse.status()).toBe(400);

    // Test strong password acceptance
    const strongPasswordResponse = await request.post(`${API_BASE}/auth/register`, {
      data: {
        email: 'strong@example.com', 
        password: 'StrongPassword123!',
        name: 'Strong Password User'
      }
    });
    expect(strongPasswordResponse.status()).toBe(201);
  });

  test('🎯 Rate Limiting Protection', async ({ request }) => {
    const loginData = {
      email: 'nonexistent@example.com',
      password: 'wrongpassword'
    };

    // Make multiple failed login attempts
    const promises = Array(6).fill(null).map(() => 
      request.post(`${API_BASE}/auth/login`, { data: loginData })
    );

    const responses = await Promise.all(promises);
    
    // Check that rate limiting kicks in (429 Too Many Requests)
    const rateLimitedResponses = responses.filter(r => r.status() === 429);
    expect(rateLimitedResponses.length).toBeGreaterThan(0);
  });

  test('🎯 Health Check Endpoint Accessibility', async ({ request }) => {
    const healthResponse = await request.get(`${API_BASE}/health`);
    expect(healthResponse.status()).toBe(200);
    
    const healthData = await healthResponse.json();
    expect(healthData).toHaveProperty('status');
    expect(healthData.status).toBe('ok');
  });

  test.afterAll('Clean up test data', async ({ request }) => {
    // Clean up test users
    try {
      await request.delete(`${API_BASE}/users/cleanup-test-users`);
    } catch (error) {
      // Ignore cleanup errors
    }
  });
});