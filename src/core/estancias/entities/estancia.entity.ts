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
    const diffMs = Math.max(0, salidaProg.getTime() - inicio.getTime());
    return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  /** Precio de la habitación como número (0 si no está cargada). */
  private get _precio(): number {
    return Number(this.habitacion?.precio || 0);
  }



  // ─────────────────────────────────────────────────────────────────────────────
  // Propiedades públicas expuestas en el JSON
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Días/noches que se cuentan para cobro.
   * - Si está en sobretiempo (fecha actual > fecha programada): días programados + días extra reales.
   * - Si está dentro de la estancia programada: solo los días programados.
   */
  @Expose()
  get diasTranscurridos(): number {
    const fin = this.fecha_salida_real ? new Date(this.fecha_salida_real) : new Date();
    const salidaProg = this.fecha_salida_programada
      ? new Date(this.fecha_salida_programada)
      : fin;

    let diasExtra = 0;
    if (fin > salidaProg) {
      const diffExtraMs = fin.getTime() - salidaProg.getTime();
      if (diffExtraMs > 15 * 60 * 1000) { // tolerancia 15 min
        diasExtra = Math.floor(diffExtraMs / (1000 * 60 * 60 * 24)) + 1;
      }
    }

    return this._diasProgramados + diasExtra;
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
   * true solo si la fecha de salida pasó Y el huésped tiene una deuda real pendiente.
   */
  @Expose()
  get estaVencida(): boolean {
    if (this.estado === 'finalizado' || this.estado === 'pagado') return false;

    // Si aún no ha llegado la fecha de salida programada → no está vencida
    const ahora = new Date();
    const salidaProg = this.fecha_salida_programada
      ? new Date(this.fecha_salida_programada)
      : ahora;
    if (ahora <= salidaProg) return false;

    // Verificar si la deuda real hasta hoy supera S/. 0
    const pagado = Number(this.total_pagar || 0);
    const deuda = Math.max(0, this.montoAcumulado - pagado);
    return deuda > 0;
  }
}