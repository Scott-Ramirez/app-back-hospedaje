import { IsNotEmpty, IsString, Length, IsOptional, Matches, ValidateIf } from 'class-validator';

export class CreateHuespedDto {
  @IsString({ message: 'El nombre debe ser un texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @Length(2, 150, { message: 'El nombre debe tener entre 2 y 150 caracteres' })
  nombre!: string;

  @IsString({ message: 'El DNI debe ser un texto' })
  @IsNotEmpty({ message: 'El DNI es obligatorio' })
  @Matches(/^[0-9]+$/, { message: 'El DNI debe contener solo números' })
  @Length(8, 8, { message: 'El DNI debe tener exactamente 8 caracteres' })
  dni!: string;

  @IsOptional()
  @ValidateIf((o) => typeof o.celular === 'string' && o.celular.trim().length > 0)
  @Matches(/^[0-9]+$/, { message: 'El celular debe contener solo números' })
  @Length(9, 9, { message: 'El celular debe tener 9 caracteres' })
  celular?: string;
}