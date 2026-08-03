// 1. Importaciones de NestJS y Comunes
import { 
  Controller, Get, Post, Patch, Body, Param, Inject, 
  HttpCode, HttpStatus, UseGuards, NotFoundException, Req, BadRequestException
} from '@nestjs/common';

// 2. Librerías de Terceros
import * as bcrypt from 'bcrypt';

// 3. Importaciones del Core (Contratos y Entidades)
import type { IUsuarioRepository } from '../../core/usuarios/interfaces/usuario-repository.interface';

// 4. Importaciones de Infraestructura (Guards, Use Cases, DTOs)
import { LoginUseCase } from './use-cases/login.use-case';
import { SolicitarRecuperacionUseCase } from './use-cases/solicitar-recuperacion.use-case';
import { RegistrarUsuarioUseCase } from './use-cases/registrar-usuario.use-case';
import { LoginDto } from './dtos/login.dto';
import { RegistrarUsuarioDto } from './dtos/registrar-usuario.dto';
import { CambiarPasswordDto } from './dtos/cambiar-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly solicitarRecuperacionUseCase: SolicitarRecuperacionUseCase,
    private readonly registrarUsuarioUseCase: RegistrarUsuarioUseCase,
    
    @Inject('IUsuarioRepository')
    private readonly usuarioRepo: IUsuarioRepository,
  ) {}

  /**
   * Endpoint para iniciar sesión: POST /api/v1/auth/login
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return await this.loginUseCase.ejecutar(dto);
  }

  /**
   * Endpoint PÚBLICO para la pantalla de login ("Olvidé mi contraseña").
   * POST /api/v1/auth/recuperar-password
   */
  @Post('recuperar-password')
  @HttpCode(HttpStatus.OK)
  async solicitarRecuperacion(@Body() dto: { username: string }) {
    return await this.solicitarRecuperacionUseCase.execute(dto.username);
  }

  /**
   * Endpoint PROTEGIDO para que el Administrador registre nuevos usuarios con su rol.
   * POST /api/v1/auth/usuarios/registro
   */
  @Post('usuarios/registro')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin') // <-- CANDADO: Solo el admin puede crear personal
  @HttpCode(HttpStatus.CREATED)
  async registrarUsuario(@Body() dto: RegistrarUsuarioDto) {
    return await this.registrarUsuarioUseCase.execute(dto);
  }

  /**
   * Endpoint PROTEGIDO para que el Administrador liste todos los empleados del hotel.
   * GET /api/v1/auth/usuarios
   */
  @Get('usuarios')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin') // <-- SÓLO EL ADMINISTRADOR TIENE ACCESO
  @HttpCode(HttpStatus.OK)
  async listarTodosLosUsuarios() {
    return await this.usuarioRepo.obtenerTodos();
  }

  /**
   * Endpoint PROTEGIDO para que el Administrador resetee claves a los empleados.
   * PATCH /api/v1/auth/usuarios/:id/reset-password
   */
  @Patch('usuarios/:id/reset-password')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin') // <-- SÓLO EL ADMINISTRADOR TIENE ACCESO
  @HttpCode(HttpStatus.OK)
  async resetearClaveEmpleado(
    @Param('id') empleadoId: number,
    @Body() dto: { nuevaClaveTemporal: string }
  ) {
    // 1. Buscamos al empleado en la base de datos utilizando su ID
    const empleado = await this.usuarioRepo.buscarPorId(empleadoId);
    if (!empleado) {
      throw new NotFoundException('El empleado especificado no existe.');
    }

    // 2. Encriptamos la nueva contraseña temporal de forma segura
    const saltRounds = 10;
    const nuevoPasswordHash = await bcrypt.hash(dto.nuevaClaveTemporal, saltRounds);
    
    // 3. Pasamos un objeto plano (Partial<Usuario>) al repositorio para evitar mutar la entidad readonly
    await this.usuarioRepo.actualizar(empleado.id, {
      passwordHash: nuevoPasswordHash,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    });

    return {
      mensaje: `Contraseña del usuario '${empleado.username}' restablecida con éxito por el administrador.`,
      usuarioId: empleado.id
    };
  }

  /**
   * Endpoint PROTEGIDO para que el Administrador cambie el estado de un usuario (dar de baja o reactivar).
   * PATCH /api/v1/auth/usuarios/:id/estado
   */
  @Patch('usuarios/:id/estado')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin') // <-- SÓLO EL ADMINISTRADOR TIENE ACCESO
  @HttpCode(HttpStatus.OK)
  async cambiarEstadoUsuario(
    @Param('id') empleadoId: number,
    @Body() dto: { activo: boolean },
    @Req() req: any
  ) {
    const usuarioLogueado = req.user;
    
    // Buscar al empleado
    const empleado = await this.usuarioRepo.buscarPorId(empleadoId);
    if (!empleado) {
      throw new NotFoundException('El empleado especificado no existe.');
    }

    // Evitar que el administrador se desactive a sí mismo por accidente
    if (empleado.id === usuarioLogueado.id || empleado.id === usuarioLogueado.sub) {
      throw new BadRequestException('No puedes darte de baja a ti mismo por razones de seguridad.');
    }

    // Actualizar estado en la base de datos
    await this.usuarioRepo.actualizar(empleado.id, {
      activo: dto.activo,
    });

    return {
      mensaje: `El estado del usuario '${empleado.username}' ha sido actualizado a ${dto.activo ? 'activo' : 'inactivo'}.`,
      usuarioId: empleado.id,
      activo: dto.activo
    };
  }

  /**
   * Endpoint para que el usuario cambie su contraseña cuando el sistema lo obliga.
   * También funciona para cambios voluntarios de contraseña.
   * PATCH /api/v1/auth/cambiar-password
   */
  @Patch('cambiar-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async cambiarPassword(
    @Req() req: any,
    @Body() dto: CambiarPasswordDto,
  ) {
    const usuarioLogueado = req.user;

    // 1. Buscamos al usuario actual por su ID extraído del JWT (admitiendo id o sub)
    const usuario = await this.usuarioRepo.buscarPorId(usuarioLogueado.id || usuarioLogueado.sub);
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    // 2. Verificamos que la contraseña actual sea correcta antes de permitir el cambio
    const passwordMatch = await bcrypt.compare(dto.passwordActual, usuario.passwordHash);
    if (!passwordMatch) {
      throw new NotFoundException('La contraseña actual es incorrecta.');
    }

    // 3. Encriptamos la nueva contraseña
    const saltRounds = 10;
    const nuevaPasswordHash = await bcrypt.hash(dto.nuevaPassword, saltRounds);

    // 4. Guardamos la nueva contraseña y desactivamos el flag de cambio forzado
    await this.usuarioRepo.actualizar(usuario.id, {
      passwordHash: nuevaPasswordHash,
      debeChangiarPassword: false,
    });

    return {
      mensaje: 'Contraseña actualizada con éxito. Inicia sesión nuevamente con tus nuevas credenciales.',
    };
  }
}