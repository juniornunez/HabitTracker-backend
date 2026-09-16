import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const SALT_ROUNDS = 10;

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

    // Generamos la sal de forma explícita antes de hashear la contraseña.
    // bcrypt combina esta sal aleatoria con la contraseña para que dos
    // usuarios con la misma contraseña nunca terminen con el mismo hash.
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(dto.contraseña, salt);

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

    // bcrypt.compare extrae la sal ya guardada dentro del hash y la
    // vuelve a aplicar sobre la contraseña recibida para comparar.
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