import { IsEmail, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'El correo no es válido' })
  correo: string;

  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  contraseña: string;
}