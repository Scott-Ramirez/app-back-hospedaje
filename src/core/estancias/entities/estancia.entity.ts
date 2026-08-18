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

  // ─────────────────────────────────────────────────────────────────────────────
  // Helpers internos (sin @Expose — no van al JSON)
  // ─────────────────────────────────────────────────────────────────────────────

  /** Noches/días pactadas entre la entrada y la salida PROGRAMADA (sin sobretiempo). */
  private get _diasProgramados(): number {
    const inicio = new Date(this.fecha_entrada);
    const salidaProg = this.fecha_salida_programada
      ? new Date(this.fecha_salida_programada)
      : new Date();

    // Obtener la diferencia en días calendario en la zona horaria de Perú (America/Lima)
    const d1 = new Date(inicio.toLocaleString('en-US', { timeZone: 'America/Lima' }));
    const d2 = new Date(salidaProg.toLocaleString('en-US', { timeZone: 'America/Lima' }));
    
    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);

    const diffMs = d2.getTime() - d1.getTime();
    return Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
  }

  /** Precio de la habitación como número (0 si no está cargada). */
  private get _precio(): number {
    return Number(this.habitacion?.precio || 0);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Propiedades públicas expuestas en el JSON
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Días/noches que se cuentan para cobro considerando la hora de corte (13:00 hrs).
   */
  @Expose()
  get diasTranscurridos(): number {
    // Si ya finalizó la estancia (check-out real)
    if (this.fecha_salida_real) {
      const inicio = new Date(this.fecha_entrada);
      const fin = new Date(this.fecha_salida_real);
      const d1 = new Date(inicio.toLocaleString('en-US', { timeZone: 'America/Lima' }));
      const d2 = new Date(fin.toLocaleString('en-US', { timeZone: 'America/Lima' }));
      d1.setHours(0, 0, 0, 0);
      d2.setHours(0, 0, 0, 0);
      const diffMs = d2.getTime() - d1.getTime();
      return Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
    }

    const ahora = new Date();
    const ahoraLimaStr = ahora.toLocaleString('en-US', { timeZone: 'America/Lima' });
    const ahoraLima = new Date(ahoraLimaStr);

    const inicioLimaStr = new Date(this.fecha_entrada).toLocaleString('en-US', { timeZone: 'America/Lima' });
    const inicioLima = new Date(inicioLimaStr);

    // Hora de corte de hoy a las 13:00 hrs
    const fechaCorteHoy = new Date(ahoraLima);
    fechaCorteHoy.setHours(13, 0, 0, 0);

    const dInicio = new Date(inicioLima);
    dInicio.setHours(0, 0, 0, 0);

    const dAhora = new Date(ahoraLima);
    dAhora.setHours(0, 0, 0, 0);

    let diasCalendario = Math.round((dAhora.getTime() - dInicio.getTime()) / (1000 * 60 * 60 * 24));

    // Si ya sobrepasamos las 13:00 hrs de hoy y el check-in fue anterior a las 13:00 de hoy
    if (ahoraLima >= fechaCorteHoy) {
      diasCalendario += 1;
    }

    const diasCalculados = Math.max(1, diasCalendario);
    return diasCalculados;
  }

  /**
   * Monto acumulado total a cobrar (precio × diasTranscurridos).
   */
  @Expose()
  get montoAcumulado(): number {
    if (!this._precio) {
      return Number(this.total_pagar || 0);
    }
    return this.diasTranscurridos * this._precio;
  }

  /**
   * true si el huésped tiene una deuda real sobre los días ya transcurridos a la fecha.
   */
  @Expose()
  get estaVencida(): boolean {
    if (this.estado === 'finalizado' || this.estado === 'pagado') return false;

    const pagado = Number(this.total_pagar || 0);
    const costoTranscurrido = this.diasTranscurridos * this._precio;
    return costoTranscurrido > pagado;
  }
}