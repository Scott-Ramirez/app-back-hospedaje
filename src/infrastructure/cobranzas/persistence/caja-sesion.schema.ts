import { EntitySchema } from 'typeorm';
import { CajaSesion } from '../../../core/cobranzas/entities/caja-sesion.entity';

export const CajaSesionSchema = new EntitySchema<CajaSesion>({
  name: 'CajaSesion',
  tableName: 'caja_sesiones',
  target: CajaSesion,
  columns: {
    id: {
      type: 'uuid',
      primary: true,
      generated: 'uuid',
    },
    usuarioId: {
      type: 'int',
    },
    fecha_apertura: {
      type: 'timestamp',
      default: () => 'CURRENT_TIMESTAMP',
    },
    fecha_cierre: {
      type: 'timestamp',
      nullable: true,
    },
    monto_inicial: {
      type: 'decimal',
      precision: 10,
      scale: 2,
      transformer: {
        to: (value: number) => value,
        from: (value: string) => parseFloat(value),
      },
    },
    monto_ingresos: {
      type: 'decimal',
      precision: 10,
      scale: 2,
      default: 0,
      transformer: {
        to: (value: number) => value,
        from: (value: string) => parseFloat(value),
      },
    },
    monto_ingresos_efectivo: {
      type: 'decimal',
      precision: 10,
      scale: 2,
      default: 0,
      transformer: {
        to: (value: number) => value,
        from: (value: string) => parseFloat(value),
      },
      name: 'monto_ingresos_efectivo',
    },
    monto_ingresos_digital: {
      type: 'decimal',
      precision: 10,
      scale: 2,
      default: 0,
      transformer: {
        to: (value: number) => value,
        from: (value: string) => parseFloat(value),
      },
      name: 'monto_ingresos_digital',
    },
    monto_egresos: {
      type: 'decimal',
      precision: 10,
      scale: 2,
      default: 0,
      transformer: {
        to: (value: number) => value,
        from: (value: string) => parseFloat(value),
      },
    },
    monto_real_entregado: {
      type: 'decimal',
      precision: 10,
      scale: 2,
      nullable: true,
      transformer: {
        to: (value: number) => value,
        from: (value: string) => (value ? parseFloat(value) : null) as any,
      },
    },
    descuadre: {
      type: 'decimal',
      precision: 10,
      scale: 2,
      nullable: true,
      transformer: {
        to: (value: number) => value,
        from: (value: string) => (value ? parseFloat(value) : null) as any,
      },
    },
    estado: {
      type: 'enum',
      enum: ['abierta', 'cerrada'],
      default: 'abierta',
    },
    observaciones: {
      type: 'varchar',
      length: 255,
      nullable: true,
    },
    conciliado: {
      type: 'boolean',
      default: true,
    },
    conciliado_por: {
      type: 'varchar',
      length: 100,
      nullable: true,
      name: 'conciliado_por',
    },
    notas_conciliacion: {
      type: 'text',
      nullable: true,
      name: 'notas_conciliacion',
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
    usuario: {
      type: 'many-to-one',
      target: 'Usuario',
      joinColumn: {
        name: 'usuarioId',
      },
    },
  },
});
