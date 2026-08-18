import { IEstanciaRepository } from '../interfaces/estancia-repository.interface';

export class ListarEstanciasUseCase {
  constructor(private readonly estanciaRepo: IEstanciaRepository) {}

  async execute(filtros: { estado?: string, pagina?: number, limit?: number }) {
    // Si viene paginación explícita se aplica; de lo contrario trae todas las estancias activas
    return await this.estanciaRepo.listar({
      estado: filtros.estado,
      limit: filtros.limit,
      offset: filtros.pagina && filtros.limit ? (filtros.pagina - 1) * filtros.limit : undefined,
    });
  }
}