import { Injectable, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard JWT extendido:
 * Además de validar que el token sea válido y vigente, verifica si el usuario
 * tiene la bandera 'debeChangiarPassword' activa en su payload.
 * Si es así, bloquea CUALQUIER endpoint excepto el de cambio de contraseña.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {

  // Rutas que se permiten aunque el usuario deba cambiar su contraseña
  private readonly RUTAS_PERMITIDAS_CON_PASSWORD_PENDIENTE = [
    '/api/v1/auth/cambiar-password',
  ];

  canActivate(context: ExecutionContext) {
    // Primero dejamos que el AuthGuard de Passport valide el token JWT
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // Si hubo un error de autenticación, lo propagamos normalmente
    if (err || !user) {
      throw err || new ForbiddenException('No autenticado');
    }

    // Si el usuario tiene el flag debeChangiarPassword activo en su JWT...
    if (user.debeChangiarPassword === true) {
      const request = context.switchToHttp().getRequest();
      const rutaActual = request.url;

      // ...solo permitimos que acceda al endpoint de cambio de contraseña
      const rutaPermitida = this.RUTAS_PERMITIDAS_CON_PASSWORD_PENDIENTE
        .some(ruta => rutaActual.includes('cambiar-password'));

      if (!rutaPermitida) {
        throw new ForbiddenException(
          'Debes cambiar tu contraseña antes de continuar. ' +
          'Accede a PATCH /api/v1/auth/cambiar-password para hacerlo.'
        );
      }
    }

    // --- NUEVO: Validar turno de trabajo en tiempo de ejecución ---
    if (user.horaInicioTurno && user.horaFinTurno) {
      const horaPeru = new Intl.DateTimeFormat('es-PE', {
        timeZone: 'America/Lima',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date());

      const [actualH, actualM] = horaPeru.split(':').map(Number);
      const [inicioH, inicioM] = user.horaInicioTurno.split(':').map(Number);
      const [finH, finM] = user.horaFinTurno.split(':').map(Number);

      const minutosActual = actualH * 60 + actualM;
      const minutosInicio = inicioH * 60 + inicioM;
      
      // Margen de gracia de 30 minutos al fin del turno
      const minutosFinConGracia = (finH * 60 + finM + 30) % 1440;

      let esValido = false;
      if (minutosInicio < minutosFinConGracia) {
        esValido = minutosActual >= minutosInicio && minutosActual <= minutosFinConGracia;
      } else {
        esValido = minutosActual >= minutosInicio || minutosActual <= minutosFinConGracia;
      }

      if (!esValido) {
        throw new ForbiddenException(
          `Sesión bloqueada: Su turno de trabajo finalizó (${user.horaFinTurno}) y ha expirado el período de gracia.`
        );
      }
    }

    return user;
  }
}