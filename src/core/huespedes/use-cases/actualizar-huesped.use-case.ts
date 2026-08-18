import { IHuespedRepository } from '../interfaces/huesped-repository.interface';
import { Huesped } from '../entities/huesped.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';

export class ActualizarHuespedUseCase {
  constructor(private readonly repository: IHuespedRepository) {}

  async execute(id: string, datos: Partial<Huesped>): Promise<Huesped> {
    const huesped = await this.repository.obtenerPorId(id);
    if (!huesped) throw new NotFoundException('Huésped no encontrado');

    const cleanDatos: Partial<Huesped> = {};

    if (datos.nombre !== undefined) {
      cleanDatos.nombre = datos.nombre.trim();
    }

    if (datos.dni !== undefined) {
      const cleanDni = datos.dni.trim();
      if (cleanDni !== huesped.dni) {
        const existente = await this.repository.obtenerPorDni(cleanDni);
        if (existente && existente.id !== id) {
          throw new BadRequestException(`El DNI ${cleanDni} ya está registrado para otro huésped.`);
        }
      }
      cleanDatos.dni = cleanDni;
    }

    if (datos.celular !== undefined) {
      cleanDatos.celular = datos.celular && datos.celular.trim().length > 0 ? datos.celular.trim() : (null as any);
    }
    
    return await this.repository.actualizar(id, cleanDatos);
  }
}