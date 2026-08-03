import { Huesped } from '../entities/huesped.entity';
import { IHuespedRepository } from '../interfaces/huesped-repository.interface';
import { BadRequestException, NotFoundException } from '@nestjs/common';

export class EliminarHuespedUseCase {
  constructor(private readonly repository: IHuespedRepository) {}

  async execute(id: string): Promise<Huesped> {
    const huesped = await this.repository.obtenerPorId(id);
    if (!huesped) {
      throw new NotFoundException(`Huésped con ID ${id} no encontrado`);
    }

    // Aquí migramos tu lógica de Laravel:
    // if (huesped.tieneEstanciaActiva) { ... } 
    // Por ahora, como no tenemos el módulo de estancias, lo dejamos listo para el futuro.
    
    await this.repository.eliminar(id);
    return huesped;
  }
}