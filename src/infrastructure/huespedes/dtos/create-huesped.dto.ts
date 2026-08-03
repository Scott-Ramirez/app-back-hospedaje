import { IsNotEmpty, IsString, Length, IsOptional, Matches } from 'class-validator';

export class CreateHuespedDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 150)
  nombre!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]+$/, { message: 'El DNI debe contener solo números' })
  @Length(8, 8, { message: 'El DNI debe tener exactamente 8 caracteres' })
  dni!: string;

  @IsString()
  @IsOptional()
  @Matches(/^[0-9]+$/, { message: 'El celular debe contener solo números' })
  @Length(9, 9, { message: 'El celular debe tener 9 caracteres' })
  celular?: string;

}