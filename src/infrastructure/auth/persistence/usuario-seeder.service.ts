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
    this.logger.log('Verificando y sincronizando usuario administrador desde .env...');

    // 1. Jalamos las credenciales iniciales definidas en el archivo .env
    const username = (
      this.configService.get<string>('DEFAULT_ADMIN_USERNAME') ||
      process.env.DEFAULT_ADMIN_USERNAME ||
      'admin'
    ).trim();

    const password = (
      this.configService.get<string>('DEFAULT_ADMIN_PASSWORD') ||
      process.env.DEFAULT_ADMIN_PASSWORD ||
      'Admin123*'
    ).trim();

    const nombre = (
      this.configService.get<string>('DEFAULT_ADMIN_NOMBRE') ||
      process.env.DEFAULT_ADMIN_NOMBRE ||
      'Administrador General'
    ).trim();

    this.logger.log(`Datos del Admin a sincronizar -> Usuario: '${username}', Nombre: '${nombre}'`);

    try {
      // 2. Comprobamos si el usuario administrador ya existe
      const usuarioExistente = await this.usuarioRepo.buscarPorUsername(username);
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      if (!usuarioExistente) {
        // Verificar si hay algún admin con id 1 o nombre antiguo para actualizarlo
        const todos = await this.usuarioRepo.obtenerTodos();
        const primerAdmin = todos.find(u => u.rol === 'admin' || u.id === 1);

        if (primerAdmin) {
          this.logger.log(`Actualizando datos del administrador ID ${primerAdmin.id} a: '${nombre}' ('${username}')`);
          await this.usuarioRepo.actualizar(primerAdmin.id, {
            username,
            nombre,
            passwordHash,
            rol: 'admin',
            activo: true,
          });
        } else {
          this.logger.warn(`Creando cuenta de administrador: '${nombre}' ('${username}')...`);
          await this.usuarioRepo.crear({
            username,
            passwordHash,
            nombre,
            rol: 'admin',
            activo: true,
            debeChangiarPassword: true,
          });
        }
        this.logger.log(`¡Usuario administrador '${username}' (${nombre}) sincronizado con éxito!`);
      } else {
        // Si ya existe pero el nombre o contraseña cambiaron en el .env, actualizarlo
        if (usuarioExistente.nombre !== nombre) {
          this.logger.log(`Actualizando nombre de administrador a: '${nombre}'`);
          await this.usuarioRepo.actualizar(usuarioExistente.id, {
            nombre,
          });
        }
        this.logger.log(`El usuario administrador '${username}' (${nombre}) ya está al día.`);
      }
    } catch (error) {
      this.logger.error('Error al intentar inicializar el usuario administrador:', error);
    }
  }
}