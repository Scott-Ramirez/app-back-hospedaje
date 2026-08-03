import { IHabitacionRepository } from '../interfaces/habitacion-repository.interface';

export class LiberarHabitacionUseCase {
  constructor(private readonly habitacionRepo: IHabitacionRepository) {}

  async execute(habitacionId: string) {
    // 1. Buscamos la habitación para verificar su estado actual
    const habitacion = await this.habitacionRepo.obtenerPorId(habitacionId);

    if (!habitacion) {
      throw new Error('La habitación no existe');
    }

    // 2. Solo permitimos liberar si está en limpieza (o quizás ocupada por error)
    if (habitacion.estado === 'disponible') {
      return { mensaje: 'La habitación ya se encuentra disponible' };
    }

    // 3. Actualizamos el estado a disponible
    await this.habitacionRepo.actualizar(habitacionId, {
      estado: 'disponible' as any,
    });

    return {
      mensaje: `Habitación ${habitacion.numero} liberada con éxito y lista para recibir huéspedes.`,
      habitacionId: habitacion.id,
      numero: habitacion.numero
    };
  }
}