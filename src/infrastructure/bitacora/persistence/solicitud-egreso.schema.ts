import { EntitySchema } from 'typeorm';

export interface SolicitudEgreso {
  id: string;
  usuarioId: number;
  usuarioNombre: string;
  monto: number;           // Monto estimado (paso 1)
  montoReal?: number;      // Monto real liquidado (paso 2)
  concepto: string;
  descripcion?: string;
  imagenUrl?: string;            // Boleta inicial (opcional en paso 1)
  boletaLiquidacionUrl?: string; // Boleta de liquidación (paso 2)
  estado: 'pendiente' | 'pre_aprobado' | 'liquidado' | 'rechazado' | 'aprobado';
  aprobadoPorId?: number | null;
  aprobadoPorNombre?: string | null;
  motivoRechazo?: string | null;
  sesionCajaId?: string | null;
  fecha: Date;
  fechaResolucion?: Date | null;
  fechaLiquidacion?: Date | null;
}

export const SolicitudEgresoSchema = new EntitySchema<SolicitudEgreso>({
  name: 'SolicitudEgreso',
  tableName: 'solicitudes_egreso',
  columns: {
    id: {
      type: 'uuid',
      primary: true,
      generated: 'uuid',
    },
    usuarioId: {
      type: 'int',
      name: 'usuario_id',
    },
    usuarioNombre: {
      type: String,
      length: 100,
      name: 'usuario_nombre',
    },
    monto: {
      type: 'decimal',
      precision: 10,
      scale: 2,
      transformer: {
        to: (v: number) => v,
        from: (v: string) => parseFloat(v),
      },
    },
    montoReal: {
      type: 'decimal',
      precision: 10,
      scale: 2,
      nullable: true,
      name: 'monto_real',
      transformer: {
        to: (v: number | undefined) => v ?? null,
        from: (v: string | null) => (v !== null ? parseFloat(v) : undefined),
      },
    },
    concepto: {
      type: String,
      length: 255,
    },
    descripcion: {
      type: 'text',
      nullable: true,
    },
    imagenUrl: {
      type: String,
      length: 500,
      nullable: true,
      name: 'imagen_url',
    },
    boletaLiquidacionUrl: {
      type: String,
      length: 500,
      nullable: true,
      name: 'boleta_liquidacion_url',
    },
    estado: {
      type: 'enum',
      enum: ['pendiente', 'pre_aprobado', 'liquidado', 'rechazado', 'aprobado'],
      default: 'pendiente',
    },
    aprobadoPorId: {
      type: 'int',
      nullable: true,
      name: 'aprobado_por_id',
    },
    aprobadoPorNombre: {
      type: String,
      length: 100,
      nullable: true,
      name: 'aprobado_por_nombre',
    },
    motivoRechazo: {
      type: 'text',
      nullable: true,
      name: 'motivo_rechazo',
    },
    sesionCajaId: {
      type: 'uuid',
      nullable: true,
      name: 'sesion_caja_id',
    },
    fecha: {
      type: 'timestamp',
      default: () => 'CURRENT_TIMESTAMP',
    },
    fechaResolucion: {
      type: 'timestamp',
      nullable: true,
      name: 'fecha_resolucion',
    },
    fechaLiquidacion: {
      type: 'timestamp',
      nullable: true,
      name: 'fecha_liquidacion',
    },
  },
});
