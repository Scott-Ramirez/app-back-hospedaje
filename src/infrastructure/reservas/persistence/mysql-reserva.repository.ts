import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, Not } from 'typeorm';
import { IReservaRepository } from '../../../core/reservas/interfaces/reserva-repository.interface';
import { Reserva, EstadoReserva } from '../../../core/reservas/entities/reserva.entity';
import { ReservaSchema } from './reserva.schema';

@Injectable()
export class MySqlReservaRepository implements IReservaRepository {
  constructor(
    @InjectRepository(ReservaSchema)
    private readonly repository: Repository<Reserva>,
  ) {}

  async obtenerTodas(): Promise<Reserva[]> {
    return await this.repository.find({
      relations: { habitacion: true, huesped: true },
      order: { fecha_inicio: 'ASC' },
    });
  }

  async obtenerPorId(id: string): Promise<Reserva | null> {
    return await this.repository.findOne({
      where: { id } as any,
      relations: { habitacion: true, huesped: true },
    });
  }

  async obtenerProximas(): Promise<Reserva[]> {
    const ahora = new Date();
    const en48Horas = new Date(ahora.getTime() + 48 * 60 * 60 * 1000);

    return await this.repository.find({
      where: {
        estado: 'confirmada',
        fecha_inicio: LessThanOrEqual(en48Horas),
      } as any,
      relations: { habitacion: true, huesped: true },
      order: { fecha_inicio: 'ASC' },
    });
  }

  async obtenerPorHabitacionYFechas(habitacionId: string, inicio: Date, fin: Date): Promise<Reserva[]> {
    return await this.repository.find({
      where: {
        habitacionId,
        estado: Not('cancelada'),
        fecha_inicio: LessThanOrEqual(fin),
        fecha_fin: MoreThanOrEqual(inicio),
      } as any,
      relations: { habitacion: true, huesped: true },
    });
  }

  async crear(reserva: Partial<Reserva>): Promise<Reserva> {
    const nueva = this.repository.create(reserva);
    const guardada = await this.repository.save(nueva);
    return (await this.obtenerPorId(guardada.id))!;
  }

  async actualizar(id: string, datos: Partial<Reserva>): Promise<Reserva> {
    await this.repository.update(id, datos);
    return (await this.obtenerPorId(id))!;
  }

  async cambiarEstado(id: string, estado: EstadoReserva): Promise<void> {
    await this.repository.update(id, { estado });
  }
}
