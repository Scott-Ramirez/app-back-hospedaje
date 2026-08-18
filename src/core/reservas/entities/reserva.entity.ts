import { Habitacion } from '../../habitaciones/entities/habitacion.entity';
import { Huesped } from '../../huespedes/entities/huesped.entity';

export type EstadoReserva = 'pendiente' | 'confirmada' | 'completada' | 'cancelada';
export type MetodoPagoReserva = 'efectivo' | 'yape' | 'plin' | 'transferencia' | 'tarjeta';

export class Reserva {
  id!: string;
  habitacionId!: string;
  huespedId!: string;
  
  habitacion?: Habitacion;
  huesped?: Huesped;

  fecha_inicio!: Date;
  fecha_fin!: Date;
  
  monto_adelanto!: number; // Requerido > 0
  metodo_pago: MetodoPagoReserva = 'efectivo';
  monto_total_estimado?: number;

  estado: EstadoReserva = 'confirmada';
  comprobante_url?: string;
  observaciones?: string;

  createdAt!: Date;
  updatedAt!: Date;
}
