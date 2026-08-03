import { Estancia } from '../entities/estancia.entity';

export interface IEstanciaRepository {
  /**
   * Registra una nueva estancia (Check-in).
   */
  crear(estancia: Partial<Estancia>): Promise<Estancia>;

  /**
   * Obtiene una estancia por su ID. 
   * Debe incluir las relaciones 'huesped' y 'habitacion' para los cálculos de monto.
   */
  obtenerPorId(id: string): Promise<Estancia | null>;

  /**
   * Lista las estancias con soporte para filtros y paginación de 5 en 5.
   * @param filtros.estado Opcional: 'pendiente', 'pagado' o 'finalizado'.
   * @param filtros.limit Cantidad de registros a traer (ej: 5).
   * @param filtros.offset Cuántos registros saltar ( (pagina - 1) * 5 ).
   */
  listar(filtros?: { 
    estado?: string; 
    limit?: number; 
    offset?: number; 
  }): Promise<Estancia[]>;

  /**
   * Actualiza datos de la estancia (Check-out, cambios de estado o pagos).
   * Sustituye al antiguo método 'finalizar' por uno más flexible.
   */
  actualizar(id: string, estancia: Partial<Estancia>): Promise<Estancia>;

  obtenerHistorialSalidas(filtros: { 
    termino?: string; 
    limit: number; 
    offset: number; 
  }): Promise<[Estancia[], number]>; // Devuelve los datos y el total para la paginación
}