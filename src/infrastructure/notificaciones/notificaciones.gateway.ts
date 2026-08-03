import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';

// Abrimos el canal de comunicación en el namespace 'notificaciones' y permitimos CORS de cualquier origen
@WebSocketGateway({
    namespace: 'notificaciones',
    cors: { origin: '*' },
})
export class NotificacionesGateway implements OnGatewayConnection, OnGatewayDisconnect {

    @WebSocketServer()
    server!: Server;

    // Se ejecuta cuando la pantalla del recepcionista o limpieza abre el sistema
    handleConnection(client: Socket) {
        console.log(`🔌 Cliente conectado a Notificaciones: ${client.id}`);
    }

    // Se ejecuta si cierran la pestaña del navegador
    handleDisconnect(client: Socket) {
        console.log(`❌ Cliente desconectado de Notificaciones: ${client.id}`);
    }

    /**
     * Este método escucha de forma automática el "grito" del caso de uso Check-out
     * y retransmite la alerta al instante a todos los clientes conectados por WebSockets.
     */
    @OnEvent('estancia.finalizada')
    manejarEstanciaFinalizada(payload: { id: string; habitacionNumero: string; mensaje: string }) {
        console.log(`🔔 Evento interno recibido. Retransmitiendo alerta para habitación: ${payload.habitacionNumero}`);

        // Emitimos el evento hacia el Front-end
        this.server.emit('alerta.limpieza', {
            habitacionNumero: payload.habitacionNumero,
            mensaje: payload.mensaje,
            timestamp: new Date(),
        });
    }

    /**
     * Retransmite al instante cuando un recepcionista envía una solicitud de egreso.
     * Admin y supervisor verán la notificación en tiempo real en su panel.
     */
    @OnEvent('solicitud.egreso.nueva')
    manejarSolicitudEgresoNueva(payload: any) {
        console.log(`💸 Nueva solicitud de egreso de: ${payload.recepcionista} — S/. ${payload.monto}`);
        this.server.emit('solicitud.egreso.nueva', payload);
    }
}