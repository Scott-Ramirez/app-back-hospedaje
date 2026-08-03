import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // CORRECCIÓN AQUÍ: Agregamos el "!" al final para asegurar que no es undefined
      secretOrKey: configService.get<string>('JWT_SECRET')!, 
    });
  }

  async validate(payload: { sub: number; username: string; nombre: string; rol: string }) {
    return { 
      id: payload.sub, 
      username: payload.username, 
      nombre: payload.nombre, 
      rol: payload.rol 
    };
  }
}