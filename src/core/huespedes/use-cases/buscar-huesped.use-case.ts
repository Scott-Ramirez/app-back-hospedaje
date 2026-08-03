import { IHuespedRepository } from '../interfaces/huesped-repository.interface';
import { Huesped } from '../entities/huesped.entity';

export class BuscarHuespedUseCase {
  // Inyectamos la interfaz (no la clase de la base de datos)
  constructor(private readonly repository: IHuespedRepository) {}

  async execute(query: string): Promise<any> {
    const resultados = await this.repository.buscarPorTermino(query);
    
    if (resultados.length === 0) {
      return {
        message: `No se encontraron huéspedes que coincidan con: "${query}"`,
        data: []
      };
    }
    
    return resultados;
  }
}