import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { BadRequestException } from '@nestjs/common';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) {
      throw new BadRequestException('E-mail já cadastrado');
    }
    const user = await this.users.create(dto.name, dto.email, dto.password);
    const token = await this.sign(user.id, user.email);
    return { accessToken: token, user: { id: user.id, name: user.name, email: user.email } };
  }

  async login(dto: LoginDto) {
    const user = await this.users.findByEmail(dto.email, true);
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    const token = await this.sign(user.id, user.email);
    return { accessToken: token, user: { id: user.id, name: user.name, email: user.email } };
  }

  private sign(userId: string, email: string): Promise<string> {
    return this.jwt.signAsync({ sub: userId, email });
  }
}
