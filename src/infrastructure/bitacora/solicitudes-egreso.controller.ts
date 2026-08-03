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

  // ─── Recepcionista envía solicitud con imagen de boleta ───────────────────
  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('boleta', {
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
    }),
  )
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
      // El recepcionista sólo ve sus propias solicitudes
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

  // ─── Admin/Supervisor APRUEBA la solicitud → descuenta de caja ───────────
  @Patch(':id/aprobar')
  @UseGuards(JwtAuthGuard)
  async aprobar(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body: { observaciones?: string },
  ) {
    if (req.user.rol === 'recepcionista') {
      throw new ForbiddenException('No tiene permisos para aprobar solicitudes.');
    }

    const solicitud = await this.solicitudRepo.findOne({ where: { id } });
    if (!solicitud) throw new NotFoundException('Solicitud no encontrada.');
    if (solicitud.estado !== 'pendiente') {
      throw new BadRequestException(`La solicitud ya fue ${solicitud.estado}.`);
    }

    // Actualizar estado
    solicitud.estado = 'aprobado';
    solicitud.aprobadoPorId = req.user.id;
    solicitud.aprobadoPorNombre = req.user.nombre || req.user.username;
    solicitud.fechaResolucion = new Date();
    await this.solicitudRepo.save(solicitud);

    // Crear el gasto real en caja
    const gasto = this.gastoRepo.create({
      usuario: solicitud.usuarioNombre,
      monto: solicitud.monto,
      concepto: `[Aprobado por ${solicitud.aprobadoPorNombre}] ${solicitud.concepto}`,
      sesionCajaId: solicitud.sesionCajaId || undefined,
    });
    await this.gastoRepo.save(gasto);

    // Registrar en bitácora
    const actividad = this.actividadRepo.create({
      usuario: req.user.nombre || req.user.username,
      accion: 'EGRESO_APROBADO',
      descripcion: `Aprobó egreso de S/. ${solicitud.monto.toFixed(2)} de ${solicitud.usuarioNombre}: ${solicitud.concepto}`,
    });
    await this.actividadRepo.save(actividad);

    // Notificar al recepcionista que su solicitud fue aprobada
    console.log(`[WebSocket Server] Emitiendo 'solicitud.egreso.resuelta' para el recepcionista ID ${solicitud.usuarioId} (Monto: S/. ${solicitud.monto})`);
    this.notificacionesGateway.server.emit('solicitud.egreso.resuelta', {
      id: solicitud.id,
      estado: 'aprobado',
      recepcionistaId: solicitud.usuarioId,
      aprobadoPor: solicitud.aprobadoPorNombre,
      monto: solicitud.monto,
      concepto: solicitud.concepto,
      timestamp: solicitud.fechaResolucion,
    });

    return { message: 'Solicitud aprobada y egreso registrado en caja.', solicitud };
  }

  // ─── Admin/Supervisor RECHAZA la solicitud ────────────────────────────────
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
    if (solicitud.estado !== 'pendiente') {
      throw new BadRequestException(`La solicitud ya fue ${solicitud.estado}.`);
    }

    solicitud.estado = 'rechazado';
    solicitud.aprobadoPorId = req.user.id;
    solicitud.aprobadoPorNombre = req.user.nombre || req.user.username;
    solicitud.motivoRechazo = body.motivoRechazo?.trim() || 'Sin motivo especificado.';
    solicitud.fechaResolucion = new Date();
    await this.solicitudRepo.save(solicitud);

    // Notificar al recepcionista que su solicitud fue rechazada
    console.log(`[WebSocket Server] Emitiendo 'solicitud.egreso.resuelta' (RECHAZADA) para el recepcionista ID ${solicitud.usuarioId} (Monto: S/. ${solicitud.monto})`);
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
}
