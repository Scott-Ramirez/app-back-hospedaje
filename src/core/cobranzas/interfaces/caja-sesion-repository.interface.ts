import { CajaSesion } from '../entities/caja-sesion.entity';

export interface ICajaSesionRepository {
  crear(datos: Partial<CajaSesion>): Promise<CajaSesion>;
  obtenerPorId(id: string): Promise<CajaSesion | null>;
  obtenerActivaPorUsuario(usuarioId: number): Promise<CajaSesion | null>;
  actualizar(id: string, datos: Partial<CajaSesion>): Promise<CajaSesion>;
  listarTodas(filtros?: { limit?: number; offset?: number }): Promise<[CajaSesion[], number]>;
  obtenerUltimaCerrada(): Promise<CajaSesion | null>;
}
