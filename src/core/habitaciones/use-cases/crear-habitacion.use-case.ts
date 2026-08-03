import { IHabitacionRepository } from '../interfaces/habitacion-repository.interface';
import { Habitacion } from '../entities/habitacion.entity';
import { ConflictException } from '@nestjs/common';

export class CrearHabitacionUseCase {
  constructor(private readonly repository: IHabitacionRepository) {}

  async execute(datos: Partial<Habitacion>): Promise<Habitacion> {
    const existe = await this.repository.obtenerPorNumero(datos.numero!);
    if (existe) {
      throw new ConflictException(`La habitación número ${datos.numero} ya existe`);
    }
    return await this.repository.crear(datos);
  }
}