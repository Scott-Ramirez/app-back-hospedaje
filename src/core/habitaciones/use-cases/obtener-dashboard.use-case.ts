import { IHabitacionRepository } from '../interfaces/habitacion-repository.interface';
import { IEstanciaRepository } from '../../estancias/interfaces/estancia-repository.interface';

export class ObtenerDashboardUseCase {
  constructor(
    private readonly habitacionRepo: IHabitacionRepository,
    private readonly estanciaRepo: IEstanciaRepository,
  ) {}

  async execute() {
    // 1. Obtener todas las habitaciones (Usa tu método real 'obtenerTodos')
    const habitaciones = await this.habitacionRepo.obtenerTodos();
    
    const disponibles = habitaciones.filter(h => h.estado === 'disponible').length;
    const ocupadas = habitaciones.filter(h => h.estado === 'ocupado').length;
    const enLimpieza = habitaciones.filter(h => h.estado === 'limpieza').length;

    // 2. Obtener estancias pendientes usando los parámetros de tu interfaz
    // Pasamos un límite alto (ej: 100) para asegurar que el dashboard analice 
    // todas las alertas del hotel y no se quede solo en las primeras 5
    // 2. Obtener estancias pendientes usando los parámetros de la interfaz
    const estanciasActivas = await this.estanciaRepo.listar({ 
      estado: 'pendiente',
      limit: 100, 
      offset: 0 
    });
    
    // Mapear saldos pendientes reales y filtrar como vencidas únicamente las que tienen deuda activa > 0
    const estanciasMapeadas = estanciasActivas.map(e => {
      const montoPendiente = Math.max(0, Number(e.montoAcumulado || 0) - Number(e.total_pagar || 0));
      const estaVencidaReal = Boolean(e.estaVencida) && montoPendiente > 0;
      return {
        estanciaId: e.id,
        habitacionNumero: e.habitacion?.numero || 'N/A',
        huespedNombre: e.huesped?.nombre || 'Anónimo',
        fechaSalidaProgramada: e.fecha_salida_programada,
        montoPendienteAproximado: montoPendiente,
        estaVencida: estaVencidaReal
      };
    });

    const vencidas = estanciasMapeadas.filter(e => e.estaVencida);

    return {
      resumen: {
        habitacionesDisponibles: disponibles,
        habitacionesOcupadas: ocupadas,
        habitacionesEnLimpieza: enLimpieza,
        totalHabitaciones: habitaciones.length,
      },
      alertas: {
        totalVencidas: vencidas.length,
        huespedesPorDesocupar: estanciasMapeadas
      }
    };
  }
}