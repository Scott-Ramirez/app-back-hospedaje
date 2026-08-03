import { EntitySchema } from 'typeorm';
import { Habitacion } from '../../../core/habitaciones/entities/habitacion.entity';

export const HabitacionSchema = new EntitySchema<Habitacion>({
  name: 'Habitacion',
  tableName: 'habitaciones',
  target: Habitacion,
  columns: {
    id: {
      type: 'uuid',
      primary: true,
      generated: 'uuid',
    },
    numero: {
      type: 'varchar',
      length: 10,
      unique: true,
    },
    tipo: {
      type: 'enum',
      enum: ['simple', 'matrimonial'],
    },
    aire_acondicionado: {
      type: 'boolean',
      default: false,
    },
    wifi: {
      type: 'boolean',
      default: true,
    },
    ventilador: {
      type: 'boolean',
      default: false,
    },
    precio: {
      type: 'decimal',
      precision: 10,
      scale: 2,
      transformer: {
        to: (value: number) => value,
        from: (value: string) => parseFloat(value),
      },
    },
    estado: {
      type: 'enum',
      enum: ['disponible', 'ocupado', 'limpieza'],
      default: 'disponible',
    },
    createdAt: {
      type: 'timestamp',
      createDate: true,
    },
    updatedAt: {
      type: 'timestamp',
      updateDate: true,
    },
  },
});