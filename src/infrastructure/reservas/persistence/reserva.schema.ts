import { EntitySchema } from 'typeorm';
import { Reserva } from '../../../core/reservas/entities/reserva.entity';

export const ReservaSchema = new EntitySchema<Reserva>({
  name: 'Reserva',
  tableName: 'reservas',
  target: Reserva,
  columns: {
    id: {
      type: 'uuid',
      primary: true,
      generated: 'uuid',
    },
    habitacionId: {
      type: 'uuid',
      name: 'habitacion_id',
    },
    huespedId: {
      type: 'uuid',
      name: 'huesped_id',
    },
    fecha_inicio: {
      type: 'datetime',
    },
    fecha_fin: {
      type: 'datetime',
    },
    monto_adelanto: {
      type: 'decimal',
      precision: 10,
      scale: 2,
      transformer: {
        to: (val: number) => val,
        from: (val: string) => parseFloat(val),
      },
    },
    metodo_pago: {
      type: 'enum',
      enum: ['efectivo', 'yape', 'plin', 'transferencia', 'tarjeta'],
      default: 'efectivo',
    },
    monto_total_estimado: {
      type: 'decimal',
      precision: 10,
      scale: 2,
      nullable: true,
      transformer: {
        to: (val: number) => val,
        from: (val: string) => (val ? parseFloat(val) : undefined),
      },
    },
    estado: {
      type: 'enum',
      enum: ['pendiente', 'confirmada', 'completada', 'cancelada'],
      default: 'confirmada',
    },
    comprobante_url: {
      type: 'varchar',
      length: 500,
      nullable: true,
      name: 'comprobante_url',
    },
    observaciones: {
      type: 'text',
      nullable: true,
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
    habitacion: {
      type: 'many-to-one',
      target: 'Habitacion',
      joinColumn: { name: 'habitacion_id' },
      onDelete: 'CASCADE',
    },
    huesped: {
      type: 'many-to-one',
      target: 'Huesped',
      joinColumn: { name: 'huesped_id' },
      onDelete: 'CASCADE',
    },
  },
});
