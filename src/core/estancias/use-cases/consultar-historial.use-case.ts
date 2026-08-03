import { IEstanciaRepository } from '../interfaces/estancia-repository.interface';

export class ConsultarHistorialUseCase {
  constructor(
    private readonly estanciaRepo: IEstanciaRepository
  ) {}

  async execute(query: { termino?: string; pagina?: number; limite?: number }) {
    const pagina = query.pagina || 1;
    const limit = query.limite || 10; 
    const offset = (pagina - 1) * limit;

    const [estancias, total] = await this.estanciaRepo.obtenerHistorialSalidas({
      termino: query.termino,
      limit,
      offset
    });

    // Mapeamos los detalles clave usando las propiedades reales de tu entidad
    const datosFormateados = estancias.map(e => ({
      id: e.id,
      habitacionNumero: e.habitacion?.numero || 'N/A',
      // 🌟 CORREGIDO: Cambiado de precioBase a precio para que coincida con tu entidad Habitacion
      habitacionPrecioBase: Number(e.habitacion?.precio || 0), 
      huespedNombre: e.huesped?.nombre || 'Anónimo',
      huespedDni: e.huesped?.dni || 'N/A',
      fechaEntrada: e.fecha_entrada,
      fechaSalida: e.fecha_salida_real || e.fecha_salida_programada,
      // CORRECTO: Como la estancia ya cerró, 'total_pagar' tiene el monto final guardado en caja
      montoTotalPagado: e.total_pagar || e.montoAcumulado 
    }));

    return {
      data: datosFormateados,
      meta: {
        totalRegistros: total,
        paginaActual: pagina,
        paginasTotales: Math.ceil(total / limit)
      }
    };
  }
}