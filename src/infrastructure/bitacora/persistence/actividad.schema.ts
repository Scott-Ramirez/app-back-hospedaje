import { EntitySchema } from 'typeorm';

export interface Actividad {
  id: string;
  usuario: string;
  accion: string;
  descripcion: string;
  fecha: Date;
}

export const ActividadSchema = new EntitySchema<Actividad>({
  name: 'Actividad',
  tableName: 'actividades',
  columns: {
    id: {
      type: 'uuid',
      primary: true,
      generated: 'uuid',
    },
    usuario: {
      type: String,
      length: 100,
    },
    accion: {
      type: String,
      length: 50,
    },
    descripcion: {
      type: String,
      length: 255,
    },
    fecha: {
      type: 'timestamp',
      default: () => 'CURRENT_TIMESTAMP',
    },
  },
});
