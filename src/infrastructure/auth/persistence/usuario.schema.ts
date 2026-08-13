import { EntitySchema } from 'typeorm';
import { Usuario } from '../../../core/usuarios/entities/usuario.entity';

export const UsuarioSchema = new EntitySchema<Usuario>({
  name: 'Usuario',
  tableName: 'usuarios',
  target: Usuario,
  columns: {
    id: {
      type: Number,
      primary: true,
      generated: true,
    },
    username: {
      type: String,
      unique: true,
      length: 50,
    },
    passwordHash: {
      type: String,
      name: 'password_hash',
    },
    nombre: {
      type: String,
      length: 100,
    },
    rol: {
      type: String,
      length: 20,
    },
    activo: {
      type: Boolean,
      default: true,
    },
    // ---- NUEVOS CAMPOS PARA RECUPERACIÓN ----
    resetPasswordToken: {
      type: String,
      name: 'reset_password_token',
      nullable: true,
      length: 100,
    },
    resetPasswordExpires: {
      type: 'datetime',
      name: 'reset_password_expires',
      nullable: true,
    },

    horaInicioTurno: {
      type: String,
      name: 'hora_inicio_turno',
      nullable: true,
      length: 5,
    },
    horaFinTurno: {
      type: String,
      name: 'hora_fin_turno',
      nullable: true,
      length: 5,
    },

    /**
     * Flag de seguridad: obliga al usuario a cambiar su contraseña en el siguiente login.
     * Se activa automáticamente al crear cualquier usuario nuevo.
     */
    debeChangiarPassword: {
      type: Boolean,
      name: 'debe_changiar_password',
      default: false,
    },
  },
});