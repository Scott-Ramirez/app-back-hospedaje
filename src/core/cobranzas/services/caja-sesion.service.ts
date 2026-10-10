import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { ICajaSesionRepository } from '../interfaces/caja-sesion-repository.interface';
import { CajaSesion } from '../entities/caja-sesion.entity';
import { CobranzaSchema } from '../../../infrastructure/cobranzas/persistence/cobranza.schema';
import { Cobranza } from '../entities/cobranza.entity';
import { GastoSchema, Gasto } from '../../../infrastructure/bitacora/persistence/gasto.schema';
import { ActividadSchema, Actividad } from '../../../infrastructure/bitacora/persistence/actividad.schema';
import { NotificacionesGateway } from '../../../infrastructure/notificaciones/notificaciones.gateway';

@Injectable()
export class CajaSesionService {
  constructor(
    @Inject('ICajaSesionRepository')
    private readonly repository: ICajaSesionRepository,
    @InjectRepository(CobranzaSchema)
    private readonly cobranzaRepo: Repository<Cobranza>,
    @InjectRepository(GastoSchema)
    private readonly gastoRepo: Repository<Gasto>,
    @InjectRepository(ActividadSchema)
    private readonly actividadRepo: Repository<Actividad>,
    private readonly notificacionesGateway: NotificacionesGateway,
  ) {}

  async abrir(usuarioId: number, montoInicial: number, usuarioNombre: string): Promise<CajaSesion> {
    const activa = await this.repository.obtenerActivaPorUsuario(usuarioId);
    if (activa) {
      throw new BadRequestException('Ya tiene una sesión de caja abierta en su turno.');
    }

    // Consultar el último cierre para comprobar discrepancias de traspaso
    const infoUltimo = await this.obtenerUltimoCierre();
    const ultimoCierre = infoUltimo.ultimoMontoCierre;
    const difTraspaso = Number(montoInicial) - ultimoCierre;

    const nuevaSesion = await this.repository.crear({
      usuarioId,
      monto_inicial: Number(montoInicial),
      monto_ingresos: 0,
      monto_egresos: 0,
      estado: 'abierta',
      fecha_apertura: new Date(),
      conciliado: true, // Se abre limpia
    });

    // Si hay un turno previo y hay discrepancia de traspaso vs. lo que dejó el turno anterior (> 0.01 centavos)
    if (infoUltimo.tieneTurnoPrevio && Math.abs(difTraspaso) >= 0.01) {
      // 1. Guardar en bitácora de auditoría
      await this.actividadRepo.save(this.actividadRepo.create({
        usuario: usuarioNombre,
        accion: 'DISCREPANCIA_TRASPASO_CAJA',
        descripcion: `Recibió S/. ${Number(montoInicial).toFixed(2)}, pero el turno anterior dejó en caja S/. ${ultimoCierre.toFixed(2)} (Discrepancia: S/. ${difTraspaso.toFixed(2)})`,
      }));

      // 2. Notificar por WebSocket en tiempo real a Admin/Supervisor
      if (this.notificacionesGateway?.server) {
        this.notificacionesGateway.server.emit('caja.descuadre_traspaso', {
          tipo: 'discrepancia_traspaso',
          usuario: usuarioNombre,
          montoDeclarado: montoInicial,
          montoAnterior: ultimoCierre,
          diferencia: difTraspaso,
          timestamp: new Date(),
        });
      }
    }

    return nuevaSesion;
  }

  async obtenerActiva(usuarioId: number): Promise<CajaSesion | null> {
    const activa = await this.repository.obtenerActivaPorUsuario(usuarioId);
    if (!activa) return null;

    // Calcular ingresos y egresos en tiempo real asociados a este turno
    const cobranzas = await this.cobranzaRepo.find({
      where: { sesionCajaId: activa.id }
    });
    const gastos = await this.gastoRepo.find({
      where: { sesionCajaId: activa.id }
    });

    // Sumar ingresos (sólo cobranzas de tipo PAGO)
    let ingresos = 0;
    let ingresosEfectivo = 0;
    let ingresosDigital = 0;
    for (const c of cobranzas) {
      if (c.tipo === 'pago') {
        const monto = Number(c.monto);
        ingresos += monto;
        if (c.metodoPago === 'efectivo') {
          ingresosEfectivo += monto;
        } else {
          ingresosDigital += monto;
        }
      }
    }

    // Sumar egresos (monto del gasto)
    let egresos = 0;
    for (const g of gastos) {
      egresos += Number(g.monto);
    }

    activa.monto_ingresos = ingresos;
    activa.monto_ingresos_efectivo = ingresosEfectivo;
    activa.monto_ingresos_digital = ingresosDigital;
    activa.monto_egresos = egresos;

    return activa;
  }

  async cerrar(
    usuarioId: number,
    montoReal: number,
    observaciones?: string,
    montoEntregadoAdmin?: number,
    montoDejadoCaja?: number,
  ): Promise<CajaSesion> {
    const activa = await this.obtenerActiva(usuarioId);
    if (!activa) {
      throw new BadRequestException('No se encontró una sesión de caja abierta para cerrar.');
    }

    const ingresos = activa.monto_ingresos;
    const ingresosEfectivo = activa.monto_ingresos_efectivo;
    const ingresosDigital = activa.monto_ingresos_digital;
    const egresos = activa.monto_egresos;
    const inicial = activa.monto_inicial;

    const esperadoFisico = inicial + ingresosEfectivo - egresos;
    const descuadre = Number(montoReal) - esperadoFisico;
    const esDescuadrado = Math.abs(descuadre) >= 0.01;

    // Destino del efectivo contado:
    // Si el usuario especificó cuánto entrega a admin o cuánto deja en caja
    let entregadoAdmin = 0;
    let dejadoCaja = Number(montoReal);

    if (montoEntregadoAdmin !== undefined && montoEntregadoAdmin !== null) {
      entregadoAdmin = Number(montoEntregadoAdmin);
      dejadoCaja = montoDejadoCaja !== undefined && montoDejadoCaja !== null
        ? Number(montoDejadoCaja)
        : Math.max(0, Number(montoReal) - entregadoAdmin);
    } else if (montoDejadoCaja !== undefined && montoDejadoCaja !== null) {
      dejadoCaja = Number(montoDejadoCaja);
      entregadoAdmin = Math.max(0, Number(montoReal) - dejadoCaja);
    }

    const actualizada = await this.repository.actualizar(activa.id, {
      fecha_cierre: new Date(),
      monto_ingresos: ingresos,
      monto_ingresos_efectivo: ingresosEfectivo,
      monto_ingresos_digital: ingresosDigital,
      monto_egresos: egresos,
      monto_real_entregado: Number(montoReal),
      monto_entregado_admin: entregadoAdmin,
      monto_dejado_caja: dejadoCaja,
      descuadre,
      estado: 'cerrada',
      observaciones: observaciones || null,
      conciliado: !esDescuadrado, // false si hay descuadre, para que requiera aprobación admin
    });

    const recepcionista = activa.usuario?.nombre || `Usuario #${usuarioId}`;
    const descActividad = `Cierre de turno. Efectivo contado: S/. ${Number(montoReal).toFixed(2)} (Esperado: S/. ${esperadoFisico.toFixed(2)}). Entregado al Admin: S/. ${entregadoAdmin.toFixed(2)}. Fondo dejado en caja: S/. ${dejadoCaja.toFixed(2)}.${esDescuadrado ? ` Descuadre: S/. ${descuadre.toFixed(2)}` : ' (Cuadrada)'}`;

    // Guardar en bitácora de auditoría
    await this.actividadRepo.save(this.actividadRepo.create({
      usuario: recepcionista,
      accion: esDescuadrado ? 'CIERRE_CAJA_DESCUADRE' : 'CIERRE_CAJA',
      descripcion: descActividad,
    }));

    // Si se cerró con descuadre, alertamos en tiempo real
    if (esDescuadrado) {
      if (this.notificacionesGateway?.server) {
        this.notificacionesGateway.server.emit('caja.descuadre_cierre', {
          tipo: 'descuadre_cierre',
          usuario: recepcionista,
          montoEsperado: esperadoFisico,
          montoReal: Number(montoReal),
          descuadre,
          entregadoAdmin,
          dejadoCaja,
          observaciones: observaciones || 'Sin observaciones',
          timestamp: new Date(),
        });
      }
    }

    return actualizada;
  }

  async conciliar(id: string, notas: string, conciliadoPor: string): Promise<CajaSesion> {
    const sesion = await this.repository.obtenerPorId(id);
    if (!sesion) {
      throw new NotFoundException('Sesión de caja no encontrada.');
    }

    // Guardar en bitácora
    await this.actividadRepo.save(this.actividadRepo.create({
      usuario: conciliadoPor,
      accion: 'CAJA_CONCILIADA',
      descripcion: `Concilió descuadre de S/. ${(sesion.descuadre || 0).toFixed(2)} de la caja de ${sesion.usuario?.nombre || 'Usuario'}. Notas: ${notas}`,
    }));

    const conciliada = await this.repository.actualizar(id, {
      conciliado: true,
      conciliado_por: conciliadoPor,
      notas_conciliacion: notas,
    });

    // Enviar notificación en tiempo real al recepcionista y administradores
    if (this.notificacionesGateway?.server) {
      this.notificacionesGateway.server.emit('caja.conciliada', {
        id: conciliada.id,
        recepcionistaId: conciliada.usuarioId,
        recepcionistaNombre: sesion.usuario?.nombre || 'Recepcionista',
        conciliadoPor: conciliadoPor,
        descuadre: sesion.descuadre || 0,
        notas,
        fechaCierre: sesion.fecha_cierre,
        timestamp: new Date(),
      });
    }

    return conciliada;
  }

  async listarHistorial(limit = 10, offset = 0): Promise<[CajaSesion[], number]> {
    return await this.repository.listarTodas({ limit, offset });
  }

  async listarTodosLosPagos(): Promise<Cobranza[]> {
    return await this.cobranzaRepo.find({
      where: { tipo: 'pago' as any },
      relations: {
        estancia: {
          habitacion: true,
        },
        huesped: true,
        sesionCaja: {
          usuario: true,
        },
      },
      order: { fecha: 'DESC' },
    });
  }

  async obtenerUltimoCierre(): Promise<{
    ultimoMontoCierre: number;
    montoEntregadoAdmin: number;
    montoDejadoCaja: number;
    montoRealEntregado: number;
    tieneTurnoPrevio: boolean;
    nombreUsuarioCierre?: string;
    fechaCierre?: Date;
  }> {
    const ultimo = await this.repository.obtenerUltimaCerrada();
    if (!ultimo) {
      return {
        ultimoMontoCierre: 0,
        montoEntregadoAdmin: 0,
        montoDejadoCaja: 0,
        montoRealEntregado: 0,
        tieneTurnoPrevio: false,
      };
    }
    const dejado = ultimo.monto_dejado_caja !== undefined && ultimo.monto_dejado_caja !== null
      ? Number(ultimo.monto_dejado_caja)
      : Number(ultimo.monto_real_entregado || 0);

    return {
      ultimoMontoCierre: dejado,
      montoEntregadoAdmin: Number(ultimo.monto_entregado_admin || 0),
      montoDejadoCaja: dejado,
      montoRealEntregado: Number(ultimo.monto_real_entregado || 0),
      tieneTurnoPrevio: true,
      nombreUsuarioCierre: ultimo.usuario?.nombre || ultimo.usuario?.username || 'Turno anterior',
      fechaCierre: ultimo.fecha_cierre || undefined,
    };
  }
}
