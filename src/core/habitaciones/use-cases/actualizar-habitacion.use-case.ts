import { IHabitacionRepository } from '../interfaces/habitacion-repository.interface';
import { Habitacion } from '../entities/habitacion.entity';
import { NotFoundException } from '@nestjs/common';

export class ActualizarHabitacionUseCase {
  constructor(private readonly repository: IHabitacionRepository) {}

  async execute(id: string, datos: Partial<Habitacion>): Promise<Habitacion> {
    const habitacion = await this.repository.obtenerPorId(id);
    if (!habitacion) throw new NotFoundException('Habitación no encontrada');

    return await this.repository.actualizar(id, datos); // Asegúrate de tener 'actualizar' en tu repo
  }
}