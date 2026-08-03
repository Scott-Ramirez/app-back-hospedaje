import { Cobranza } from '../entities/cobranza.entity';
import { TipoMovimiento } from '../enums/tipo-movimiento.enum';

export interface ICobranzaRepository {

  /**
   * Registra un nuevo movimiento:
   * - Cargo generado
   * - Pago realizado
   */
  crear(cobranza: Partial<Cobranza>): Promise<Cobranza>;


  /**
   * Lista movimientos de una estancia específica.
   */
  obtenerPorEstancia(estanciaId: string): Promise<Cobranza[]>;


  /**
   * Lista movimientos de un huésped.
   */
  obtenerPorHuesped(huespedId: string): Promise<Cobranza[]>;


  /**
   * Obtiene un movimiento por ID.
   */
  obtenerPorId(id: string): Promise<Cobranza | null>;


  /**
   * Actualiza un movimiento.
   */
  actualizar(
    id: string,
    datos: Partial<Cobranza>
  ): Promise<Cobranza>;


  /**
   * Obtiene ingresos del día.
   * Usado para caja diaria.
   */
  obtenerIngresosDelDia(
    fechaInicio: Date,
    fechaFin: Date
  ): Promise<Cobranza[]>;


  /**
   * Obtiene movimientos filtrando por tipo.
   */
  obtenerPorTipo(
    tipo: TipoMovimiento
  ): Promise<Cobranza[]>;
}