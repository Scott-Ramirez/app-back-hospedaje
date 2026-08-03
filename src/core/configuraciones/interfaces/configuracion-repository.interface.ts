import { Configuracion } from '../../../infrastructure/configuraciones/persistence/configuracion.schema';

export interface IConfiguracionRepository {
  obtenerPorLlave(llave: string): Promise<Configuracion | null>;
  actualizarValor(llave: string, nuevoValor: string): Promise<void>;
  obtenerTodas(): Promise<Configuracion[]>;
}