import {
  Controller, Get, Post, Patch, Body, Param, Req, Res,
  UseGuards, UseInterceptors, UploadedFile, BadRequestException,
  ForbiddenException, NotFoundException, HttpCode, HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SolicitudEgresoSchema, SolicitudEgreso } from '../bitacora/persistence/solicitud-egreso.schema';
import { GastoSchema, Gasto } from '../bitacora/persistence/gasto.schema';
import { ActividadSchema, Actividad } from '../bitacora/persistence/actividad.schema';
import { NotificacionesGateway } from '../notificaciones/notificaciones.gateway';
import { CajaSesionService } from '../../core/cobranzas/services/caja-sesion.service';

// Directorio de almacenamiento local de imágenes
const UPLOAD_DEST = join(process.cwd(), 'uploads', 'boletas');

const fileInterceptorConfig = FileInterceptor('boleta', {
  storage: diskStorage({
    destination: UPLOAD_DEST,
    filename: (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
      cb(null, `boleta-${unique}${extname(file.originalname)}`);
    },
  }),
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
    if (!allowed.includes(extname(file.originalname).toLowerCase())) {
      return cb(new BadRequestException('Solo se permiten imágenes JPG, PNG, WEBP o PDF'), false);
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB máximo
});

@Controller('solicitudes-egreso')
export class SolicitudesEgresoController {
  constructor(
    @InjectRepository(SolicitudEgresoSchema)
    private readonly solicitudRepo: Repository<SolicitudEgreso>,
    @InjectRepository(GastoSchema)
    private readonly gastoRepo: Repository<Gasto>,
    @InjectRepository(ActividadSchema)
    private readonly actividadRepo: Repository<Actividad>,
    private readonly notificacionesGateway: NotificacionesGateway,
    private readonly cajaSesionService: CajaSesionService,
  ) {}

  // ─── PASO 1: Recepcionista crea solicitud (boleta opcional) ───────────────
  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(fileInterceptorConfig)
  async crearSolicitud(
    @Req() req: any,
    @UploadedFile() file: any,
    @Body() body: { monto: string; concepto: string; descripcion?: string },
  ) {
    const monto = parseFloat(body.monto);
    if (isNaN(monto) || monto <= 0) {
      throw new BadRequestException('El monto debe ser un número mayor a 0.');
    }
    if (!body.concepto?.trim()) {
      throw new BadRequestException('El concepto es obligatorio.');
    }

    const activa = await this.cajaSesionService.obtenerActiva(req.user.id);
    if (req.user.rol === 'recepcionista' && !activa) {
      throw new BadRequestException('Debe tener una caja abierta para enviar solicitudes de egreso.');
    }

    const imagenUrl = file ? `/uploads/boletas/${file.filename}` : undefined;

    const solicitud = this.solicitudRepo.create({
      usuarioId: req.user.id,
      usuarioNombre: req.user.nombre || req.user.username,
      monto,
      concepto: body.concepto.trim(),
      descripcion: body.descripcion?.trim() || undefined,
      imagenUrl,
      estado: 'pendiente',
      sesionCajaId: activa?.id || undefined,
    });

    const guardada = await this.solicitudRepo.save(solicitud);

    // Notificar por WebSocket a admin y supervisor
    this.notificacionesGateway.server.emit('solicitud.egreso.nueva', {
      id: guardada.id,
      recepcionista: req.user.nombre || req.user.username,
      monto,
      concepto: body.concepto,
      descripcion: body.descripcion,
      imagenUrl,
      timestamp: guardada.fecha,
    });

    return guardada;
  }

  // ─── Admin/Supervisor lista todas las solicitudes ─────────────────────────
  @Get()
  @UseGuards(JwtAuthGuard)
  async listar(@Req() req: any) {
    if (req.user.rol === 'recepcionista') {
      return await this.solicitudRepo.find({
        where: { usuarioId: req.user.id },
        order: { fecha: 'DESC' },
      });
    }
    return await this.solicitudRepo.find({ order: { fecha: 'DESC' } });
  }

  // ─── Sirve las imágenes guardadas localmente ──────────────────────────────
  @Get('imagen/:filename')
  servirImagen(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = join(UPLOAD_DEST, filename);
    res.sendFile(filePath, (err) => {
      if (err) res.status(404).json({ message: 'Imagen no encontrada' });
    });
  }

  // ─── PASO 1b: Admin/Supervisor PRE-APRUEBA (no descuenta caja) ───────────
  @Patch(':id/pre-aprobar')
  @UseGuards(JwtAuthGuard)
  async preAprobar(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body: { observaciones?: string },
  ) {
    if (req.user.rol === 'recepcionista') {
      throw new ForbiddenException('No tiene permisos para pre-aprobar solicitudes.');
    }

    const solicitud = await this.solicitudRepo.findOne({ where: { id } });
    if (!solicitud) throw new NotFoundException('Solicitud no encontrada.');
    if (solicitud.estado !== 'pendiente') {
      throw new BadRequestException(`La solicitud ya fue ${solicitud.estado}.`);
    }

    solicitud.estado = 'pre_aprobado';
    solicitud.aprobadoPorId = req.user.id;
    solicitud.aprobadoPorNombre = req.user.nombre || req.user.username;
    solicitud.fechaResolucion = new Date();
    await this.solicitudRepo.save(solicitud);

    // Registrar en bitácora
    await this.actividadRepo.save(this.actividadRepo.create({
      usuario: req.user.nombre || req.user.username,
      accion: 'EGRESO_PRE_APROBADO',
      descripcion: `Pre-aprobó egreso estimado de S/. ${solicitud.monto.toFixed(2)} de ${solicitud.usuarioNombre}: ${solicitud.concepto}`,
    }));

    // Notificar al recepcionista para que pueda comprar
    this.notificacionesGateway.server.emit('solicitud.egreso.pre_aprobada', {
      id: solicitud.id,
      estado: 'pre_aprobado',
      recepcionistaId: solicitud.usuarioId,
      aprobadoPor: solicitud.aprobadoPorNombre,
      monto: solicitud.monto,
      concepto: solicitud.concepto,
      timestamp: solicitud.fechaResolucion,
    });

    return { message: 'Solicitud pre-aprobada. El recepcionista puede realizar la compra.', solicitud };
  }

  // ─── PASO 2a: Recepcionista ADJUNTA BOLETA después de comprar ─────────────
  @Patch(':id/adjuntar-boleta')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(fileInterceptorConfig)
  async adjuntarBoleta(
    @Param('id') id: string,
    @Req() req: any,
    @UploadedFile() file: any,
    @Body() body: { montoReal: string },
  ) {
    const solicitud = await this.solicitudRepo.findOne({ where: { id } });
    if (!solicitud) throw new NotFoundException('Solicitud no encontrada.');

    // Solo el recepcionista dueño puede adjuntar
    if (req.user.rol === 'recepcionista' && solicitud.usuarioId !== req.user.id) {
      throw new ForbiddenException('Solo puede adjuntar boleta a sus propias solicitudes.');
    }

    if (solicitud.estado !== 'pre_aprobado') {
      throw new BadRequestException('Solo se puede adjuntar boleta a solicitudes pre-aprobadas.');
    }

    const montoReal = parseFloat(body.montoReal);
    if (isNaN(montoReal) || montoReal <= 0) {
      throw new BadRequestException('El monto real debe ser mayor a 0.');
    }

    if (!file) {
      throw new BadRequestException('Debe adjuntar la imagen de la boleta.');
    }

    solicitud.montoReal = montoReal;
    solicitud.boletaLiquidacionUrl = `/uploads/boletas/${file.filename}`;
    await this.solicitudRepo.save(solicitud);

    // Notificar a admin/supervisor que la boleta está lista para liquidar
    this.notificacionesGateway.server.emit('solicitud.egreso.boleta_adjuntada', {
      id: solicitud.id,
      recepcionista: solicitud.usuarioNombre,
      montoEstimado: solicitud.monto,
      montoReal,
      concepto: solicitud.concepto,
    });

    return { message: 'Boleta adjuntada correctamente. Esperando liquidación.', solicitud };
  }

  // ─── PASO 2b: Admin/Supervisor LIQUIDA → descuenta de caja ───────────────
  @Patch(':id/liquidar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(fileInterceptorConfig)
  async liquidar(
    @Param('id') id: string,
    @Req() req: any,
    @UploadedFile() file: any,
    @Body() body: { montoReal?: string; observaciones?: string },
  ) {
    if (req.user.rol === 'recepcionista') {
      throw new ForbiddenException('No tiene permisos para liquidar solicitudes.');
    }

    const solicitud = await this.solicitudRepo.findOne({ where: { id } });
    if (!solicitud) throw new NotFoundException('Solicitud no encontrada.');
    if (solicitud.estado !== 'pre_aprobado') {
      throw new BadRequestException(`Solo se pueden liquidar solicitudes pre-aprobadas. Estado actual: ${solicitud.estado}.`);
    }

    // El monto real puede venir del body (si el admin lo corrige) o del que subió el recepcionista
    const montoFinal = body.montoReal
      ? parseFloat(body.montoReal)
      : (solicitud.montoReal ?? solicitud.monto);

    if (isNaN(montoFinal) || montoFinal <= 0) {
      throw new BadRequestException('El monto real debe ser mayor a 0.');
    }

    // Si el admin adjunta una nueva boleta, la usamos
    if (file) {
      solicitud.boletaLiquidacionUrl = `/uploads/boletas/${file.filename}`;
    }

    solicitud.estado = 'liquidado';
    solicitud.montoReal = montoFinal;
    solicitud.fechaLiquidacion = new Date();
    await this.solicitudRepo.save(solicitud);

    // Crear el gasto real en caja con el MONTO REAL
    const gasto = this.gastoRepo.create({
      usuario: solicitud.usuarioNombre,
      monto: montoFinal,
      concepto: `[Liquidado por ${req.user.nombre || req.user.username}] ${solicitud.concepto}`,
      sesionCajaId: solicitud.sesionCajaId || undefined,
    });
    await this.gastoRepo.save(gasto);

    // Registrar en bitácora
    await this.actividadRepo.save(this.actividadRepo.create({
      usuario: req.user.nombre || req.user.username,
      accion: 'EGRESO_LIQUIDADO',
      descripcion: `Liquidó egreso de S/. ${montoFinal.toFixed(2)} (estimado S/. ${solicitud.monto.toFixed(2)}) de ${solicitud.usuarioNombre}: ${solicitud.concepto}`,
    }));

    // Notificar al recepcionista
    this.notificacionesGateway.server.emit('solicitud.egreso.resuelta', {
      id: solicitud.id,
      estado: 'liquidado',
      recepcionistaId: solicitud.usuarioId,
      aprobadoPor: req.user.nombre || req.user.username,
      montoReal: montoFinal,
      concepto: solicitud.concepto,
      timestamp: solicitud.fechaLiquidacion,
    });

    return { message: `Egreso liquidado y registrado en caja por S/. ${montoFinal.toFixed(2)}.`, solicitud };
  }

  // ─── Admin/Supervisor RECHAZA (en cualquier etapa previa a liquidación) ───
  @Patch(':id/rechazar')
  @UseGuards(JwtAuthGuard)
  async rechazar(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body: { motivoRechazo?: string },
  ) {
    if (req.user.rol === 'recepcionista') {
      throw new ForbiddenException('No tiene permisos para rechazar solicitudes.');
    }

    const solicitud = await this.solicitudRepo.findOne({ where: { id } });
    if (!solicitud) throw new NotFoundException('Solicitud no encontrada.');
    if (solicitud.estado === 'liquidado') {
      throw new BadRequestException('No se puede rechazar una solicitud ya liquidada.');
    }
    if (solicitud.estado === 'rechazado') {
      throw new BadRequestException('La solicitud ya fue rechazada.');
    }

    solicitud.estado = 'rechazado';
    solicitud.aprobadoPorId = req.user.id;
    solicitud.aprobadoPorNombre = req.user.nombre || req.user.username;
    solicitud.motivoRechazo = body.motivoRechazo?.trim() || 'Sin motivo especificado.';
    solicitud.fechaResolucion = new Date();
    await this.solicitudRepo.save(solicitud);

    this.notificacionesGateway.server.emit('solicitud.egreso.resuelta', {
      id: solicitud.id,
      estado: 'rechazado',
      recepcionistaId: solicitud.usuarioId,
      rechazadoPor: solicitud.aprobadoPorNombre,
      motivo: solicitud.motivoRechazo,
      monto: solicitud.monto,
      concepto: solicitud.concepto,
      timestamp: solicitud.fechaResolucion,
    });

    return { message: 'Solicitud rechazada.', solicitud };
  }

  // ─── Legacy: mantener /aprobar por retrocompatibilidad ────────────────────
  @Patch(':id/aprobar')
  @UseGuards(JwtAuthGuard)
  async aprobar(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    // Redirige internamente al flujo de pre-aprobar
    return this.preAprobar(id, req, {});
  }
}
