import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { faker } from '@faker-js/faker';
import { User, UserRole, UserPlan, UserStatus } from '../../users/entities/user.entity';

export async function seedUsers(dataSource: DataSource): Promise<void> {
  const userRepository = dataSource.getRepository(User);

  const users: Partial<User>[] = [];

  // 管理者アカウント
  const adminPassword = await bcrypt.hash('admin123', 10);
  users.push({
    name: 'Admin User',
    email: 'admin@sedori-platform.com',
    password: adminPassword,
    role: UserRole.ADMIN,
    plan: UserPlan.ENTERPRISE,
    status: UserStatus.ACTIVE,
    emailVerifiedAt: new Date(),
    lastLoginAt: new Date(),
    planStartedAt: new Date(),
    planExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    preferences: {
      theme: 'light',
      notifications: true,
      language: 'ja',
    },
    metadata: {
      source: 'seed',
      role: 'system_admin',
    },
  });

  // テスト用一般管理者
  const testAdminPassword = await bcrypt.hash('test123', 10);
  users.push({
    name: 'Test Admin',
    email: 'test.admin@example.com',
    password: testAdminPassword,
    role: UserRole.ADMIN,
    plan: UserPlan.PREMIUM,
    status: UserStatus.ACTIVE,
    emailVerifiedAt: new Date(),
    lastLoginAt: faker.date.recent({ days: 7 }),
    planStartedAt: faker.date.past({ years: 1 }),
    planExpiresAt: faker.date.future({ years: 1 }),
    phoneNumber: `${faker.string.numeric(3)}-${faker.string.numeric(4)}-${faker.string.numeric(4)}`,
    bio: 'Test administrator account for development purposes',
  });

  // モデレーターアカウント
  const moderatorPassword = await bcrypt.hash('mod123', 10);
  users.push({
    name: 'Moderator User',
    email: 'moderator@example.com',
    password: moderatorPassword,
    role: UserRole.MODERATOR,
    plan: UserPlan.PREMIUM,
    status: UserStatus.ACTIVE,
    emailVerifiedAt: new Date(),
    lastLoginAt: faker.date.recent({ days: 3 }),
    planStartedAt: faker.date.past({ years: 1 }),
    planExpiresAt: faker.date.future({ years: 1 }),
  });

  // 一般ユーザー（複数）
  for (let i = 0; i < 15; i++) {
    const userPassword = await bcrypt.hash('user123', 10);
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = faker.internet.email({ firstName, lastName });
    
    const planType = faker.helpers.weightedArrayElement([
      { weight: 60, value: UserPlan.FREE },
      { weight: 30, value: UserPlan.PREMIUM },
      { weight: 10, value: UserPlan.ENTERPRISE },
    ]);

    const status = faker.helpers.weightedArrayElement([
      { weight: 85, value: UserStatus.ACTIVE },
      { weight: 10, value: UserStatus.INACTIVE },
      { weight: 3, value: UserStatus.PENDING },
      { weight: 2, value: UserStatus.SUSPENDED },
    ]);

    users.push({
      name: `${firstName} ${lastName}`,
      email: email,
      password: userPassword,
      role: UserRole.USER,
      plan: planType,
      status: status,
      phoneNumber: faker.helpers.maybe(() => `${faker.string.numeric(3)}-${faker.string.numeric(4)}-${faker.string.numeric(4)}`, { probability: 0.7 }),
      dateOfBirth: faker.helpers.maybe(() => faker.date.birthdate({ min: 18, max: 65, mode: 'age' }), { probability: 0.6 }),
      gender: faker.helpers.maybe(() => faker.helpers.arrayElement(['male', 'female', 'other']), { probability: 0.5 }),
      bio: faker.helpers.maybe(() => faker.lorem.sentences({ min: 1, max: 3 }), { probability: 0.4 }),
      avatarUrl: faker.helpers.maybe(() => faker.image.avatar(), { probability: 0.3 }),
      emailVerifiedAt: status === UserStatus.ACTIVE ? faker.date.past({ years: 1 }) : undefined,
      lastLoginAt: status === UserStatus.ACTIVE ? faker.date.recent({ days: 30 }) : undefined,
      planStartedAt: planType !== UserPlan.FREE ? faker.date.past({ years: 1 }) : undefined,
      planExpiresAt: planType !== UserPlan.FREE ? faker.date.future({ years: 1 }) : undefined,
      preferences: {
        theme: faker.helpers.arrayElement(['light', 'dark']),
        notifications: faker.datatype.boolean(),
        language: faker.helpers.arrayElement(['ja', 'en']),
        currency: 'JPY',
      },
      metadata: {
        source: 'seed',
        registrationMethod: faker.helpers.arrayElement(['email', 'google', 'facebook']),
        deviceType: faker.helpers.arrayElement(['desktop', 'mobile', 'tablet']),
      },
    });
  }

  // ユーザーを作成
  for (const userData of users) {
    const user = userRepository.create(userData);
    await userRepository.save(user);
  }

  console.log(`✅ Users seeded successfully (${users.length} users created)`);
  console.log('📧 Test accounts:');
  console.log('  Admin: admin@sedori-platform.com / admin123');
  console.log('  Test Admin: test.admin@example.com / test123');
  console.log('  Moderator: moderator@example.com / mod123');
  console.log('  General Users: user123 (password for all)');
}