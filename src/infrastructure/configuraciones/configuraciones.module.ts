// 1. Importaciones de NestJS y Ecosistema
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// 2. Importaciones de Infraestructura - Persistencia y Controladores
import { ConfiguracionSchema } from './persistence/configuracion.schema';
import { MySqlConfiguracionRepository } from './persistence/mysql-configuracion.repository';
import { ConfiguracionesController } from './configuraciones.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ConfiguracionSchema])
  ],
  controllers: [
    ConfiguracionesController
  ],
  providers: [
    {
      provide: 'IConfiguracionRepository',
      useClass: MySqlConfiguracionRepository,
    },
  ],
  exports: [
    'IConfiguracionRepository', 
    TypeOrmModule
  ],
})
export class ConfiguracionesModule {}