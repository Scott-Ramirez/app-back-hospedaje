import { IHabitacionRepository } from '../interfaces/habitacion-repository.interface';
import { NotFoundException } from '@nestjs/common';

export class EliminarHabitacionUseCase {
  constructor(private readonly repository: IHabitacionRepository) {}

  async execute(id: string): Promise<any> {
    const habitacion = await this.repository.obtenerPorId(id);
    if (!habitacion) throw new NotFoundException('Habitación no encontrada');

    await this.repository.eliminar(id); // Asegúrate de tener 'eliminar' en tu repo
    return {
      exito: true,
      numero: habitacion.numero
    };
  }
}