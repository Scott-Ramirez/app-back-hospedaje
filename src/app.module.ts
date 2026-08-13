import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigModule, ConfigService } from '@nestjs/config'; // <-- Importamos ConfigService junto al módulo
import { ScheduleModule } from '@nestjs/schedule';

import { HuespedesModule } from './infrastructure/huespedes/huespedes.module';
import { HabitacionesModule } from './infrastructure/habitaciones/habitaciones.module'; 
import { EstanciasModule } from './infrastructure/estancias/estancias.module'; 
import { NotificacionesModule } from './infrastructure/notificaciones/notificaciones.module';
import { ConfiguracionesModule } from './infrastructure/configuraciones/configuraciones.module';
import { AuthModule } from './infrastructure/auth/auth.module';
import { CobranzasModule } from './infrastructure/cobranzas/cobranzas.module';
import { BitacoraModule } from './infrastructure/bitacora/bitacora.module';
import { SeedModule } from './infrastructure/seed/seed.module';

// Importamos los schemas para que el factory asíncrono los registre en TypeORM
import { HuespedSchema } from './infrastructure/huespedes/persistence/huesped.schema';
import { HabitacionSchema } from './infrastructure/habitaciones/persistence/habitacion.schema'; 
import { EstanciaSchema } from './infrastructure/estancias/persistence/estancia.schema'; 
import { ConfiguracionSchema } from './infrastructure/configuraciones/persistence/configuracion.schema'; 
import { UsuarioSchema } from './infrastructure/auth/persistence/usuario.schema';
import { ActividadSchema } from './infrastructure/bitacora/persistence/actividad.schema';
import { GastoSchema } from './infrastructure/bitacora/persistence/gasto.schema';
import { SolicitudEgresoSchema } from './infrastructure/bitacora/persistence/solicitud-egreso.schema';
import { CobranzaSchema } from './infrastructure/cobranzas/persistence/cobranza.schema';
import { CajaSesionSchema } from './infrastructure/cobranzas/persistence/caja-sesion.schema';
import { NotificacionSchema } from './infrastructure/notificaciones/persistence/notificacion.schema';

@Module({
  imports: [
    // 1. Inicializa y carga las variables del archivo .env de forma GLOBAL
    ConfigModule.forRoot({
      isGlobal: true, 
    }),
    
    // 2. Conexión ASÍNCRONA: Espera pacientemente a que ConfigService tenga listos los datos del .env
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DB_HOST') || 'localhost',
        port: configService.get<number>('DB_PORT') || 3306,
        username: configService.get<string>('DB_USERNAME') || 'root',
        password: configService.get<string>('DB_PASSWORD') || '',
        database: configService.get<string>('DB_DATABASE') || 'hospedaje_db',
        entities: [
          HuespedSchema, 
          HabitacionSchema,
          EstanciaSchema,
          ConfiguracionSchema,
          UsuarioSchema,
          ActividadSchema,
          GastoSchema,
          SolicitudEgresoSchema,
          CobranzaSchema,
          CajaSesionSchema,
          NotificacionSchema,
        ],
        synchronize: true, // Auto-creará la tabla 'usuarios' e inyectará los cambios en caliente
        logging: true,
      }),
    }),

    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    HuespedesModule,
    HabitacionesModule, 
    EstanciasModule, 
    NotificacionesModule, 
    ConfiguracionesModule, 
    AuthModule,
    CobranzasModule,
    BitacoraModule,
    SeedModule,
  ],
})
export class AppModule {}