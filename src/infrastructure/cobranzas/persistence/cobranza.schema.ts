import { EntitySchema } from 'typeorm';
import { Cobranza } from '../../../core/cobranzas/entities/cobranza.entity';
import { TipoMovimiento } from '../../../core/cobranzas/enums/tipo-movimiento.enum';
import { MetodoPago } from '../../../core/cobranzas/enums/metodo-pago.enum';

export const CobranzaSchema = new EntitySchema<Cobranza>({
  name: 'Cobranza',
  tableName: 'cobranzas',
  target: Cobranza,

  columns: {

    id: {
      type: 'uuid',
      primary: true,
      generated: 'uuid',
    },


    estanciaId: {
      type: 'uuid',
    },


    huespedId: {
      type: 'uuid',
    },


    tipo: {
      type: 'enum',
      enum: Object.values(TipoMovimiento),
      default: TipoMovimiento.CARGO,
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


    metodoPago: {
      type: 'enum',
      enum: Object.values(MetodoPago),
      nullable: true,
    },


    concepto: {
      type: 'varchar',
      length: 255,
    },


    fecha: {
      type: 'timestamp',
      default: () => 'CURRENT_TIMESTAMP',
    },


    createdAt: {
      type: 'timestamp',
      createDate: true,
    },


    updatedAt: {
      type: 'timestamp',
      updateDate: true,
    },
    sesionCajaId: {
      type: 'uuid',
      nullable: true,
    },
  },
  relations: {
    estancia: {
      type: 'many-to-one',
      target: 'Estancia',
      joinColumn: {
        name: 'estanciaId',
      },
    },
    huesped: {
      type: 'many-to-one',
      target: 'Huesped',
      joinColumn: {
        name: 'huespedId',
      },
    },
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