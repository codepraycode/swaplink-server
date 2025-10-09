// src/routes/__tests__/auth.test.ts
import request from 'supertest';
import app from '../../server';
import { TestUtils } from '../../test/utils';
import prisma from '../../utils/database';

describe('Auth Routes', () => {
    beforeEach(async () => {
        await TestUtils.cleanup();
    });

    describe('POST /api/v1/auth/register', () => {
        it('should register a new user', async () => {
            const userData = TestUtils.generateUserData();

            const response = await request(app)
                .post('/api/v1/auth/register')
                .send(userData)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.user.email).toBe(userData.email);
            expect(response.body.data.tokens.accessToken).toBeTruthy();

            // Verify user was created in database
            const dbUser = await prisma.user.findUnique({
                where: { email: userData.email },
            });
            expect(dbUser).toBeTruthy();
        });

        it('should return 400 for duplicate email', async () => {
            const userData = TestUtils.generateUserData();
            await TestUtils.createUser(userData);

            const response = await request(app)
                .post('/api/v1/auth/register')
                .send(userData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('already exists');
        });

        it('should return 400 for missing required fields', async () => {
            const response = await request(app)
                .post('/api/v1/auth/register')
                .send({ email: 'test@example.com' })
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    describe('POST /api/v1/auth/login', () => {
        it('should login with valid credentials', async () => {
            const userData = TestUtils.generateUserData();
            await TestUtils.createUser(userData);

            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: userData.email,
                    password: userData.password,
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.user.email).toBe(userData.email);
            expect(response.body.data.tokens.accessToken).toBeTruthy();
        });

        it('should return 401 for invalid credentials', async () => {
            const userData = TestUtils.generateUserData();
            await TestUtils.createUser(userData);

            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: userData.email,
                    password: 'wrongpassword',
                })
                .expect(401);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Invalid email or password');
        });
    });

    describe('GET /api/v1/auth/me', () => {
        it('should return user profile with valid token', async () => {
            const { user } = await TestUtils.createUserWithWallets();
            const token = TestUtils.generateAuthToken(user.id);

            const response = await request(app)
                .get('/api/v1/auth/me')
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.user.id).toBe(user.id);
            expect(response.body.data.user.email).toBe(user.email);
        });

        it('should return 401 without token', async () => {
            await request(app).get('/api/v1/auth/me').expect(401);
        });

        it('should return 401 with invalid token', async () => {
            await request(app)
                .get('/api/v1/auth/me')
                .set('Authorization', 'Bearer invalid-token')
                .expect(401);
        });
    });
});
