import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IEstanciaRepository } from '../../../core/estancias/interfaces/estancia-repository.interface';
import { Estancia } from '../../../core/estancias/entities/estancia.entity';
import { EstanciaSchema } from './estancia.schema';

@Injectable()
export class MySqlEstanciaRepository implements IEstanciaRepository {
  constructor(
    @InjectRepository(EstanciaSchema)
    private readonly repository: Repository<Estancia>,
  ) {}

  /**
   * Crea una nueva estancia en la base de datos.
   * Se usa durante el proceso de Check-in.
   */
  async crear(estancia: Partial<Estancia>): Promise<Estancia> {
    const nueva = this.repository.create(estancia);
    return await this.repository.save(nueva);
  }

  /**
   * Busca una estancia por su UUID cargando sus relaciones.
   * Vital para que los getters de la Entidad (montoAcumulado) tengan datos.
   */
  async obtenerPorId(id: string): Promise<Estancia | null> {
    return await this.repository.findOne({
      where: { id: id as any },
      relations: {
        huesped: true,
        habitacion: true,
      },
    });
  }

  /**
   * Lista estancias filtradas por estado (pendiente, finalizado, etc.)
   * Incluye las relaciones para mostrar nombres de huéspedes y números de habitación.
   */
  async listar(filtros?: { estado?: string, limit?: number, offset?: number }): Promise<Estancia[]> {
    return await this.repository.find({
      where: filtros?.estado ? { estado: filtros.estado as any } : {},
      relations: {
        huesped: true,
        habitacion: true,
      },
      order: { createdAt: 'DESC' } as any,
      take: filtros?.limit || 5,    // <--- Paginación: Registros por página
      skip: filtros?.offset || 0,   // <--- Paginación: Registros que se salta
    });
  }

  /**
   * Actualiza cualquier campo de la estancia y devuelve el objeto actualizado.
   * Se usará para el Check-out (cambiar estado y fecha_salida_real).
   */
  async actualizar(id: string, datos: Partial<Estancia>): Promise<Estancia> {
    // Ejecutamos la actualización
    await this.repository.update(id, datos as any);
    
    // Recuperamos el registro actualizado con sus relaciones
    const actualizado = await this.obtenerPorId(id);
    
    if (!actualizado) {
      throw new Error(`No se pudo encontrar la estancia con ID ${id} tras la actualización`);
    }

    return actualizado;
  }

  async obtenerHistorialSalidas(filtros: { 
    termino?: string; 
    limit: number; 
    offset: number; 
  }): Promise<[Estancia[], number]> {
    
    // Creamos la consulta apuntando a las estancias que ya salieron (pagado o finalizado)
    const query = this.repository.createQueryBuilder('estancia')
      .leftJoinAndSelect('estancia.huesped', 'huesped')
      .leftJoinAndSelect('estancia.habitacion', 'habitacion') // 🌟 Mantiene la carga completa de propiedades del objeto habitación
      .where('estancia.estado IN (:...estados)', { estados: ['pagado', 'finalizado'] });

    // Si el recepcionista escribe en el buscador (Nombre o DNI)
    if (filtros.termino) {
      query.andWhere(
        '(huesped.nombre LIKE :termino OR huesped.dni LIKE :termino)',
        { termino: `%${filtros.termino}%` }
      );
    }

    // Ordenamos para que las salidas más recientes aparezcan primero arriba
    query.orderBy('estancia.fecha_salida_real', 'DESC')
         .skip(filtros.offset)
         .take(filtros.limit);

    return await query.getManyAndCount();
  }
}