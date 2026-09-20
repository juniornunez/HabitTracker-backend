import { IsDateString, IsOptional } from 'class-validator';

export class ToggleCompletionDto {
  // Si no se manda, se usa la fecha de hoy.
  @IsOptional()
  @IsDateString({}, { message: 'La fecha debe ser una fecha válida' })
  fecha?: string;
}