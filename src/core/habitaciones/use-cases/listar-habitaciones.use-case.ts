import { IHabitacionRepository } from '../interfaces/habitacion-repository.interface';

export class ListarHabitacionesUseCase {
  constructor(private readonly repository: IHabitacionRepository) {}

  async execute() {
    const habitaciones = await this.repository.obtenerTodos();
    if (habitaciones.length === 0) {
      return { message: 'No hay habitaciones registradas', data: [] };
    }
    return habitaciones;
  }
}