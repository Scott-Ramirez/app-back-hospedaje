import { EntitySchema } from 'typeorm';

export interface Gasto {
  id: string;
  usuario: string;
  monto: number;
  concepto: string;
  categoria?: string;
  comprobante_url?: string | null;
  observaciones?: string | null;
  periodo_mes?: number | null;
  periodo_anio?: number | null;
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
    categoria: {
      type: String,
      length: 50,
      default: 'caja_chica',
      nullable: true,
    },
    comprobante_url: {
      type: String,
      length: 255,
      nullable: true,
    },
    observaciones: {
      type: 'text',
      nullable: true,
    },
    periodo_mes: {
      type: 'int',
      nullable: true,
    },
    periodo_anio: {
      type: 'int',
      nullable: true,
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
