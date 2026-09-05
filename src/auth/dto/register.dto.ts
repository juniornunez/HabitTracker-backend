import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  nombre: string;

  @IsEmail({}, { message: 'El correo no es válido' })
  correo: string;

  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  contraseña: string;
}