const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');

const testMongoUri = 'mongodb://localhost:27017/codeanova_test_auth';

beforeAll(async () => {
  // Disconnect from default DB first if connected
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  await mongoose.connect(testMongoUri);
});

afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
});

beforeEach(async () => {
  await User.deleteMany({});
});

describe('Authentication Flow Integration Tests', () => {
  it('should successfully register a new user with attendee role', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Jane Doe',
        email: 'jane@test.com',
        password: 'password123',
        role: 'attendee',
      });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.email).toBe('jane@test.com');
    expect(res.body.role).toBe('attendee');
  });

  it('should fail to register user with already existing email', async () => {
    await User.create({
      name: 'John Test',
      email: 'john@test.com',
      password: 'password123',
      role: 'attendee',
    });

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'John Test Duplicate',
        email: 'john@test.com',
        password: 'password12345',
        role: 'attendee',
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('User already exists');
  });

  it('should authenticate user and return token on successful login', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Log User',
        email: 'login@test.com',
        password: 'password123',
        role: 'attendee',
      });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'login@test.com',
        password: 'password123',
      });

    expect(loginRes.statusCode).toBe(200);
    expect(loginRes.body).toHaveProperty('token');
    expect(loginRes.body.name).toBe('Log User');
  });
});
