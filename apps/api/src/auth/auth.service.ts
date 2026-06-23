import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import type { Env } from '../config/env.validation';
import { PrismaService } from '../common/prisma/prisma.service';
import type { AuthenticatedUser, JwtPayload } from '../common/types/authenticated-user';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async register(dto: RegisterDto): Promise<AuthenticatedUser> {
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Email is already registered');
    }
    const passwordHash = await bcrypt.hash(
      dto.password,
      this.config.get('BCRYPT_COST', { infer: true }),
    );
    const user = await this.prisma.user.create({ data: { email, passwordHash } });
    return { id: user.id, email: user.email };
  }

  async validateCredentials(dto: LoginDto): Promise<AuthenticatedUser> {
    const email = dto.email.toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const matches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return { id: user.id, email: user.email };
  }

  async issueToken(user: AuthenticatedUser): Promise<string> {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    return this.jwt.signAsync(payload);
  }
}
