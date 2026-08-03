// 1. Importaciones de NestJS y Ecosistema
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport'; 
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

// 2. Importaciones de Infraestructura - Persistencia
import { UsuarioSchema } from './persistence/usuario.schema';
import { MySqlUsuarioRepository } from './persistence/mysql-usuario.repository';
import { UsuarioSeederService } from './persistence/usuario-seeder.service';

// 3. Importaciones de Infraestructura - Casos de Uso, Controladores y Estrategias
import { LoginUseCase } from './use-cases/login.use-case';
import { SolicitarRecuperacionUseCase } from './use-cases/solicitar-recuperacion.use-case'; 
import { RegistrarUsuarioUseCase } from './use-cases/registrar-usuario.use-case';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([UsuarioSchema]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '8h' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    LoginUseCase,
    SolicitarRecuperacionUseCase,
    RegistrarUsuarioUseCase,
    JwtStrategy,
    UsuarioSeederService,
    {
      provide: 'IUsuarioRepository',
      useClass: MySqlUsuarioRepository,
    },
  ],
  exports: [JwtStrategy, PassportModule],
})
export class AuthModule {}