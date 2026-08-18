import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IHabitacionRepository } from '../../../core/habitaciones/interfaces/habitacion-repository.interface';
import { Habitacion, EstadoHabitacion } from '../../../core/habitaciones/entities/habitacion.entity';
import { HabitacionSchema } from './habitacion.schema';

@Injectable()
export class MySqlHabitacionRepository implements IHabitacionRepository {
  constructor(
    @InjectRepository(HabitacionSchema)
    private readonly repository: Repository<Habitacion>,
  ) {}

  async obtenerTodos(): Promise<Habitacion[]> {
    const habitaciones = await this.repository.find();
    return habitaciones.sort((a, b) => {
      const numA = parseInt((a.numero || '').replace(/\D/g, ''), 10);
      const numB = parseInt((b.numero || '').replace(/\D/g, ''), 10);
      if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
        return numA - numB;
      }
      return (a.numero || '').localeCompare(b.numero || '', undefined, { numeric: true, sensitivity: 'base' });
    });
  }

  async obtenerPorId(id: string): Promise<Habitacion | null> {
    return await this.repository.findOneBy({ id } as any);
  }

  async obtenerPorNumero(numero: string): Promise<Habitacion | null> {
    return await this.repository.findOneBy({ numero } as any);
  }

  async crear(habitacion: Partial<Habitacion>): Promise<Habitacion> {
    const nueva = this.repository.create(habitacion);
    return await this.repository.save(nueva);
  }

  // --- MÉTODOS NUEVOS PARA EL CRUD COMPLETO ---

  async actualizar(id: string, datos: Partial<Habitacion>): Promise<Habitacion> {
    await this.repository.update(id, datos);
    // Retornamos la habitación actualizada (puedes usar el obtenerPorId que ya tienes)
    const actualizada = await this.obtenerPorId(id);
    return actualizada!;
  }

  async eliminar(id: string): Promise<void> {
    // Aquí puedes decidir si hacer Delete físico o Soft Delete (si añadiste deletedAt)
    // Por ahora, siguiendo tu esquema de Laravel, usaremos delete físico:
    await this.repository.delete(id);
  }

  // --- MÉTODOS DE ESTADO ---

  async actualizarEstado(id: string, estado: EstadoHabitacion): Promise<void> {
    await this.repository.update(id, { estado });
  }

  async actualizarEstadoPorNumero(numero: string, estado: EstadoHabitacion): Promise<void> {
    await this.repository.update({ numero } as any, { estado });
  }

  async obtenerTodasPorNumero(numero: string): Promise<Habitacion[]> {
    return await this.repository.findBy({ numero } as any);
  }

  async obtenerDisponibles(): Promise<Habitacion[]> {
    return await this.repository.findBy({ estado: 'disponible' } as any);
  }
}