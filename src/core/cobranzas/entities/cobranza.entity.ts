import { Expose } from 'class-transformer';
import { MetodoPago } from '../enums/metodo-pago.enum';
import { TipoMovimiento } from '../enums/tipo-movimiento.enum';

export class Cobranza {
  id!: string;

  /**
   * Relación con la estancia
   * Una estancia puede tener muchos movimientos:
   * cargos diarios, pagos parciales, pagos completos.
   */
  estanciaId!: string;

  /**
   * Huésped relacionado (para consultas rápidas)
   */
  huespedId!: string;
  sesionCajaId?: string | null;
  sesionCaja?: any;


  /**
   * Tipo de movimiento financiero
   * cargo = genera deuda
   * pago = reduce deuda
   */
  tipo: TipoMovimiento = TipoMovimiento.CARGO;


  /**
   * Monto del movimiento
   */
  monto!: number;


  /**
   * Método usado cuando es un pago
   */
  metodoPago?: MetodoPago | null;


  /**
   * Descripción del movimiento
   */
  concepto!: string;


  /**
   * Fecha del movimiento
   */
  fecha!: Date;


  createdAt!: Date;
  updatedAt!: Date;


  /**
   * Relaciones opcionales
   */
  estancia?: any;
  huesped?: any;


  /**
   * Indica si este movimiento representa un ingreso.
   */
  @Expose()
  get esPago(): boolean {
    return this.tipo === TipoMovimiento.PAGO;
  }


  /**
   * Indica si este movimiento genera deuda.
   */
  @Expose()
  get esCargo(): boolean {
    return this.tipo === TipoMovimiento.CARGO;
  }

  @Expose()
  get esIngreso(): boolean {
    return this.tipo === TipoMovimiento.PAGO;
  }
}