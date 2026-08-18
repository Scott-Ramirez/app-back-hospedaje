import { IHabitacionRepository } from '../interfaces/habitacion-repository.interface';
import { Habitacion } from '../entities/habitacion.entity';
import { ConflictException } from '@nestjs/common';

export class CrearHabitacionUseCase {
  constructor(private readonly repository: IHabitacionRepository) {}

  async execute(datos: Partial<Habitacion>): Promise<Habitacion> {
    // Permitir crear variantes del mismo número físico (ej. Hab 101 Ventilador vs Hab 101 Aire)
    const todasExistentes = await this.repository.obtenerTodasPorNumero(datos.numero!);
    const varianteIdentica = todasExistentes.find(
      h => h.tipo === datos.tipo && 
           Number(h.precio) === Number(datos.precio) && 
           Boolean(h.aire_acondicionado) === Boolean(datos.aire_acondicionado) && 
           Boolean(h.ventilador) === Boolean(datos.ventilador) &&
           Boolean(h.dos_camas) === Boolean(datos.dos_camas)
    );

    if (varianteIdentica) {
      throw new ConflictException(`Ya existe una variante idéntica para la habitación número ${datos.numero}`);
    }

    // Heredar el estado actual si ya existe otra variante de este número físico ocupada o en limpieza
    if (todasExistentes.length > 0) {
      datos.estado = todasExistentes[0].estado;
    }

    return await this.repository.crear(datos);
  }
}