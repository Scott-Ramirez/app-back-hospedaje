import { Module, forwardRef } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { join, extname } from 'path';
import { ActividadSchema } from './persistence/actividad.schema';
import { GastoSchema } from './persistence/gasto.schema';
import { SolicitudEgresoSchema } from './persistence/solicitud-egreso.schema';
import { BitacoraController } from './bitacora.controller';
import { SolicitudesEgresoController } from './solicitudes-egreso.controller';
import { BitacoraInterceptor } from './bitacora.interceptor';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { CobranzasModule } from '../cobranzas/cobranzas.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ActividadSchema, GastoSchema, SolicitudEgresoSchema]),
    MulterModule.register({
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads', 'boletas'),
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
          cb(null, `boleta-${unique}${extname(file.originalname)}`);
        },
      }),
    }),
    NotificacionesModule,
    forwardRef(() => CobranzasModule),
  ],
  controllers: [BitacoraController, SolicitudesEgresoController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: BitacoraInterceptor,
    },
  ],
  exports: [TypeOrmModule],
})
export class BitacoraModule {}
