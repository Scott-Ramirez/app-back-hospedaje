import { Expose } from 'class-transformer';

export type EstadoEstancia = 'pendiente' | 'pagado' | 'finalizado';

export class Estancia {
  id!: string;
  huespedId!: string;
  habitacionId!: string;
  
  fecha_entrada!: Date;
  fecha_salida_programada!: Date;
  fecha_salida_real?: Date | null;
  
  total_pagar!: number;
  estado: EstadoEstancia = 'pendiente';
  
  createdAt!: Date;
  updatedAt!: Date;

  huesped?: any; 
  habitacion?: any;

  /**
   * Calcula los días de estancia considerando que el día vence a las 13:00.
   * Expuesto para el JSON de respuesta.
   */
  @Expose()
  get diasTranscurridos(): number {
    const inicio = new Date(this.fecha_entrada);
    const fin = this.fecha_salida_real ? new Date(this.fecha_salida_real) : new Date();

    // 1. Calculamos la diferencia básica de días calendario
    const fechaInicioBase = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());
    const fechaFinBase = new Date(fin.getFullYear(), fin.getMonth(), fin.getDate());
    
    const diffMs = fechaFinBase.getTime() - fechaInicioBase.getTime();
    let dias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // 2. Regla de las 13:00 (Check-out time)
    if (fin.getHours() >= 13) {
      dias += 1;
    }

    return dias <= 0 ? 1 : dias;
  }

  /**
   * Calcula el monto total acumulado según el precio de la habitación.
   * Expuesto para el JSON de respuesta.
   */
  @Expose()
  get montoAcumulado(): number {
    if (!this.habitacion || !this.habitacion.precio) {
      return this.total_pagar;
    }
    
    return this.diasTranscurridos * this.habitacion.precio;
  }

  /**
   * Indica si el huésped ya excedió la fecha programada.
   * Expuesto para el JSON de respuesta.
   */
  @Expose()
  get estaVencida(): boolean {
    if (this.estado === 'finalizado') return false;
    // Compara la fecha actual con la salida pactada
    return new Date() > new Date(this.fecha_salida_programada);
  }
}