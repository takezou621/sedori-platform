import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.userRepository.create(createUserDto);
    return this.userRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      select: ['id', 'name', 'email', 'role', 'plan', 'status', 'createdAt', 'updatedAt'],
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.createdAt', 
        'user.updatedAt',
        'user.deletedAt',
        'user.name',
        'user.email',
        'user.password',
        'user.role',
        'user.plan', 
        'user.status',
        'user.phoneNumber',
        'user.dateOfBirth',
        'user.gender',
        'user.bio',
        'user.avatarUrl',
        'user.lastLoginAt',
        'user.emailVerifiedAt',
        'user.emailVerificationToken',
        'user.passwordResetToken',
        'user.passwordResetExpiresAt',
        'user.planStartedAt',
        'user.planExpiresAt',
        'user.preferences',
        'user.metadata'
      ])
      .where('user.id = :id', { id })
      .getOne();
  }

  async findByEmail(email: string): Promise<User | null> {
    // Use raw query to ensure password field is included
    const result = await this.userRepository.query(
      'SELECT * FROM users WHERE email = $1 AND "deletedAt" IS NULL LIMIT 1',
      [email]
    );
    
    if (result.length === 0) {
      return null;
    }
    
    // Convert the raw result to User entity - handle snake_case to camelCase
    const userData = result[0];
    const user = new User();
    Object.assign(user, {
      id: userData.id,
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt,
      deletedAt: userData.deletedAt,
      name: userData.name,
      email: userData.email,
      password: userData.password,
      role: userData.role,
      plan: userData.plan,
      status: userData.status,
      phoneNumber: userData.phoneNumber,
      dateOfBirth: userData.dateOfBirth,
      gender: userData.gender,
      bio: userData.bio,
      avatarUrl: userData.avatarUrl,
      lastLoginAt: userData.lastLoginAt,
      emailVerifiedAt: userData.emailVerifiedAt,
      emailVerificationToken: userData.emailVerificationToken,
      passwordResetToken: userData.passwordResetToken,
      passwordResetExpiresAt: userData.passwordResetExpiresAt,
      planStartedAt: userData.planStartedAt,
      planExpiresAt: userData.planExpiresAt,
      preferences: userData.preferences,
      metadata: userData.metadata
    });
    
    // Debug: verify password is included
    console.log('Raw password from DB:', userData.password);
    console.log('User entity password:', user.password);
    
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('ユーザーが見つかりません');
    }

    Object.assign(user, updateUserDto);
    return this.userRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const result = await this.userRepository.softDelete(id);
    if (result.affected === 0) {
      throw new NotFoundException('ユーザーが見つかりません');
    }
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.userRepository.update(id, { lastLoginAt: new Date() });
  }
}