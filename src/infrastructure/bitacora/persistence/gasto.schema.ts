import { EntitySchema } from 'typeorm';

export interface Gasto {
  id: string;
  usuario: string;
  monto: number;
  concepto: string;
  fecha: Date;
  sesionCajaId?: string | null;
  sesionCaja?: any;
}

export const GastoSchema = new EntitySchema<Gasto>({
  name: 'Gasto',
  tableName: 'gastos',
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
    monto: {
      type: 'decimal',
      precision: 10,
      scale: 2,
      transformer: {
        to: (value: number) => value,
        from: (value: string) => parseFloat(value),
      },
    },
    concepto: {
      type: String,
      length: 255,
    },
    fecha: {
      type: 'timestamp',
      default: () => 'CURRENT_TIMESTAMP',
    },
    sesionCajaId: {
      type: 'uuid',
      nullable: true,
    },
  },
  relations: {
    sesionCaja: {
      type: 'many-to-one',
      target: 'CajaSesion',
      joinColumn: {
        name: 'sesionCajaId',
      },
      nullable: true,
    },
  },
});
