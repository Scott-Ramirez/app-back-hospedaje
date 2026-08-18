import { NotFoundException } from '@nestjs/common';
import { IReservaRepository } from '../interfaces/reserva-repository.interface';

export class CancelarReservaUseCase {
  constructor(private readonly reservaRepo: IReservaRepository) {}

  async execute(id: string): Promise<void> {
    const reserva = await this.reservaRepo.obtenerPorId(id);
    if (!reserva) {
      throw new NotFoundException('Reserva no encontrada');
    }

    await this.reservaRepo.cambiarEstado(id, 'cancelada');
  }
}
