import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IUsuarioRepository } from '../../../core/usuarios/interfaces/usuario-repository.interface';
import { Usuario } from '../../../core/usuarios/entities/usuario.entity';
import { UsuarioSchema } from './usuario.schema';

@Injectable()
export class MySqlUsuarioRepository implements IUsuarioRepository {
  constructor(
    @InjectRepository(UsuarioSchema)
    private readonly repository: Repository<Usuario>,
  ) {}

  /**
   * Busca un usuario por su username para validar sus credenciales en el Login
   */
  async buscarPorUsername(username: string): Promise<Usuario | null> {
    return await this.repository.findOne({ where: { username } });
  }

  /**
   * Permite registrar nuevos usuarios en el sistema (utilizado por el Seeder)
   */
  async crear(usuario: Partial<Usuario>): Promise<Usuario> {
    const nuevoUsuario = this.repository.create(usuario);
    return await this.repository.save(nuevoUsuario);
  }

  /**
   * Busca un usuario por su ID (utilizado para el reseteo administrativo de empleados)
   */
  async buscarPorId(id: number): Promise<Usuario | null> {
    return await this.repository.findOne({ where: { id } });
  }

  /**
   * Actualiza propiedades parciales de un usuario (como la clave o los tokens de recuperación)
   */
  async actualizar(id: number, usuario: Partial<Usuario>): Promise<void> {
    // Usamos update de TypeORM, que ejecuta un UPDATE directo en MySQL optimizado
    await this.repository.update(id, usuario);
  }

  /**
   * Obtiene la lista de todos los usuarios registrados.
   */
  async obtenerTodos(): Promise<Usuario[]> {
    return await this.repository.find();
  }
}