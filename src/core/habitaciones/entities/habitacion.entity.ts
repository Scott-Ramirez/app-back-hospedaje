export type TipoHabitacion = 'simple' | 'matrimonial';
export type EstadoHabitacion = 'disponible' | 'ocupado' | 'limpieza';

export class Habitacion {
  id!: string;
  numero!: string;
  tipo: TipoHabitacion = 'simple';
  
  // Usamos valores por defecto como en tu base de datos
  aire_acondicionado: boolean = false;
  wifi: boolean = true;
  ventilador: boolean = false;
  
  precio!: number;
  estado: EstadoHabitacion = 'disponible';

  // Estos los maneja la DB automáticamente
  createdAt!: Date;
  updatedAt!: Date;

  // Método de conveniencia (Opcional, pero muy útil para Estancias)
  estaDisponible(): boolean {
    return this.estado === 'disponible';
  }
}