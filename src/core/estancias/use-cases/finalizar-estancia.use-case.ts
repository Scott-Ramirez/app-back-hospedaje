import { EventEmitter2 } from '@nestjs/event-emitter'; 
import { IEstanciaRepository } from '../interfaces/estancia-repository.interface';
import { IHabitacionRepository } from '../../habitaciones/interfaces/habitacion-repository.interface';

export class FinalizarEstanciaUseCase {
  constructor(
    private readonly estanciaRepo: IEstanciaRepository,
    private readonly habitacionRepo: IHabitacionRepository,
    private readonly eventEmitter: EventEmitter2, 
  ) {}

  async execute(estanciaId: string) {
    // 1. Validar que la estancia exista y no esté cerrada
    const estancia = await this.estanciaRepo.obtenerPorId(estanciaId);
    
    if (!estancia) {
      throw new Error('La estancia no existe');
    }

    if (estancia.estado === 'finalizado') {
      throw new Error('Esta estancia ya ha sido finalizada previamente');
    }

    // 2. Cambiar el estado de la habitación a 'limpieza'
    await this.habitacionRepo.actualizar(estancia.habitacionId, {
      estado: 'limpieza' as any,
    });

    // 3. Finalizar la estancia e inyectar la fecha de salida real
    const estanciaActualizada = await this.estanciaRepo.actualizar(estanciaId, {
      estado: 'finalizado',
      fecha_salida_real: new Date(),
    });

    // CORRECCIÓN AQUÍ: Usamos estanciaId (que es el parámetro real) y extraemos el número de cuarto dinámico
    this.eventEmitter.emit('estancia.finalizada', {
      id: estanciaId, 
      habitacionNumero: estanciaActualizada.habitacion?.numero || 'N/A', 
      mensaje: `La habitación ${estanciaActualizada.habitacion?.numero || ''} requiere limpieza inmediata.`
    });

    // 4. Devolver la información completa del cierre para la caja del hospedaje
    return {
      mensaje: 'Check-out realizado con éxito. La habitación ahora está en limpieza.',
      montoCobrado: estanciaActualizada.montoAcumulado,
      diasTotales: estanciaActualizada.diasTranscurridos,
      estancia: estanciaActualizada
    };
  }
}