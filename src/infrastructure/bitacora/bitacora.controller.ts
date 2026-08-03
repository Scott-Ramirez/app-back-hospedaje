import { Controller, Get, Post, Body, Req, UseGuards, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActividadSchema, Actividad } from './persistence/actividad.schema';
import { GastoSchema, Gasto } from './persistence/gasto.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificacionesGateway } from '../notificaciones/notificaciones.gateway';
import { CajaSesionService } from '../../core/cobranzas/services/caja-sesion.service';

@Controller('bitacora')
@UseGuards(JwtAuthGuard)
export class BitacoraController {
  constructor(
    @InjectRepository(ActividadSchema)
    private readonly actividadRepo: Repository<Actividad>,
    @InjectRepository(GastoSchema)
    private readonly gastoRepo: Repository<Gasto>,
    private readonly notificacionesGateway: NotificacionesGateway,
    private readonly cajaSesionService: CajaSesionService,
  ) {}

  @Get('actividades')
  async listarActividades() {
    return await this.actividadRepo.find({ order: { fecha: 'DESC' } });
  }

  @Post('actividades')
  @HttpCode(HttpStatus.CREATED)
  async registrarActividad(@Req() req: any, @Body() dto: { accion: string; descripcion: string }) {
    const usuario = req.user.username;
    const nueva = this.actividadRepo.create({
      usuario,
      accion: dto.accion,
      descripcion: dto.descripcion,
    });
    const guardada = await this.actividadRepo.save(nueva);

    // Si el usuario es un recepcionista, notificamos en tiempo real a administradores y supervisores
    if (req.user.rol === 'recepcionista') {
      this.notificacionesGateway.server.emit('alerta.recepcionista', {
        tipo: 'actividad',
        usuario,
        accion: dto.accion,
        descripcion: dto.descripcion,
        timestamp: guardada.fecha,
      });
    }

    return guardada;
  }

  @Get('gastos')
  async listarGastos() {
    return await this.gastoRepo.find({ order: { fecha: 'DESC' } });
  }

  @Post('gastos')
  @HttpCode(HttpStatus.CREATED)
  async registrarGasto(@Req() req: any, @Body() dto: { monto: number; concepto: string }) {
    // Los recepcionistas NO pueden registrar gastos directamente
    // Deben usar el flujo de Solicitud de Egreso (adjuntando boleta)
    if (req.user.rol === 'recepcionista') {
      throw new BadRequestException(
        'Los recepcionistas no pueden registrar egresos directamente. Use la opción "Solicitar Egreso" adjuntando la boleta correspondiente.',
      );
    }

    const usuario = req.user.username;
    
    // Obtener la caja activa del usuario
    const activa = await this.cajaSesionService.obtenerActiva(req.user.id);

    const nuevo = this.gastoRepo.create({
      usuario,
      monto: dto.monto,
      concepto: dto.concepto,
      sesionCajaId: activa?.id || null,
    });
    const guardado = await this.gastoRepo.save(nuevo);

    // Registramos la actividad asociada al gasto
    const descActividad = `Retiró S/. ${Number(dto.monto).toFixed(2)} por concepto: ${dto.concepto}`;
    const nuevaActividad = this.actividadRepo.create({
      usuario,
      accion: 'GASTO',
      descripcion: descActividad,
    });
    await this.actividadRepo.save(nuevaActividad);

    return guardado;
  }
}
