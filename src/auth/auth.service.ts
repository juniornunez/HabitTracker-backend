import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(dto.correo);
    if (existingUser) {
      throw new ConflictException('Ya existe una cuenta con ese correo');
    }

    const hashedPassword = await bcrypt.hash(dto.contraseña, 10);
    const user = await this.usersService.create({
      nombre: dto.nombre,
      correo: dto.correo,
      contraseña: hashedPassword,
    });

    return this.buildAuthResponse(user._id.toString(), user.correo, user.nombre);
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.correo);
    if (!user) {
      throw new UnauthorizedException('Correo o contraseña incorrectos');
    }

    const isPasswordValid = await bcrypt.compare(dto.contraseña, user.contraseña);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Correo o contraseña incorrectos');
    }

    return this.buildAuthResponse(user._id.toString(), user.correo, user.nombre);
  }

  private buildAuthResponse(userId: string, correo: string, nombre: string) {
    const payload = { sub: userId, correo };
    return {
      access_token: this.jwtService.sign(payload),
      user: { id: userId, nombre, correo },
    };
  }
}