import { SetMetadata } from '@nestjs/common';
import { RolUsuario } from '../../../core/usuarios/entities/usuario.entity';

// La clave interna con la que NestJS guardará los roles permitidos
export const ROLES_KEY = 'roles';

// Decorador personalizado que acepta una lista de roles permitidos
export const Roles = (...roles: RolUsuario[]) => SetMetadata(ROLES_KEY, roles);