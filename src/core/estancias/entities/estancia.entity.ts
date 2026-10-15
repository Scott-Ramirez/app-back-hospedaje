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
  precio_noche?: number | null;
  estado: EstadoEstancia = 'pendiente';
  tipo_estancia: 'normal' | 'cortesia' = 'normal';
  observaciones?: string | null;
  
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

  /**
   * Tarifa por noche efectiva: usa la tarifa acordada para esta estancia
   * si existe; si no, toma el precio base de la habitación en catálogo.
   * Si es de cortesía o precio_noche es 0, la tarifa es estrictamente 0.
   */
  @Expose()
  get precioPorNoche(): number {
    if (this.tipo_estancia === 'cortesia') {
      return 0;
    }
    if (this.precio_noche !== undefined && this.precio_noche !== null && Number(this.precio_noche) > 0) {
      return Number(this.precio_noche);
    }
    return Number(this.habitacion?.precio || 0);
  }

  /** Precio de la habitación como número (0 si no está cargada). */
  private get _precio(): number {
    return this.precioPorNoche;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Propiedades públicas expuestas en el JSON
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Días/noches que se cuentan para cobro considerando la hora de corte (13:00 hrs).
   * Corrige el conteo para que ingresos por la tarde no dupliquen el cobro de inmediato.
   */
  @Expose()
  get diasTranscurridos(): number {
    const inicio = new Date(this.fecha_entrada);
    const fin = this.fecha_salida_real ? new Date(this.fecha_salida_real) : new Date();

    // Convertir a tiempo en la zona horaria de Perú (America/Lima)
    const inicioLima = new Date(inicio.toLocaleString('en-US', { timeZone: 'America/Lima' }));
    const finLima = new Date(fin.toLocaleString('en-US', { timeZone: 'America/Lima' }));

    // Definición de hora de corte (13:00 hrs):
    // El primer ciclo de 1 día/noche cubre la estancia:
    // - Si ingresó de madrugada (< 06:00 hrs), el corte es a las 13:00 hrs de ese mismo día.
    // - Si ingresó en horario normal (>= 06:00 hrs, mañana, tarde o noche), el corte es a las 13:00 hrs del día siguiente.
    const primerCorte = new Date(inicioLima);
    if (inicioLima.getHours() < 6) {
      primerCorte.setHours(13, 0, 0, 0);
    } else {
      primerCorte.setDate(primerCorte.getDate() + 1);
      primerCorte.setHours(13, 0, 0, 0);
    }

    // Mientras la fecha evaluada no haya superado el primer corte, es estrictamente 1 día/noche
    if (finLima.getTime() <= primerCorte.getTime()) {
      return 1;
    }

    // Si ya superó el primer corte de las 13:00, calculamos cuántos ciclos de 24 horas adicionales han pasado
    const msExcedente = finLima.getTime() - primerCorte.getTime();
    const diasExtra = Math.floor(msExcedente / (1000 * 60 * 60 * 24)) + 1;
    return 1 + diasExtra;
  }

  /**
   * Monto acumulado total a cobrar (precio × diasTranscurridos).
   */
  @Expose()
  get montoAcumulado(): number {
    if (this.tipo_estancia === 'cortesia') {
      return 0;
    }
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
    if (this.tipo_estancia === 'cortesia') return false;

    const pagado = Number(this.total_pagar || 0);
    const costoTranscurrido = this.diasTranscurridos * this._precio;
    return costoTranscurrido > pagado;
  }
}