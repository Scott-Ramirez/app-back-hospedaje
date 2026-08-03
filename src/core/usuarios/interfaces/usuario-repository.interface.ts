import { Usuario } from '../entities/usuario.entity';

export interface IUsuarioRepository {
  buscarPorUsername(username: string): Promise<Usuario | null>;
  crear(usuario: Partial<Usuario>): Promise<Usuario>;
  
  // NUEVOS MÉTODOS DEL CONTRATO:
  buscarPorId(id: number): Promise<Usuario | null>;
  actualizar(id: number, usuario: Partial<Usuario>): Promise<void>;
  obtenerTodos(): Promise<Usuario[]>;
}