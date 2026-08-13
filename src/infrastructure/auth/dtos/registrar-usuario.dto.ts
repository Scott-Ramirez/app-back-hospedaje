import { IsString, IsNotEmpty, IsIn, IsOptional } from 'class-validator';
import { RolUsuario } from '../../../core/usuarios/entities/usuario.entity';

export class RegistrarUsuarioDto {
  @IsString({ message: 'El nombre de usuario debe ser un texto.' })
  @IsNotEmpty({ message: 'El nombre de usuario es obligatorio.' })
  username!: string;

  @IsString({ message: 'La clave debe ser un texto.' })
  @IsNotEmpty({ message: 'La clave es obligatoria.' })
  clave!: string;

  @IsString({ message: 'El nombre completo debe ser un texto.' })
  @IsNotEmpty({ message: 'El nombre completo es obligatorio.' })
  nombre!: string;

  @IsString({ message: 'El rol debe ser un texto.' })
  @IsNotEmpty({ message: 'El rol es obligatorio.' })
  @IsIn(['admin', 'supervisor', 'recepcionista'], {
    message: 'El rol enviado no es válido. Debe ser admin, supervisor o recepcionista.',
  })
  rol!: string; // <-- ¡CORRECCIÓN: Cambiado de RolUsuario a string para evitar el error de metadatos!

  @IsString({ message: 'La hora de inicio de turno debe ser texto.' })
  @IsOptional()
  horaInicioTurno?: string;

  @IsString({ message: 'La hora de fin de turno debe ser texto.' })
  @IsOptional()
  horaFinTurno?: string;
}