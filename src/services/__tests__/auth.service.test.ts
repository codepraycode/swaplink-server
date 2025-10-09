import bcrypt from 'bcryptjs';
import { TestUtils } from '../../test/utils';
import { AuthService } from '../auth.service';
import prisma from '../../utils/database';

describe('AuthService', () => {
    let authService: AuthService;

    beforeEach(() => {
        authService = new AuthService('AUTHSERVICE TEST');
    });

    describe('register', () => {
        it('should register a new user successfully', async () => {
            const userData = TestUtils.generateUserData();

            const result = await authService.register(userData);

            expect(result.user).toHaveProperty('id');
            expect(result.user.email).toBe(userData.email);
            expect(result.user.phone).toBe(userData.phone);
            expect(result.token).toBeDefined();
            expect(result.refreshToken).toBeDefined();

            // Verify user was created in database
            const dbUser = await prisma.user.findUnique({
                where: { email: userData.email },
            });
            expect(dbUser).toBeTruthy();
            expect(dbUser?.firstName).toBe(userData.firstName);
        });

        it('should throw error if email already exists', async () => {
            const userData = TestUtils.generateUserData();
            await TestUtils.createUser(userData);

            await expect(authService.register(userData)).rejects.toThrow(
                'User with this email or phone already exists'
            );
        });

        it('should create wallets for new user', async () => {
            const userData = TestUtils.generateUserData();

            const result = await authService.register(userData);

            const wallets = await prisma.wallet.findMany({
                where: { userId: result.user.id },
            });

            expect(wallets).toHaveLength(2);
            expect(wallets.find(w => w.currency === 'USD')).toBeTruthy();
            expect(wallets.find(w => w.currency === 'NGN')).toBeTruthy();
        });
    });

    describe('login', () => {
        it('should login user with valid credentials', async () => {
            const userData = TestUtils.generateUserData();
            const user = await TestUtils.createUser(userData);

            const result = await authService.login({
                email: userData.email,
                password: userData.password,
            });

            expect(result.user.id).toBe(user.id);
            expect(result.token).toBeTruthy();
        });

        it('should throw error with invalid password', async () => {
            const userData = TestUtils.generateUserData();
            await TestUtils.createUser(userData);

            await expect(
                authService.login({
                    email: userData.email,
                    password: 'WrongPassword123!',
                })
            ).rejects.toThrow('Invalid email or password');
        });

        it('should throw error with non-existent email', async () => {
            await expect(
                authService.login({
                    email: 'nonexistent@example.com',
                    password: 'Password123!',
                })
            ).rejects.toThrow('Invalid email or password');
        });
    });
});
