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
   * Ejecuta automáticamente la creación de nuevas tablas y columnas
   * sin necesidad de activar synchronize ni ejecutar scripts manuales.
   */
  private async ejecutarAutoMigraciones() {
    try {
      this.logger.log('Verificando y asegurando estructura de base de datos...');

      // 1. Crear tabla de reservas (si no existe)
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS \`reservas\` (
          \`id\` varchar(36) NOT NULL,
          \`huesped_id\` varchar(36) NOT NULL,
          \`habitacion_id\` varchar(36) NOT NULL,
          \`fecha_ingreso\` datetime NOT NULL,
          \`fecha_salida\` datetime NOT NULL,
          \`monto_adelanto\` decimal(10,2) NOT NULL DEFAULT '0.00',
          \`metodo_pago\` varchar(50) NOT NULL DEFAULT 'efectivo',
          \`evidencia_url\` varchar(255) NULL,
          \`observaciones\` text NULL,
          \`estado\` enum('confirmada','cancelada','convertida') NOT NULL DEFAULT 'confirmada',
          \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 2. Agregar columnas de gastos administrativos si no existen
      const columnasGastos = [
        { name: 'categoria', sql: "ALTER TABLE `gastos` ADD COLUMN `categoria` varchar(50) NULL DEFAULT 'caja_chica'" },
        { name: 'comprobante_url', sql: "ALTER TABLE `gastos` ADD COLUMN `comprobante_url` varchar(255) NULL" },
        { name: 'observaciones', sql: "ALTER TABLE `gastos` ADD COLUMN `observaciones` text NULL" },
        { name: 'periodo_mes', sql: "ALTER TABLE `gastos` ADD COLUMN `periodo_mes` int NULL" },
        { name: 'periodo_anio', sql: "ALTER TABLE `gastos` ADD COLUMN `periodo_anio` int NULL" },
      ];

      for (const col of columnasGastos) {
        try {
          const checkCol = await this.dataSource.query(
            `SHOW COLUMNS FROM \`gastos\` LIKE '${col.name}'`
          );
          if (!checkCol || checkCol.length === 0) {
            await this.dataSource.query(col.sql);
            this.logger.log(`Columna '${col.name}' creada exitosamente en tabla 'gastos'.`);
          }
        } catch (errCol) {
          // Si la tabla aún no se ha creado por TypeORM, continúa
        }
      }

      this.logger.log('¡Estructura de base de datos verificada y lista!');
    } catch (error) {
      this.logger.error('Error durante la auto-migración de la base de datos:', error);
    }
  }

  private async inicializarUsuarioAdmin() {
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