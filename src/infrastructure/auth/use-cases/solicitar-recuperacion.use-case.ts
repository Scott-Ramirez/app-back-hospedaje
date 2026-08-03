import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import * as crypto from 'crypto';
import type { IUsuarioRepository } from '../../../core/usuarios/interfaces/usuario-repository.interface';

@Injectable()
export class SolicitarRecuperacionUseCase {
  constructor(
    @Inject('IUsuarioRepository')
    private readonly usuarioRepo: IUsuarioRepository,
  ) {}

  async execute(username: string): Promise<{ message: string }> {
    // 1. Buscar si el usuario existe en MySQL
    const usuario = await this.usuarioRepo.buscarPorUsername(username);
    
    // Si no existe, lanzamos un error genérico por seguridad
    if (!usuario) {
      throw new NotFoundException('Si las credenciales son correctas, recibirás un correo de recuperación brevemente.');
    }

    // 2. EL CANDADO DE SEGURIDAD: Si no es administrador, bloqueamos el proceso
    if (usuario.rol !== 'admin') {
      throw new ForbiddenException(
        'La recuperación automática por correo es exclusiva para cuentas de Administrador. ' +
        'Por favor, solicita al Administrador del hotel que restablezca tu contraseña desde su panel.'
      );
    }

    // 3. Si pasó el filtro (es Admin), generamos un token seguro y único de 15 minutos
    const token = crypto.randomBytes(32).toString('hex');
    const fechaExpiracion = new Date();
    fechaExpiracion.setMinutes(fechaExpiracion.getMinutes() + 15); // Vence en 15 minutos

    // 4. Guardamos el token en el usuario usando el repositorio
    usuario.resetPasswordToken = token;
    usuario.resetPasswordExpires = fechaExpiracion;
    
    // Guardas los cambios en tu BD (Asegúrate de que tu interfaz de repositorio tenga el método actualizar o guardar)
    await this.usuarioRepo.actualizar(usuario.id, usuario);

    // 5. Aquí disparas el MailService (Pronto lo configuraremos)
    // await this.mailService.enviarCorreoRecuperacion(usuario.email, token);

    return {
      message: 'Si las credenciales son correctas, recibirás un correo de recuperación brevemente.'
    };
  }
}