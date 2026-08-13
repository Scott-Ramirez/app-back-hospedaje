import { EntitySchema } from 'typeorm';

export interface Notificacion {
  id: string;
  remitenteId?: string;
  remitenteNombre: string;
  remitenteRol: string;
  destinatarioRol: string; // 'admin' | 'supervisor' | 'todos'
  titulo: string;
  mensaje: string;
  tipo: string; // 'liberacion_habitacion' | 'alerta' | 'consulta' | etc.
  habitacionNumero?: string;
  estanciaId?: string;
  leido: boolean;
  fecha: Date;
}

export const NotificacionSchema = new EntitySchema<Notificacion>({
  name: 'Notificacion',
  tableName: 'notificaciones',
  columns: {
    id: {
      type: 'uuid',
      primary: true,
      generated: 'uuid',
    },
    remitenteId: {
      type: String,
      nullable: true,
    },
    remitenteNombre: {
      type: String,
      length: 100,
    },
    remitenteRol: {
      type: String,
      length: 50,
      default: 'recepcionista',
    },
    destinatarioRol: {
      type: String,
      length: 50,
      default: 'todos',
    },
    titulo: {
      type: String,
      length: 150,
    },
    mensaje: {
      type: 'text',
    },
    tipo: {
      type: String,
      length: 50,
      default: 'liberacion_habitacion',
    },
    habitacionNumero: {
      type: String,
      length: 50,
      nullable: true,
    },
    estanciaId: {
      type: String,
      nullable: true,
    },
    leido: {
      type: Boolean,
      default: false,
    },
    fecha: {
      type: 'timestamp',
      default: () => 'CURRENT_TIMESTAMP',
    },
  },
});
