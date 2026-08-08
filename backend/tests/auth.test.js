const request = require('supertest');
const app = require('../server');

describe('Auth API Integration Tests', () => {
  const testUser = {
    name: 'Test Investor',
    email: `test_${Date.now()}@example.com`,
    password: 'Password123!'
  };

  it('should register a new user successfully', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.statusCode).toEqual(201);
    expect(res.body.success).toBe(true);
    expect(res.body.tokens).toHaveProperty('accessToken');
    expect(res.body.user.email).toEqual(testUser.email.toLowerCase());
  });

  it('should reject registration with duplicate email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.statusCode).toEqual(400);
    expect(res.body.success).toBe(false);
  });

  it('should authenticate registered user and return JWT', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.tokens).toHaveProperty('accessToken');
  });

  it('should reject login with wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'WrongPassword'
      });

    expect(res.statusCode).toEqual(401);
    expect(res.body.success).toBe(false);
  });
});
