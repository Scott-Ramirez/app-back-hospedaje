import {
  Controller, Get, Patch, Param, Req, Res,
  UseGuards, UseInterceptors, UploadedFile, BadRequestException,
  NotFoundException, HttpCode, HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CobranzaSchema } from './persistence/cobranza.schema';
import { Cobranza } from '../../core/cobranzas/entities/cobranza.entity';

// Directorio de almacenamiento local de comprobantes de pago
const UPLOAD_DEST = join(process.cwd(), 'uploads', 'pagos');

const fileInterceptorConfig = FileInterceptor('evidencia', {
  storage: diskStorage({
    destination: UPLOAD_DEST,
    filename: (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
      cb(null, `pago-${unique}${extname(file.originalname)}`);
    },
  }),
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
    if (!allowed.includes(extname(file.originalname).toLowerCase())) {
      return cb(new BadRequestException('Solo se permiten imágenes JPG, PNG, WEBP o comprobantes en PDF'), false);
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB máximo
});

@Controller('caja-sesiones/pagos')
export class PagosEvidenciaController {
  constructor(
    @InjectRepository(CobranzaSchema)
    private readonly cobranzaRepo: Repository<Cobranza>,
  ) {}

  // ─── Subir evidencia para un pago en particular ────────────────────────────
  @Patch(':id/evidencia')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(fileInterceptorConfig)
  async subirEvidencia(
    @Param('id') id: string,
    @UploadedFile() file: any,
  ) {
    if (!file) {
      throw new BadRequestException('Debe adjuntar la imagen o archivo de la evidencia.');
    }

    const pago = await this.cobranzaRepo.findOne({ where: { id } });
    if (!pago) {
      throw new NotFoundException('Pago o cobranza no encontrado.');
    }

    // Guardar la ruta relativa del archivo
    pago.evidenciaUrl = `/uploads/pagos/${file.filename}`;
    await this.cobranzaRepo.save(pago);

    return {
      message: 'Evidencia de pago registrada correctamente.',
      pago,
    };
  }

  // ─── Sirve los comprobantes guardados localmente ──────────────────────────
  @Get('evidencia/:filename')
  servirEvidencia(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = join(UPLOAD_DEST, filename);
    res.sendFile(filePath, (err) => {
      if (err) res.status(404).json({ message: 'Comprobante no encontrado' });
    });
  }
}
