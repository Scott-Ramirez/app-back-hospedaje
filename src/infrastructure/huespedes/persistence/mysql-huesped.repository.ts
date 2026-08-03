import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { IHuespedRepository } from '../../../core/huespedes/interfaces/huesped-repository.interface';
import { Huesped } from '../../../core/huespedes/entities/huesped.entity';
import { HuespedSchema } from './huesped.schema';

@Injectable()
export class MySqlHuespedRepository implements IHuespedRepository {
  constructor(
    @InjectRepository(HuespedSchema)
    private readonly typeOrmRepository: Repository<Huesped>,
  ) { }

  async obtenerTodos(): Promise<Huesped[]> {
    // CORRECCIÓN: Si tu esquema aún no tiene 'estancias' mapeado, quita las relations de aquí.
    // Para listar todos en recepción, es mucho más rápido traer solo los datos del huésped.
    return await this.typeOrmRepository.find({
      order: { createdAt: 'DESC' } as any
    });
  }

  async buscarPorTermino(query: string): Promise<Huesped[]> {
    return await this.typeOrmRepository.find({
      where: [
        { dni: Like(`${query}%`) },
        { nombre: Like(`%${query}%`) }
      ],
      take: 5
    });
  }

  async obtenerPorDni(dni: string, incluirEliminados = false): Promise<Huesped | null> {
    return await this.typeOrmRepository.findOne({
      where: { dni },
      withDeleted: incluirEliminados,
    });
  }

  async obtenerPorId(id: string): Promise<Huesped | null> {
    // CORRECCIÓN: Quitamos el 'as any' innecesario. 'id' es una propiedad válida de la entidad.
    return await this.typeOrmRepository.findOne({ 
      where: { id } 
    });
  }

  async crear(huesped: Partial<Huesped>): Promise<Huesped> {
    const nuevoHuesped = this.typeOrmRepository.create(huesped);
    return await this.typeOrmRepository.save(nuevoHuesped);
  }

  async actualizar(id: string, datos: Partial<Huesped>): Promise<Huesped> {
    await this.typeOrmRepository.update(id, datos);
    const actualizado = await this.obtenerPorId(id);
    if (!actualizado) {
      throw new Error(`No se pudo encontrar el huésped con ID ${id} tras actualizar.`);
    }
    return actualizado;
  }

  async eliminar(id: string): Promise<void> {
    await this.typeOrmRepository.softDelete(id);
  }

  async restaurar(id: string): Promise<void> {
    await this.typeOrmRepository.restore(id);
  }
}