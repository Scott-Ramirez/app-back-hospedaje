// src/core/huespedes/use-cases/registrar-huesped.use-case.ts
import { IHuespedRepository } from '../interfaces/huesped-repository.interface';
import { Huesped } from '../entities/huesped.entity';
import { ConflictException, BadRequestException } from '@nestjs/common';

export class RegistrarHuespedUseCase {
  constructor(private readonly repository: IHuespedRepository) {}

  async execute(datos: Partial<Huesped>): Promise<Huesped> {
    if (!datos.dni) {
      throw new BadRequestException('El DNI es obligatorio');
    }

    // Buscamos incluyendo eliminados (withTrashed en Laravel)
    const huespedExistente = await this.repository.obtenerPorDni(datos.dni, true);

    if (huespedExistente) {
      // Si está borrado (deletedAt no es null), lo restauramos
      if (huespedExistente.deletedAt) {
        await this.repository.restaurar(huespedExistente.id);
        // Actualizamos con los nuevos datos (nombre/celular)
        return await this.repository.actualizar(huespedExistente.id, datos);
      }
      // Si no estaba borrado, es un duplicado real
      throw new ConflictException(`El huésped con DNI ${datos.dni} ya está activo`);
    }

    return await this.repository.crear(datos);
  }
}