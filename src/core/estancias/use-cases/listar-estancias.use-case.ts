import { IEstanciaRepository } from '../interfaces/estancia-repository.interface';

export class ListarEstanciasUseCase {
  constructor(private readonly estanciaRepo: IEstanciaRepository) {}

  async execute(filtros: { estado?: string, pagina?: number }) {
    const limite = 5;
    const pagina = filtros.pagina || 1;
    const saltar = (pagina - 1) * limite;

    // Usamos el repositorio para traer la data paginada
    return await this.estanciaRepo.listar({
      estado: filtros.estado,
      limit: limite,
      offset: saltar
    });
  }
}