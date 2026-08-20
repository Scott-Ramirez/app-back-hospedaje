import { Injectable, OnApplicationBootstrap, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import type { IUsuarioRepository } from '../../../core/usuarios/interfaces/usuario-repository.interface';

@Injectable()
export class UsuarioSeederService implements OnApplicationBootstrap {
  private readonly logger = new Logger(UsuarioSeederService.name);

  constructor(
    @Inject('IUsuarioRepository')
    private readonly usuarioRepo: IUsuarioRepository,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  async onApplicationBootstrap() {
    await this.ejecutarAutoMigraciones();
    await this.inicializarUsuarioAdmin();
  }

  /**
   * Sincroniza automáticamente todas las entidades de la base de datos
   * creando cualquier tabla faltante de forma 100% segura sin borrar datos.
   */
  private async ejecutarAutoMigraciones() {
    try {
      this.logger.log('Sincronizando y verificando todas las tablas en la base de datos...');
      await this.dataSource.synchronize(false);
      this.logger.log('¡Todas las tablas y columnas están sincronizadas y listas!');
    } catch (error) {
      this.logger.error('Error durante la auto-migración de la base de datos:', error);
    }
  }

  private async inicializarUsuarioAdmin() {
    this.logger.log('Comprobando existencia de usuarios en el sistema...');

    try {
      const usuarios = await this.usuarioRepo.obtenerTodos();

      // Si ya existe al menos un usuario en el sistema, no modificamos nada al reiniciar
      if (usuarios && usuarios.length > 0) {
        this.logger.log(`Base de datos ya cuenta con ${usuarios.length} usuario(s). No se modifican credenciales existentes.`);
        return;
      }

      // Solo si la base de datos está completamente vacía (instalación inicial), creamos el admin:
      const username = (
        this.configService.get<string>('DEFAULT_ADMIN_USERNAME') ||
        process.env.DEFAULT_ADMIN_USERNAME ||
        'ADMIN'
      ).trim();

      const password = (
        this.configService.get<string>('DEFAULT_ADMIN_PASSWORD') ||
        process.env.DEFAULT_ADMIN_PASSWORD ||
        'Juan$ias92'
      ).trim();

      const nombre = (
        this.configService.get<string>('DEFAULT_ADMIN_NOMBRE') ||
        process.env.DEFAULT_ADMIN_NOMBRE ||
        'Juan Eduardo Sias Fasabi'
      ).trim();

      this.logger.warn(`Base de datos vacía. Creando cuenta inicial de administrador: '${nombre}' ('${username}')...`);
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      await this.usuarioRepo.crear({
        username,
        passwordHash,
        nombre,
        rol: 'admin',
        activo: true,
        debeChangiarPassword: true,
      });

      this.logger.log(`¡Cuenta de administrador inicial creada con éxito!`);
    } catch (error) {
      this.logger.error('Error al verificar/inicializar usuario administrador:', error);
    }
  }
}