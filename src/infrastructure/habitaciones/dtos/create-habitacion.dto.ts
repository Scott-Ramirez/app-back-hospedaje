import { IsNotEmpty, IsString, IsEnum, IsBoolean, IsNumber, IsOptional, Matches, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateHabitacionDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]+$/, { message: 'El número de habitación debe ser numérico' })
  numero!: string;

  @IsEnum(['simple', 'matrimonial'], {
    message: 'El tipo debe ser simple o matrimonial',
  })
  @IsNotEmpty()
  tipo!: 'simple' | 'matrimonial';

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true) // Convierte "true" de un form a booleano
  aire_acondicionado?: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  wifi?: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  ventilador?: boolean;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsNotEmpty()
  @Min(0, { message: 'El precio no puede ser negativo' })
  @Transform(({ value }) => parseFloat(value)) // Asegura que el precio sea número aunque venga de un form
  precio!: number;
}