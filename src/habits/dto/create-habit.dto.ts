import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Frecuencia, Categoria } from '../schemas/habit.schema';

export class CreateHabitDto {
  @IsNotEmpty({ message: 'El nombre del hábito es obligatorio' })
  @IsString()
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsEnum(Categoria, {
    message: 'La categoría debe ser Salud, Bienestar, Educación o Productividad',
  })
  categoria?: Categoria;

  @IsEnum(Frecuencia, { message: 'La frecuencia debe ser diario, semanal o personalizada' })
  frecuencia: Frecuencia;

  @IsOptional()
  @IsArray()
  diasPersonalizados?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  prioridad?: number;

  @IsDateString({}, { message: 'La fecha de inicio debe ser una fecha válida' })
  fechaInicio: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de fin debe ser una fecha válida' })
  fechaFin?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}