import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { tap } from 'rxjs/operators';
import { ActividadSchema, Actividad } from './persistence/actividad.schema';
import { NotificacionesGateway } from '../notificaciones/notificaciones.gateway';

@Injectable()
export class BitacoraInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(ActividadSchema)
    private readonly actividadRepo: Repository<Actividad>,
    private readonly notificacionesGateway: NotificacionesGateway,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    
    // Si no está autenticado, no podemos registrar quién hizo la acción
    if (!user) return next.handle();

    return next.handle().pipe(
      tap(async (responseBody) => {
        try {
          const method = req.method;
          const url = req.url;
          
          // Sólo queremos registrar acciones de escritura/mutación exitosas
          if (method === 'GET') return;

          let accion = 'OTRO';
          let descripcion = '';

          const username = user.username;
          const rol = user.rol;

          // Analizar la ruta y método
          if (url.includes('/huespedes')) {
            if (method === 'POST') {
              accion = 'CREAR_HUESPED';
              descripcion = `Huésped ${responseBody?.nombre || req.body?.nombre || ''} registrado por ${username}`;
            } else if (method === 'PATCH') {
              accion = 'ACTUALIZAR_HUESPED';
              descripcion = `Huésped ${responseBody?.nombre || req.body?.nombre || ''} actualizado por ${username}`;
            } else if (method === 'DELETE') {
              accion = 'ELIMINAR_HUESPED';
              descripcion = `Huésped con ID ${req.params?.id || ''} enviado a la papelera por ${username}`;
            }
          } else if (url.includes('/habitaciones')) {
            if (method === 'POST') {
              accion = 'CREAR_HABITACION';
              descripcion = `Habitación número ${responseBody?.numero || req.body?.numero || ''} creada por ${username}`;
            } else if (method === 'PATCH') {
              if (url.includes('/liberar')) {
                accion = 'LIBERAR_HABITACION';
                descripcion = `Habitación número ${responseBody?.numero || ''} liberada por ${username}`;
              } else {
                accion = 'ACTUALIZAR_HABITACION';
                descripcion = `Habitación número ${responseBody?.numero || req.body?.numero || ''} actualizada por ${username}`;
              }
            } else if (method === 'DELETE') {
              accion = 'ELIMINAR_HABITACION';
              descripcion = `Habitación número ${responseBody?.numero || ''} eliminada por ${username}`;
            }
          } else if (url.includes('/estancias')) {
            if (url.includes('/check-in-nuevo')) {
              accion = 'CHECK_IN';
              const pagoInicialText = req.body?.pago_inicial && Number(req.body.pago_inicial) > 0
                ? `, con un Pago Inicial de S/. ${Number(req.body.pago_inicial).toFixed(2)}`
                : '';
              
              const nombreHuesped = req.body?.nombre || responseBody?.huesped?.nombre || '';
              const dniHuesped = req.body?.dni || responseBody?.huesped?.dni || '';
              
              descripcion = `Check-In registrado para el huésped ${nombreHuesped} (DNI: ${dniHuesped}) por ${username}${pagoInicialText}`;
              
              // Emitir evento de ingreso de dinero si es recepcionista y hubo pago inicial
              if (rol === 'recepcionista' && req.body?.pago_inicial && Number(req.body.pago_inicial) > 0) {
                if (this.notificacionesGateway.server) {
                  this.notificacionesGateway.server.emit('alerta.recepcionista', {
                    tipo: 'ingreso',
                    usuario: username,
                    monto: Number(req.body.pago_inicial),
                    descripcion: `Ingreso de S/. ${Number(req.body.pago_inicial).toFixed(2)} por check-in de ${nombreHuesped}`,
                    timestamp: new Date(),
                  });
                }
              }
            } else if (url.includes('/check-out')) {
              accion = 'CHECK_OUT';
              const montoCobrado = responseBody?.montoCobrado ? Number(responseBody.montoCobrado) : 0;
              const cobroText = montoCobrado > 0 ? `, cobrando el saldo restante de S/. ${montoCobrado.toFixed(2)}` : '';
              const habNum = responseBody?.estancia?.habitacion?.numero || '';
              const habText = habNum ? ` de habitación ${habNum}` : '';

              descripcion = `Check-Out${habText} completado por ${username}${cobroText}`;

              // Emitir evento de ingreso si hay cobranza y es recepcionista
              if (rol === 'recepcionista' && montoCobrado > 0) {
                if (this.notificacionesGateway.server) {
                  this.notificacionesGateway.server.emit('alerta.recepcionista', {
                    tipo: 'ingreso',
                    usuario: username,
                    monto: montoCobrado,
                    descripcion: `Ingreso de S/. ${montoCobrado.toFixed(2)} por check-out${habText}`,
                    timestamp: new Date(),
                  });
                }
              }
            }
          } else if (url.includes('/configuraciones')) {
            if (method === 'PATCH') {
              accion = 'ACTUALIZAR_CONFIG';
              descripcion = `Configuración ${req.params?.llave || ''} actualizada por ${username}`;
            }
          } else if (url.includes('/auth/usuarios')) {
            if (url.includes('/registro')) {
              accion = 'REGISTRAR_EMPLEADO';
              descripcion = `Nuevo empleado ${req.body?.nombre || ''} registrado por ${username}`;
            } else if (url.includes('/reset-password')) {
              accion = 'RESET_PASSWORD';
              descripcion = `Contraseña del empleado con ID ${req.params?.id || ''} restablecida por ${username}`;
            }
          }

          if (descripcion) {
            // Guardar en la base de datos
            const nuevaActividad = this.actividadRepo.create({
              usuario: username,
              accion,
              descripcion,
            });
            const guardada = await this.actividadRepo.save(nuevaActividad);

            // Si el usuario que hizo el cambio es un recepcionista, notificar en tiempo real
            if (rol === 'recepcionista') {
              if (this.notificacionesGateway.server) {
                this.notificacionesGateway.server.emit('alerta.recepcionista', {
                  tipo: 'actividad',
                  usuario: username,
                  accion,
                  descripcion,
                  timestamp: guardada.fecha,
                });
              }
            }
          }
        } catch (innerErr) {
          // Capturar errores internos para no romper la petición HTTP principal si falla el logging
          console.error('Error interno en BitacoraInterceptor:', innerErr);
        }
      })
    );
  }
}
