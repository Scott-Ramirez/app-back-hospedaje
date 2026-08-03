import { IHuespedRepository } from '../interfaces/huesped-repository.interface';
import { Huesped } from '../entities/huesped.entity';
import { NotFoundException } from '@nestjs/common';

export class ActualizarHuespedUseCase {
  constructor(private readonly repository: IHuespedRepository) {}

  async execute(id: string, datos: Partial<Huesped>): Promise<Huesped> {
    const huesped = await this.repository.obtenerPorId(id);
    if (!huesped) throw new NotFoundException('Huésped no encontrado');
    
    return await this.repository.actualizar(id, datos);
  }
}