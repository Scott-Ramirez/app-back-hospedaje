import { Module } from '@nestjs/common';
import { NotificacionesGateway } from './notificaciones.gateway';
import { WhatsappNotificationListener } from './whatsapp-notification.listener';
import { ConfiguracionesModule } from '../configuraciones/configuraciones.module';

@Module({
  imports: [
    ConfiguracionesModule // <-- 2. Registrarlo aquí para tener acceso a su repositorio exportado
  ],
  providers: [NotificacionesGateway, WhatsappNotificationListener],
  exports: [NotificacionesGateway],
})
export class NotificacionesModule {}