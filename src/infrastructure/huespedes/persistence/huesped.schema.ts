import { EntitySchema } from 'typeorm';
import { Huesped } from '../../../core/huespedes/entities/huesped.entity';

export const HuespedSchema = new EntitySchema<Huesped>({
  name: 'Huesped',
  target: Huesped,
  tableName: 'huespedes',
  columns: {
    id: {
      type: 'uuid',
      primary: true,
      generated: 'uuid', // Genera automáticamente el UUID
    },
    nombre: {
      type: 'varchar',
      length: 150,
    },
    dni: {
      type: 'varchar',
      length: 8,
      unique: true,
    },
    celular: {
      type: 'varchar',
      length: 9,
      nullable: true,
    },
    createdAt: {
      type: 'timestamp',
      createDate: true, // Auto-timestamp de creación (como Laravel)
      name: 'created_at',
    },
    updatedAt: {
      type: 'timestamp',
      updateDate: true, // Auto-timestamp de actualización
      name: 'updated_at',
    },
    deletedAt: {
      type: 'timestamp',
      deleteDate: true, // Esto activa el Soft Delete automático en TypeORM
      nullable: true,
      name: 'deleted_at',
    },
  },
  relations: {
    // ESTO ES LO QUE FALTA
    estancias: {
      type: 'one-to-many',
      target: 'Estancia', // Nombre del esquema de estancias
      inverseSide: 'huesped',
    },
  },
});