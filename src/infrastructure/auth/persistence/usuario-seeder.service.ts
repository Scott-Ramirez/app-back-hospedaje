import { Injectable, OnApplicationBootstrap, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import type { IUsuarioRepository } from '../../../core/usuarios/interfaces/usuario-repository.interface';

@Injectable()
export class UsuarioSeederService implements OnApplicationBootstrap {
  private readonly logger = new Logger(UsuarioSeederService.name);

  constructor(
    @Inject('IUsuarioRepository')
    private readonly usuarioRepo: IUsuarioRepository,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    this.logger.log('Verificando existencia de usuarios en la base de datos...');

    // 1. Jalamos las credenciales iniciales definidas en el archivo .env
    const username = this.configService.get<string>('DEFAULT_ADMIN_USERNAME') || 'admin';
    const password = this.configService.get<string>('DEFAULT_ADMIN_PASSWORD') || 'Admin123*';
    const nombre = this.configService.get<string>('DEFAULT_ADMIN_NOMBRE') || 'Administrador General';

    try {
      // 2. Comprobamos si el usuario administrador ya existe
      const usuarioExistente = await this.usuarioRepo.buscarPorUsername(username);

      if (!usuarioExistente) {
        this.logger.warn(`No se encontró al usuario '${username}'. Creando cuenta de administrador inicial...`);

        // 3. Encriptamos la contraseña de manera segura con Bcrypt
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // 4. Guardamos el nuevo usuario en MySQL con rol 'admin'
        // Se marca debeChangiarPassword: true para forzar el cambio de credenciales en el primer login
        await this.usuarioRepo.crear({
          username,
          passwordHash,
          nombre,
          rol: 'admin',
          activo: true,
          debeChangiarPassword: true,
        });

        this.logger.log(`¡Usuario administrador '${username}' creado con éxito de forma automática!`);
      } else {
        this.logger.log(`El usuario administrador '${username}' ya existe. Saltando inicialización.`);
      }
    } catch (error) {
      this.logger.error('Error al intentar inicializar el usuario administrador:', error);
    }
  }
}