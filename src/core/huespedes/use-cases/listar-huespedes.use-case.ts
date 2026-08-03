import { IHuespedRepository } from '../interfaces/huesped-repository.interface';
import { Huesped } from '../entities/huesped.entity';

export class ListarHuespedesUseCase {
  constructor(private readonly repository: IHuespedRepository) {}

    async execute(): Promise<any> {
    const huespedes = await this.repository.obtenerTodos();
    
    if (huespedes.length === 0) {
        return {
        message: 'No hay huéspedes registrados en el sistema.',
        data: []
        };
    }
    
    return huespedes;
    }
}