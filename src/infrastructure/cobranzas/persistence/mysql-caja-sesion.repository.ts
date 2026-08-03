import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ICajaSesionRepository } from '../../../core/cobranzas/interfaces/caja-sesion-repository.interface';
import { CajaSesion } from '../../../core/cobranzas/entities/caja-sesion.entity';
import { CajaSesionSchema } from './caja-sesion.schema';

@Injectable()
export class MySqlCajaSesionRepository implements ICajaSesionRepository {
  constructor(
    @InjectRepository(CajaSesionSchema)
    private readonly repository: Repository<CajaSesion>,
  ) {}

  async crear(datos: Partial<CajaSesion>): Promise<CajaSesion> {
    const nueva = this.repository.create(datos);
    return await this.repository.save(nueva);
  }

  async obtenerPorId(id: string): Promise<CajaSesion | null> {
    return await this.repository.findOne({
      where: { id },
      relations: { usuario: true },
    });
  }

  async obtenerActivaPorUsuario(usuarioId: number): Promise<CajaSesion | null> {
    return await this.repository.findOne({
      where: { usuarioId, estado: 'abierta' },
      relations: { usuario: true },
    });
  }

  async actualizar(id: string, datos: Partial<CajaSesion>): Promise<CajaSesion> {
    await this.repository.update(id, datos as any);
    const act = await this.obtenerPorId(id);
    if (!act) {
      throw new Error('No se pudo encontrar la sesión de caja tras actualizar');
    }
    return act;
  }

  async listarTodas(filtros?: { limit?: number; offset?: number }): Promise<[CajaSesion[], number]> {
    return await this.repository.findAndCount({
      relations: { usuario: true },
      order: { fecha_apertura: 'DESC' },
      take: filtros?.limit || 10,
      skip: filtros?.offset || 0,
    });
  }

  async obtenerUltimaCerrada(): Promise<CajaSesion | null> {
    return await this.repository.findOne({
      where: { estado: 'cerrada' },
      order: { fecha_cierre: 'DESC' },
    });
  }
}
