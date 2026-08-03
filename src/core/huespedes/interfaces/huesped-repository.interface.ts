import { Huesped } from '../entities/huesped.entity';

export interface IHuespedRepository {
  
  obtenerTodos(): Promise<Huesped[]>;
  // --- Búsqueda y Lectura ---
  // buscador que ya tienes (limitado a 5 o 10 resultados)
  buscarPorTermino(query: string): Promise<Huesped[]>;
  
  // Para validar si el DNI ya existe (incluyendo eliminados como en Laravel)
  obtenerPorDni(dni: string, incluirEliminados?: boolean): Promise<Huesped | null>;
  
  // Para el caso de uso de Eliminar o Mostrar Detalle
  obtenerPorId(id: string): Promise<Huesped | null>;

  // --- Escritura ---
  crear(huesped: Partial<Huesped>): Promise<Huesped>;
  
  // Para el UpdateHuespedRequest
  actualizar(id: string, datos: Partial<Huesped>): Promise<Huesped>;

  // --- Borrado y Restauración (Soft Delete) ---
  // Equivale a $huesped->delete() en Laravel
  eliminar(id: string): Promise<void>;
  
  // Equivale a $huesped->restore() en Laravel
  restaurar(id: string): Promise<void>;
}