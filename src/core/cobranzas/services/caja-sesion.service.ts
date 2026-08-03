import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { ICajaSesionRepository } from '../interfaces/caja-sesion-repository.interface';
import { CajaSesion } from '../entities/caja-sesion.entity';
import { CobranzaSchema } from '../../../infrastructure/cobranzas/persistence/cobranza.schema';
import { Cobranza } from '../entities/cobranza.entity';
import { GastoSchema, Gasto } from '../../../infrastructure/bitacora/persistence/gasto.schema';

@Injectable()
export class CajaSesionService {
  constructor(
    @Inject('ICajaSesionRepository')
    private readonly repository: ICajaSesionRepository,
    @InjectRepository(CobranzaSchema)
    private readonly cobranzaRepo: Repository<Cobranza>,
    @InjectRepository(GastoSchema)
    private readonly gastoRepo: Repository<Gasto>,
  ) {}

  async abrir(usuarioId: number, montoInicial: number): Promise<CajaSesion> {
    const activa = await this.repository.obtenerActivaPorUsuario(usuarioId);
    if (activa) {
      throw new Error('Ya tiene una sesión de caja abierta en su turno.');
    }

    return await this.repository.crear({
      usuarioId,
      monto_inicial: Number(montoInicial),
      monto_ingresos: 0,
      monto_egresos: 0,
      estado: 'abierta',
      fecha_apertura: new Date(),
    });
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
    for (const c of cobranzas) {
      if (c.tipo === 'pago') {
        ingresos += Number(c.monto);
      }
    }

    // Sumar egresos (monto del gasto)
    let egresos = 0;
    for (const g of gastos) {
      egresos += Number(g.monto);
    }

    activa.monto_ingresos = ingresos;
    activa.monto_egresos = egresos;

    return activa;
  }

  async cerrar(usuarioId: number, montoReal: number, observaciones?: string): Promise<CajaSesion> {
    const activa = await this.obtenerActiva(usuarioId);
    if (!activa) {
      throw new Error('No se encontró una sesión de caja abierta para cerrar.');
    }

    const ingresos = activa.monto_ingresos;
    const egresos = activa.monto_egresos;
    const inicial = activa.monto_inicial;

    const esperado = inicial + ingresos - egresos;
    const descuadre = Number(montoReal) - esperado;

    return await this.repository.actualizar(activa.id, {
      fecha_cierre: new Date(),
      monto_ingresos: ingresos,
      monto_egresos: egresos,
      monto_real_entregado: Number(montoReal),
      descuadre,
      estado: 'cerrada',
      observaciones: observaciones || null,
    });
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

  async obtenerUltimoCierre(): Promise<number> {
    const ultimo = await this.repository.obtenerUltimaCerrada();
    if (!ultimo) return 0;
    return Number(ultimo.monto_real_entregado || 0);
  }
}
