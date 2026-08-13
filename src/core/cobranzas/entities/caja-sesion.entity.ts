export type EstadoCajaSesion = 'abierta' | 'cerrada';

export class CajaSesion {
  id!: string;
  usuarioId!: number;
  fecha_apertura!: Date;
  fecha_cierre?: Date | null;
  monto_inicial!: number;
  monto_ingresos!: number;
  monto_egresos!: number;
  monto_real_entregado?: number | null;
  descuadre?: number | null;
  estado: EstadoCajaSesion = 'abierta';
  observaciones?: string | null;
  
  conciliado: boolean = true;
  conciliado_por?: string | null;
  notas_conciliacion?: string | null;

  createdAt!: Date;
  updatedAt!: Date;

  usuario?: any;
}
