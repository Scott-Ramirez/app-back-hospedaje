// Definimos la jerarquía: 'admin' (Total) > 'supervisor' (Intermedio) > 'recepcionista' (Operativo)
export type RolUsuario = 'admin' | 'supervisor' | 'recepcionista';

export class Usuario {
  // Campos opcionales para la recuperación de contraseña
  public resetPasswordToken?: string | null;
  public resetPasswordExpires?: Date | null;

  /**
   * Flag para forzar el cambio de contraseña en el siguiente inicio de sesión.
   * Se activa al crear un usuario vía seeder o registro de admin.
   */
  public debeChangiarPassword?: boolean;

  constructor(
    public readonly id: number,
    public readonly username: string,
    public readonly passwordHash: string,
    public readonly nombre: string,
    public readonly rol: RolUsuario,
    public readonly activo: boolean,
  ) {}
}