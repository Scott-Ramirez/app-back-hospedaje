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

  // ... (tus métodos actuales: obtenerTodos, obtenerPorId, etc. se mantienen igual)

  async obtenerTodos(): Promise<Habitacion[]> {
    return await this.repository.find({ order: { numero: 'ASC' } });
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

  async obtenerDisponibles(): Promise<Habitacion[]> {
    return await this.repository.findBy({ estado: 'disponible' } as any);
  }
}