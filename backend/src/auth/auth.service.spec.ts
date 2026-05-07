import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  const users = {
    findByEmail: jest.fn(),
    create: jest.fn(),
  };
  const jwt = { signAsync: jest.fn().mockResolvedValue('jwt-token') };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: users },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  it('register cria usuário e retorna token', async () => {
    users.findByEmail.mockResolvedValue(null);
    users.create.mockResolvedValue({ id: 'u1', email: 'a@b.com', name: 'A' });
    const res = await service.register({
      name: 'A',
      email: 'a@b.com',
      password: 'secret1',
    });
    expect(res.accessToken).toBe('jwt-token');
    expect(users.create).toHaveBeenCalled();
    expect(jwt.signAsync).toHaveBeenCalledWith({ sub: 'u1', email: 'a@b.com' });
  });

  it('login compara senha e retorna token', async () => {
    users.findByEmail.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      password: 'hash',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    const res = await service.login({ email: 'a@b.com', password: 'secret1' });
    expect(res.accessToken).toBe('jwt-token');
    expect(bcrypt.compare).toHaveBeenCalledWith('secret1', 'hash');
  });
});
