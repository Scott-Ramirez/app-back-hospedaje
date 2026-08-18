import { Habitacion, EstadoHabitacion } from '../entities/habitacion.entity';

export interface IHabitacionRepository {
  obtenerTodos(): Promise<Habitacion[]>;
  obtenerPorId(id: string): Promise<Habitacion | null>;
  obtenerPorNumero(numero: string): Promise<Habitacion | null>;
  crear(habitacion: Partial<Habitacion>): Promise<Habitacion>;
  // Cambiamos a que devuelva la habitación actualizada
  actualizar(id: string, datos: Partial<Habitacion>): Promise<Habitacion>;
  actualizarEstado(id: string, estado: EstadoHabitacion): Promise<void>;
  eliminar(id: string): Promise<void>;
  obtenerDisponibles(): Promise<Habitacion[]>;
  actualizarEstadoPorNumero(numero: string, estado: EstadoHabitacion): Promise<void>;
  obtenerTodasPorNumero(numero: string): Promise<Habitacion[]>;
}