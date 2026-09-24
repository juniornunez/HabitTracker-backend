import { IsEmail, IsNotEmpty, Matches, MinLength } from 'class-validator';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).+$/;

export class RegisterDto {
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  nombre: string;

  @IsEmail({}, { message: 'El correo no es válido' })
  correo: string;

  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  @Matches(PASSWORD_REGEX, {
    message:
      'La contraseña debe tener al menos una mayúscula, una minúscula y un carácter especial',
  })
  contraseña: string;
}