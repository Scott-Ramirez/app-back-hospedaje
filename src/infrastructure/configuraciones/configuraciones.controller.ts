// 1. Importaciones de NestJS y Comunes
import { 
  Controller, Get, Patch, Param, Body, Inject, 
  NotFoundException, ForbiddenException, UseGuards, Req 
} from '@nestjs/common';

// 2. Importaciones del Core (Contratos)
import type { IConfiguracionRepository } from '../../core/configuraciones/interfaces/configuracion-repository.interface';

// 3. Importaciones de Infraestructura (DTOs, Guards, Decoradores)
import { ActualizarConfiguracionDto } from './dtos/actualizar-configuracion.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('configuraciones')
@UseGuards(JwtAuthGuard, RolesGuard) // Bloqueo global por Token y Roles
export class ConfiguracionesController {
  constructor(
    @Inject('IConfiguracionRepository')
    private readonly configuracionRepo: IConfiguracionRepository,
  ) {}

  /**
   * Obtiene todas las configuraciones para pintarlas en el Front-end.
   * Permitido para todos los trabajadores logueados.
   */
  @Get()
  @Roles('admin', 'supervisor', 'recepcionista') 
  async listarTodas() {
    return await this.configuracionRepo.obtenerTodas();
  }

  /**
   * Actualiza una configuración específica por su llave (ej: wifi_clave).
   * RESTRICCIÓN: El supervisor solo puede modificar parámetros de WiFi.
   */
  @Patch(':llave')
  @Roles('admin', 'supervisor') // <-- Permitimos la entrada a ambos roles
  async actualizar(
    @Param('llave') llave: string,
    @Body() dto: ActualizarConfiguracionDto,
    @Req() req: any, // <-- Inyectamos la petición para leer los datos del usuario logueado
  ) {
    const usuarioLogueado = req.user; // El JwtAuthGuard inyecta el payload aquí

    // 🔒 CONTROL DE CAMBIOS EXCLUSIVO PARA EL SUPERVISOR
    if (usuarioLogueado.rol === 'supervisor') {
      // Definimos las llaves exactas que el supervisor tiene autorización de editar
      const llavesPermitidasSupervisor = ['wifi_nombre', 'wifi_clave'];

      if (!llavesPermitidasSupervisor.includes(llave)) {
        throw new ForbiddenException(
          `Tu rol de Supervisor no tiene permisos para modificar la configuración '${llave}'. Solo puedes actualizar los datos del WiFi.`,
        );
      }
    }

    // 1. Validamos si la configuración que quiere editar realmente existe en MySQL
    const existe = await this.configuracionRepo.obtenerPorLlave(llave);
    if (!existe) {
      throw new NotFoundException(`La configuración con la llave '${llave}' no existe.`);
    }

    // 2. Actualizamos el valor en la base de datos
    await this.configuracionRepo.actualizarValor(llave, dto.valor);

    return {
      mensaje: `Configuración '${llave}' actualizada con éxito.`,
      llave,
      nuevoValor: dto.valor,
    };
  }
}