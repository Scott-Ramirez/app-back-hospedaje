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
    const estanciasActivas = await this.estanciaRepo.listar({ 
      estado: 'pendiente',
      limit: 100, 
      offset: 0 
    });
    
    // Filtramos las que ya excedieron las 13:00 usando el getter de la entidad
    const vencidas = estanciasActivas.filter(e => e.estaVencida);

    return {
      resumen: {
        habitacionesDisponibles: disponibles,
        habitacionesOcupadas: ocupadas,
        habitacionesEnLimpieza: enLimpieza,
        totalHabitaciones: habitaciones.length,
      },
      alertas: {
        totalVencidas: vencidas.length,
        huespedesPorDesocupar: vencidas.map(e => ({
          estanciaId: e.id,
          habitacionNumero: e.habitacion?.numero || 'N/A',
          huespedNombre: e.huesped?.nombre || 'Anónimo',
          fechaSalidaProgramada: e.fecha_salida_programada,
          montoPendienteAproximado: e.montoAcumulado
        }))
      }
    };
  }
}