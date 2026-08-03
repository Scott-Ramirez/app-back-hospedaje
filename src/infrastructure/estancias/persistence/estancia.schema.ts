import { EntitySchema } from 'typeorm';
import { Estancia } from '../../../core/estancias/entities/estancia.entity';

export const EstanciaSchema = new EntitySchema<Estancia>({
  name: 'Estancia',
  tableName: 'estancias',
  target: Estancia,
  columns: {
    id: {
      type: 'uuid',
      primary: true,
      generated: 'uuid',
    },
    huespedId: {
      type: 'uuid',
    },
    habitacionId: {
      type: 'uuid',
    },
    fecha_entrada: {
      type: 'timestamp',
      createDate: true,
    },
    fecha_salida_programada: {
      type: 'timestamp',
    },
    fecha_salida_real: {
      type: 'timestamp',
      nullable: true,
    },
    total_pagar: {
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
      enum: ['pendiente', 'pagado', 'finalizado'],
      default: 'pendiente',
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
  relations: {
    huesped: {
      type: 'many-to-one',
      target: 'Huesped', // Debe coincidir con el 'name' en huesped.schema.ts
      joinColumn: { name: 'huespedId' },
    },
    habitacion: {
      type: 'many-to-one',
      target: 'Habitacion', // Debe coincidir con el 'name' en habitacion.schema.ts
      joinColumn: { name: 'habitacionId' },
    },
  },
});