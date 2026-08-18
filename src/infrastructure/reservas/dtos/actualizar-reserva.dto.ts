import { PartialType } from '@nestjs/mapped-types';
import { CrearReservaDto } from './crear-reserva.dto';
import { IsEnum, IsOptional } from 'class-validator';

export class ActualizarReservaDto extends PartialType(CrearReservaDto) {
  @IsEnum(['pendiente', 'confirmada', 'completada', 'cancelada'])
  @IsOptional()
  estado?: 'pendiente' | 'confirmada' | 'completada' | 'cancelada';
}
