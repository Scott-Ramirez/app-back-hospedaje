import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, createReadStream } from 'fs';
import type { Response } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ActividadSchema, Actividad } from './persistence/actividad.schema';
import { GastoSchema, Gasto } from './persistence/gasto.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificacionesGateway } from '../notificaciones/notificaciones.gateway';
import { CajaSesionService } from '../../core/cobranzas/services/caja-sesion.service';

const UPLOAD_GASTOS_DEST = join(process.cwd(), 'uploads', 'boletas');

const fileInterceptorConfig = FileInterceptor('comprobante', {
  storage: diskStorage({
    destination: UPLOAD_GASTOS_DEST,
    filename: (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
      cb(null, `gasto-${unique}${extname(file.originalname)}`);
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

@Controller('bitacora')
export class BitacoraController {
  constructor(
    @InjectRepository(ActividadSchema)
    private readonly actividadRepo: Repository<Actividad>,
    @InjectRepository(GastoSchema)
    private readonly gastoRepo: Repository<Gasto>,
    private readonly notificacionesGateway: NotificacionesGateway,
    private readonly cajaSesionService: CajaSesionService,
  ) {}

  // ─── SERVIR COMPROBANTE PÚBLICAMENTE ────────────────────────────────────────
  @Get('comprobante/:filename')
  servirComprobante(@Param('filename') filename: string, @Res() res: Response) {
    const filepath = join(UPLOAD_GASTOS_DEST, filename);
    if (!existsSync(filepath)) {
      throw new NotFoundException('El archivo de comprobante no existe');
    }
    const ext = extname(filename).toLowerCase();
    const mimeTypes: { [k: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
    };
    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    createReadStream(filepath).pipe(res);
  }

  @Get('actividades')
  @UseGuards(JwtAuthGuard)
  async listarActividades() {
    return await this.actividadRepo.find({ order: { fecha: 'DESC' } });
  }

  @Post('actividades')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async registrarActividad(@Req() req: any, @Body() dto: { accion: string; descripcion: string }) {
    const usuario = req.user.username;
    const nueva = this.actividadRepo.create({
      usuario,
      accion: dto.accion,
      descripcion: dto.descripcion,
    });
    const guardada = await this.actividadRepo.save(nueva);

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
  @UseGuards(JwtAuthGuard)
  async listarGastos(
    @Query('mes') mes?: string,
    @Query('anio') anio?: string,
    @Query('categoria') categoria?: string,
  ) {
    const where: any = {};
    if (categoria) {
      where.categoria = categoria;
    }
    if (mes && anio) {
      const m = parseInt(mes, 10);
      const a = parseInt(anio, 10);
      const inicio = new Date(a, m, 1, 0, 0, 0);
      const fin = new Date(a, m + 1, 0, 23, 59, 59);
      where.fecha = Between(inicio, fin);
    }
    return await this.gastoRepo.find({
      where,
      order: { fecha: 'DESC' },
    });
  }

  @Post('gastos')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async registrarGasto(
    @Req() req: any,
    @Body() dto: { monto: number; concepto: string; categoria?: string; observaciones?: string },
  ) {
    if (req.user.rol === 'recepcionista') {
      throw new BadRequestException(
        'Los recepcionistas no pueden registrar egresos directamente. Use la opción "Solicitar Egreso" adjuntando la boleta correspondiente.',
      );
    }

    const usuario = req.user.username;
    const activa = await this.cajaSesionService.obtenerActiva(req.user.id);

    const nuevo = this.gastoRepo.create({
      usuario,
      monto: dto.monto,
      concepto: dto.concepto,
      categoria: dto.categoria || 'caja_chica',
      observaciones: dto.observaciones || null,
      sesionCajaId: activa?.id || null,
    });
    const guardado = await this.gastoRepo.save(nuevo);

    const descActividad = `Retiró S/. ${Number(dto.monto).toFixed(2)} por concepto: ${dto.concepto}`;
    const nuevaActividad = this.actividadRepo.create({
      usuario,
      accion: 'GASTO',
      descripcion: descActividad,
    });
    await this.actividadRepo.save(nuevaActividad);

    return guardado;
  }

  // ─── GASTOS ADMINISTRATIVOS (Personal, Servicios, Mantenimiento) ────────────
  @Post('gastos-administrativos')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(fileInterceptorConfig)
  async registrarGastoAdministrativo(
    @Req() req: any,
    @UploadedFile() file: any,
    @Body() body: any,
  ) {
    if (req.user.rol === 'recepcionista') {
      throw new BadRequestException('Solo administradores y supervisores pueden registrar gastos administrativos.');
    }

    const monto = parseFloat(body.monto);
    if (isNaN(monto) || monto <= 0) {
      throw new BadRequestException('El monto del gasto debe ser mayor a S/. 0.00');
    }

    if (!body.concepto?.trim()) {
      throw new BadRequestException('El concepto del gasto es obligatorio');
    }

    const usuario = req.user.nombre || req.user.username;
    const categoria = body.categoria || 'otros';
    const fechaGasto = body.fecha ? new Date(body.fecha) : new Date();
    const comprobanteUrl = file ? `/uploads/boletas/${file.filename}` : null;

    const nuevoGasto = this.gastoRepo.create({
      usuario,
      monto,
      concepto: body.concepto.trim(),
      categoria,
      observaciones: body.observaciones?.trim() || null,
      comprobante_url: comprobanteUrl,
      fecha: fechaGasto,
      periodo_mes: fechaGasto.getMonth(),
      periodo_anio: fechaGasto.getFullYear(),
    });

    const guardado = await this.gastoRepo.save(nuevoGasto);

    // Registrar actividad
    const catTexto = categoria === 'personal' ? 'Pago de Personal' : (categoria === 'servicios' ? 'Servicios Básicos' : categoria);
    await this.actividadRepo.save(
      this.actividadRepo.create({
        usuario,
        accion: 'GASTO_ADMIN',
        descripcion: `Registró gasto administrativo [${catTexto}]: S/. ${monto.toFixed(2)} — ${body.concepto.trim()}`,
      }),
    );

    return guardado;
  }

  @Delete('gastos-administrativos/:id')
  @UseGuards(JwtAuthGuard)
  async eliminarGastoAdministrativo(@Req() req: any, @Param('id') id: string) {
    if (req.user.rol === 'recepcionista') {
      throw new BadRequestException('Solo administradores pueden eliminar gastos.');
    }

    const gasto = await this.gastoRepo.findOne({ where: { id } });
    if (!gasto) {
      throw new NotFoundException('Gasto no encontrado');
    }

    await this.gastoRepo.remove(gasto);

    await this.actividadRepo.save(
      this.actividadRepo.create({
        usuario: req.user.nombre || req.user.username,
        accion: 'ELIMINAR_GASTO',
        descripcion: `Eliminó el gasto: S/. ${Number(gasto.monto).toFixed(2)} — ${gasto.concepto}`,
      }),
    );

    return { mensaje: 'Gasto eliminado exitosamente' };
  }
}
