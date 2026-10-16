import { EntitySchema } from 'typeorm';

export interface JuegoRecord {
  id: string;
  juego: 'runner' | 'snake';
  usuarioId: number;
  usuarioNombre: string;
  usuarioRol: string;
  puntaje: number;
  updatedAt: Date;
}

export const JuegoRecordSchema = new EntitySchema<JuegoRecord>({
  name: 'JuegoRecord',
  tableName: 'juegos_records',
  columns: {
    id: {
      type: 'uuid',
      primary: true,
      generated: 'uuid',
    },
    juego: {
      type: 'varchar',
      length: 20,
    },
    usuarioId: {
      type: Number,
      name: 'usuario_id',
    },
    usuarioNombre: {
      type: String,
      name: 'usuario_nombre',
      length: 100,
    },
    usuarioRol: {
      type: String,
      name: 'usuario_rol',
      length: 30,
    },
    puntaje: {
      type: Number,
      default: 0,
    },
    updatedAt: {
      type: 'timestamp',
      name: 'updated_at',
      default: () => 'CURRENT_TIMESTAMP',
      onUpdate: 'CURRENT_TIMESTAMP',
    },
  },
});
