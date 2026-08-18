import { IHabitacionRepository } from '../interfaces/habitacion-repository.interface';

export class LiberarHabitacionUseCase {
  constructor(private readonly habitacionRepo: IHabitacionRepository) {}

  async execute(habitacionIdOrNumero: string) {
    // 1. Buscamos la habitación por ID UUID o por número comercial
    let habitacion = await this.habitacionRepo.obtenerPorId(habitacionIdOrNumero);
    if (!habitacion) {
      habitacion = await this.habitacionRepo.obtenerPorNumero(habitacionIdOrNumero);
    }

    if (!habitacion) {
      throw new Error('La habitación no existe');
    }

    // 2. Solo permitimos liberar si no está ya disponible
    if (habitacion.estado === 'disponible') {
      return {
        mensaje: 'La habitación ya se encuentra disponible',
        habitacionId: habitacion.id,
        numero: habitacion.numero,
      };
    }

    // 3. Actualizamos el estado a disponible en TODAS las variantes con el mismo número físico
    await this.habitacionRepo.actualizarEstadoPorNumero(habitacion.numero, 'disponible' as any);

    return {
      mensaje: `Habitación ${habitacion.numero} liberada con éxito y lista para recibir huéspedes.`,
      habitacionId: habitacion.id,
      numero: habitacion.numero,
    };
  }
}