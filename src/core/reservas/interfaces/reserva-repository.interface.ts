import { Reserva, EstadoReserva } from '../entities/reserva.entity';

export interface IReservaRepository {
  obtenerTodas(): Promise<Reserva[]>;
  obtenerPorId(id: string): Promise<Reserva | null>;
  obtenerProximas(): Promise<Reserva[]>;
  obtenerPorHabitacionYFechas(habitacionId: string, inicio: Date, fin: Date): Promise<Reserva[]>;
  crear(reserva: Partial<Reserva>): Promise<Reserva>;
  actualizar(id: string, datos: Partial<Reserva>): Promise<Reserva>;
  cambiarEstado(id: string, estado: EstadoReserva): Promise<void>;
}
