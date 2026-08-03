import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RolUsuario } from '../../../core/usuarios/entities/usuario.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Obtener los roles requeridos desde el decorador @Roles
    const rolesRequeridos = this.reflector.getAllAndOverride<RolUsuario[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Si el endpoint no tiene el decorador @Roles, significa que es público para cualquier usuario logueado
    if (!rolesRequeridos) {
      return true;
    }

    // 2. Obtener al usuario (inyectado previamente por el JwtAuthGuard)
    const { user } = context.switchToHttp().getRequest();
    
    if (!user || !user.rol) {
      throw new ForbiddenException('No tienes permisos para acceder a este recurso');
    }

    // 3. Verificar si el rol del usuario coincide con alguno de los permitidos
    const tieneRolPermitido = rolesRequeridos.includes(user.rol);
    
    if (!tieneRolPermitido) {
      throw new ForbiddenException(`El rol '${user.rol}' no tiene autorización para realizar esta acción`);
    }

    return true;
  }
}