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

    // 4. Crear la carga útil (Payload) que viajará dentro del Token JWT
    const payload = { 
      sub: usuario.id, 
      username: usuario.username, 
      nombre: usuario.nombre,
      rol: usuario.rol,
      // Si el usuario debe cambiar su contraseña, lo incluimos en el JWT
      // para que el guard pueda bloquearlo en todos los demás endpoints.
      debeChangiarPassword: usuario.debeChangiarPassword ?? false,
    };

    // 5. Devolvemos los datos del usuario y su token firmado
    return {
      access_token: this.jwtService.sign(payload),
      // El frontend debe leer este campo y redirigir al formulario de cambio de contraseña
      debeChangiarPassword: usuario.debeChangiarPassword ?? false,
      usuario: {
        id: usuario.id,
        username: usuario.username,
        nombre: usuario.nombre,
        rol: usuario.rol,
      },
    };
  }
}