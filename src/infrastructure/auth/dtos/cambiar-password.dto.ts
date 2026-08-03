import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class CambiarPasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'La contraseña actual es obligatoria.' })
  passwordActual!: string;

  @IsString()
  @IsNotEmpty({ message: 'La nueva contraseña es obligatoria.' })
  @MinLength(8, { message: 'La nueva contraseña debe tener al menos 8 caracteres.' })
  nuevaPassword!: string;
}
