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

    return user;
  }
}