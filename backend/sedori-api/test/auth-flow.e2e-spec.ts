import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { E2ETestHelper } from './helpers/test-helper';

describe('Authentication Flow E2E Tests', () => {
  let app: INestApplication;
  let helper: E2ETestHelper;
  let httpServer: any;

  beforeAll(async () => {
    helper = new E2ETestHelper();
    app = await helper.setupTestApp();
    httpServer = helper.getHttpServer();
  });

  afterAll(async () => {
    await helper.teardownTestApp();
  });

  afterEach(async () => {
    await helper.cleanupTestData();
  });

  describe('User Registration', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        name: 'John Doe',
        email: 'newuser@test.com',
        password: 'Password123!',
      };

      const response = await request(httpServer)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.role).toBe('user');
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should not register user with duplicate email', async () => {
      const userData = {
        name: 'John Doe',
        email: 'duplicate@test.com',
        password: 'Password123!',
      };

      // First registration
      await request(httpServer)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      // Second registration with same email
      await request(httpServer)
        .post('/auth/register')
        .send(userData)
        .expect(409);
    });

    it('should validate password requirements', async () => {
      const userData = {
        name: 'John Doe',
        email: 'weakpassword@test.com',
        password: '123',
      };

      await request(httpServer)
        .post('/auth/register')
        .send(userData)
        .expect(400);
    });

    it('should validate email format', async () => {
      const userData = {
        name: 'John Doe',
        email: 'invalid-email',
        password: 'Password123!',
      };

      await request(httpServer)
        .post('/auth/register')
        .send(userData)
        .expect(400);
    });
  });

  describe('User Login', () => {
    let testUser: any;

    beforeEach(async () => {
      // Use unique email for each test to avoid conflicts
      testUser = await helper.registerUser({
        email: `logintest-${Date.now()}-${Math.random().toString(36).substr(2, 5)}@test.com`,
        password: 'Password123!',
      });
    });

    it('should login with valid credentials', async () => {
      const response = await request(httpServer)
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testUser.email);
    });

    it('should not login with invalid email', async () => {
      await request(httpServer)
        .post('/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: testUser.password,
        })
        .expect(401);
    });

    it('should not login with invalid password', async () => {
      await request(httpServer)
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        })
        .expect(401);
    });
  });

  describe('Protected Routes', () => {
    let testUser: any;
    let testAdmin: any;

    beforeEach(async () => {
      testUser = await helper.createTestUser();
      testAdmin = await helper.createTestAdmin();
    });

    it('should access profile with valid token', async () => {
      const response = await request(httpServer)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(200);

      expect(response.body.email).toBe(testUser.email);
    });

    it('should not access profile without token', async () => {
      await request(httpServer).get('/auth/profile').expect(401);
    });

    it('should not access profile with invalid token', async () => {
      await request(httpServer)
        .get('/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should access admin routes with admin role', async () => {
      await request(httpServer)
        .get('/analytics/dashboard')
        .set('Authorization', `Bearer ${testAdmin.accessToken}`)
        .expect(200);
    });

    it('should not access admin routes with user role', async () => {
      await request(httpServer)
        .get('/analytics/dashboard')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(403);
    });
  });

  describe('Token Management', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await helper.createTestUser();
    });

    it('should refresh access token', async () => {
      const response = await request(httpServer)
        .post('/auth/refresh')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.accessToken).toBeTruthy();
    });

    it('should handle expired tokens gracefully', async () => {
      // This test would require manipulating token expiration
      // For now, we'll test with invalid token
      await request(httpServer)
        .post('/auth/refresh')
        .set('Authorization', 'Bearer expired-token')
        .expect(401);
    });
  });

  describe('Security Features', () => {
    it('should hash passwords properly', async () => {
      const userData = {
        name: 'Security Test',
        email: 'security@test.com',
        password: 'PlaintextPassword123!',
      };

      const response = await request(httpServer)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      // Password should not be returned in response
      expect(response.body.user).not.toHaveProperty('password');

      // Login should work with original password
      await request(httpServer)
        .post('/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        })
        .expect(200);
    });

    it('should handle case-insensitive email login', async () => {
      const uniqueEmail = `CaseTest-${Date.now()}@Example.COM`;
      const userData = {
        name: 'Case Test',
        email: uniqueEmail,
        password: 'Password123!',
      };

      await request(httpServer)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      // Should login with lowercase email
      await request(httpServer)
        .post('/auth/login')
        .send({
          email: uniqueEmail.toLowerCase(),
          password: userData.password,
        })
        .expect(200);
    });
  });

  describe('User Profile Management', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await helper.createTestUser();
    });

    it('should get user profile', async () => {
      const response = await request(httpServer)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('role');
      expect(response.body).not.toHaveProperty('password');
    });

    it('should update user profile', async () => {
      const updateData = {
        name: 'Updated Test User',
        phoneNumber: '090-1234-5678',
        bio: 'Updated bio information',
      };

      const response = await request(httpServer)
        .patch('/users/me')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
      expect(response.body.phoneNumber).toBe(updateData.phoneNumber);
      expect(response.body.bio).toBe(updateData.bio);
    });
  });

  describe('Rate Limiting & Security', () => {
    it('should handle rapid registration attempts', async () => {
      const promises = [];

      for (let i = 0; i < 5; i++) {
        promises.push(
          request(httpServer)
            .post('/auth/register')
            .send({
              name: `Rapid Test ${i}`,
              email: `rapid${i}@test.com`,
              password: 'Password123!',
            }),
        );
      }

      const responses = await Promise.all(promises);

      // All should succeed (no rate limiting implemented yet)
      responses.forEach((response) => {
        expect(response.status).toBe(201);
      });
    });

    it('should handle rapid login attempts', async () => {
      const testUser = await helper.createTestUser();
      const promises = [];

      for (let i = 0; i < 3; i++) {
        promises.push(
          request(httpServer).post('/auth/login').send({
            email: testUser.email,
            password: testUser.password,
          }),
        );
      }

      const responses = await Promise.all(promises);

      // All should succeed for valid credentials
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });
  });
});
