import { IReservaRepository } from '../interfaces/reserva-repository.interface';
import { Reserva } from '../entities/reserva.entity';

export class ObtenerReservasUseCase {
  constructor(private readonly reservaRepo: IReservaRepository) {}

  async execute(): Promise<Reserva[]> {
    return await this.reservaRepo.obtenerTodas();
  }

  async obtenerProximas(): Promise<Reserva[]> {
    return await this.reservaRepo.obtenerProximas();
  }
}
