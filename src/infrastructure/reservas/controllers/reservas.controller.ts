import {
  Controller, Get, Post, Patch, Param, Body, UseGuards,
  UseInterceptors, UploadedFile, BadRequestException, Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CrearReservaUseCase } from '../../../core/reservas/use-cases/crear-reserva.use-case';
import { ObtenerReservasUseCase } from '../../../core/reservas/use-cases/obtener-reservas.use-case';
import { CancelarReservaUseCase } from '../../../core/reservas/use-cases/cancelar-reserva.use-case';
import { ConvertirReservaEstanciaUseCase } from '../../../core/reservas/use-cases/convertir-reserva-estancia.use-case';
import { CrearReservaDto } from '../dtos/crear-reserva.dto';

const UPLOAD_DEST = join(process.cwd(), 'uploads', 'pagos');

const fileInterceptorConfig = FileInterceptor('comprobante', {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      if (!fs.existsSync(UPLOAD_DEST)) {
        fs.mkdirSync(UPLOAD_DEST, { recursive: true });
      }
      cb(null, UPLOAD_DEST);
    },
    filename: (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
      cb(null, `reserva-${unique}${extname(file.originalname)}`);
    },
  }),
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
    if (!allowed.includes(extname(file.originalname).toLowerCase())) {
      return cb(new BadRequestException('Solo se permiten imágenes JPG, PNG, WEBP o PDF'), false);
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

@Controller('reservas')
export class ReservasController {
  constructor(
    private readonly crearReservaUseCase: CrearReservaUseCase,
    private readonly obtenerReservasUseCase: ObtenerReservasUseCase,
    private readonly cancelarReservaUseCase: CancelarReservaUseCase,
    private readonly convertirReservaEstanciaUseCase: ConvertirReservaEstanciaUseCase,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async listarTodas() {
    return await this.obtenerReservasUseCase.execute();
  }

  @Get('proximas')
  @UseGuards(JwtAuthGuard)
  async listarProximas() {
    return await this.obtenerReservasUseCase.obtenerProximas();
  }

  @Post('upload-comprobante')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(fileInterceptorConfig)
  async uploadComprobante(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('No se adjuntó ningún archivo de comprobante');
    }
    return {
      comprobante_url: `/uploads/pagos/${file.filename}`,
      filename: file.filename,
    };
  }

  // ─── Endpoint público para renderizar imágenes en <img> o abrir en navegador ───
  @Get('comprobante/:filename')
  servirComprobante(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = join(UPLOAD_DEST, filename);
    res.sendFile(filePath, (err) => {
      if (err) res.status(404).json({ message: 'Comprobante no encontrado' });
    });
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async crear(@Body() dto: CrearReservaDto) {
    return await this.crearReservaUseCase.execute(dto);
  }

  @Patch(':id/cancelar')
  @UseGuards(JwtAuthGuard)
  async cancelar(@Param('id') id: string) {
    await this.cancelarReservaUseCase.execute(id);
    return { mensaje: 'Reserva cancelada correctamente' };
  }

  @Post(':id/checkin')
  @UseGuards(JwtAuthGuard)
  async checkIn(@Param('id') id: string, @Body('sesionCajaId') sesionCajaId?: string) {
    const estancia = await this.convertirReservaEstanciaUseCase.execute(id, sesionCajaId);
    return {
      mensaje: 'Check-In procesado exitosamente a partir de la reserva',
      estancia,
    };
  }
}
