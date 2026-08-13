import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificacionSchema } from './persistence/notificacion.schema';
import { NotificacionesController } from './notificaciones.controller';
import { NotificacionesGateway } from './notificaciones.gateway';
import { WhatsappNotificationListener } from './whatsapp-notification.listener';
import { ConfiguracionesModule } from '../configuraciones/configuraciones.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificacionSchema]),
    ConfiguracionesModule // <-- 2. Registrarlo aquí para tener acceso a su repositorio exportado
  ],
  controllers: [NotificacionesController],
  providers: [NotificacionesGateway, WhatsappNotificationListener],
  exports: [NotificacionesGateway, TypeOrmModule],
})
export class NotificacionesModule {}