// src/infrastructure/habitaciones/dtos/update-habitacion.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateHabitacionDto } from './create-habitacion.dto';
import { IsEnum, IsOptional } from 'class-validator';

export class UpdateHabitacionDto extends PartialType(CreateHabitacionDto) {
  @IsEnum(['disponible', 'ocupado', 'limpieza'])
  @IsOptional()
  estado?: 'disponible' | 'ocupado' | 'limpieza';
}