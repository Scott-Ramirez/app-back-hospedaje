import { Injectable, Inject, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type { IUsuarioRepository } from '../../../core/usuarios/interfaces/usuario-repository.interface';
import { Usuario, RolUsuario } from '../../../core/usuarios/entities/usuario.entity'; // <-- Asegúrate de importar RolUsuario
import { RegistrarUsuarioDto } from '../dtos/registrar-usuario.dto';

@Injectable()
export class RegistrarUsuarioUseCase {
  constructor(
    @Inject('IUsuarioRepository')
    private readonly usuarioRepo: IUsuarioRepository,
  ) {}

  async execute(dto: RegistrarUsuarioDto): Promise<Omit<Usuario, 'passwordHash'>> {
    // 1. Validar que el username no esté tomado
    const usuarioExistente = await this.usuarioRepo.buscarPorUsername(dto.username);
    if (usuarioExistente) {
      throw new ConflictException(`El nombre de usuario '${dto.username}' ya está registrado.`);
    }

    // 2. Encriptar la contraseña del nuevo empleado
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(dto.clave, saltRounds);

    // 3. Guardar en la base de datos a través del repositorio
    // debeChangiarPassword: false => el usuario utilizará la clave asignada directamente por el admin
    const nuevoUsuario = await this.usuarioRepo.crear({
      username: dto.username,
      passwordHash,
      nombre: dto.nombre,
      rol: dto.rol as RolUsuario,
      activo: true,
      debeChangiarPassword: false,
      horaInicioTurno: dto.horaInicioTurno || null,
      horaFinTurno: dto.horaFinTurno || null,
    });

    // 4. Retornamos los datos del usuario creado omitiendo el hash por seguridad
    return {
      id: nuevoUsuario.id,
      username: nuevoUsuario.username,
      nombre: nuevoUsuario.nombre,
      rol: nuevoUsuario.rol,
      activo: nuevoUsuario.activo,
    };
  }
}