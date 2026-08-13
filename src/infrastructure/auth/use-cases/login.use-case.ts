import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto } from '../dtos/login.dto';
import type { IUsuarioRepository } from '../../../core/usuarios/interfaces/usuario-repository.interface';

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject('IUsuarioRepository')
    private readonly usuarioRepo: IUsuarioRepository,
    private readonly jwtService: JwtService,
  ) {}

  async ejecutar(dto: LoginDto) {
    // 1. Verificar si el usuario existe en MySQL
    const usuario = await this.usuarioRepo.buscarPorUsername(dto.username);
    if (!usuario) {
      throw new UnauthorizedException('Credenciales inválidas'); // No damos pistas de si falló el usuario o la clave por seguridad
    }

    // 2. Verificar si el usuario está activo en el sistema
    if (!usuario.activo) {
      throw new UnauthorizedException('El usuario se encuentra deshabilitado');
    }

    // 3. Comparar la contraseña enviada con el Hash de la base de datos
    const passwordMatch = await bcrypt.compare(dto.password, usuario.passwordHash);
    if (!passwordMatch) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // --- NUEVO: Validar turno de trabajo si está configurado ---
    if (usuario.horaInicioTurno && usuario.horaFinTurno) {
      const horaPeru = new Intl.DateTimeFormat('es-PE', {
        timeZone: 'America/Lima',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date());

      const [actualH, actualM] = horaPeru.split(':').map(Number);
      const [inicioH, inicioM] = usuario.horaInicioTurno.split(':').map(Number);
      const [finH, finM] = usuario.horaFinTurno.split(':').map(Number);

      const minutosActual = actualH * 60 + actualM;
      const minutosInicio = inicioH * 60 + inicioM;
      const minutosFin = finH * 60 + finM;

      let esValido = false;
      if (minutosInicio < minutosFin) {
        // Turno normal en el mismo día (ej. 07:00 a 19:00)
        esValido = minutosActual >= minutosInicio && minutosActual <= minutosFin;
      } else {
        // Turno nocturno cruzado (ej. 19:00 a 07:00 del día siguiente)
        esValido = minutosActual >= minutosInicio || minutosActual <= minutosFin;
      }

      if (!esValido) {
        throw new UnauthorizedException(
          `Acceso denegado: Su turno de trabajo es de ${usuario.horaInicioTurno} a ${usuario.horaFinTurno}. Hora actual: ${horaPeru}`
        );
      }
    }

    // 4. Determinar si el usuario debe cambiar su clave (Solo aplica para el Admin inicial generado por defecto)
    const debeCambiar = usuario.rol === 'admin' && usuario.debeChangiarPassword === true;

    const payload = { 
      sub: usuario.id, 
      username: usuario.username, 
      nombre: usuario.nombre,
      rol: usuario.rol,
      debeChangiarPassword: debeCambiar,
      horaInicioTurno: usuario.horaInicioTurno,
      horaFinTurno: usuario.horaFinTurno,
    };

    // 5. Devolvemos los datos del usuario y su token firmado
    return {
      access_token: this.jwtService.sign(payload),
      debeChangiarPassword: debeCambiar,
      usuario: {
        id: usuario.id,
        username: usuario.username,
        nombre: usuario.nombre,
        rol: usuario.rol,
        horaInicioTurno: usuario.horaInicioTurno,
        horaFinTurno: usuario.horaFinTurno,
      },
    };
  }
}