import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { IConfiguracionRepository } from '../interfaces/configuracion-repository.interface';

export interface ActualizarWifiDto {
  wifiNombre: string;
  wifiClave: string;
}

@Injectable()
export class ActualizarWifiUseCase {
  constructor(
    @Inject('IConfiguracionRepository')
    private readonly configRepo: IConfiguracionRepository,
  ) {}

  async execute(dto: ActualizarWifiDto): Promise<void> {
    // 1. Verificar si existen ambas llaves en la base de datos antes de proceder
    const tieneWifiNombre = await this.configRepo.obtenerPorLlave('wifi_nombre');
    const tieneWifiClave = await this.configRepo.obtenerPorLlave('wifi_clave');

    if (!tieneWifiNombre || !tieneWifiClave) {
      throw new NotFoundException('No se encontraron las llaves de configuración para el WiFi en la base de datos.');
    }

    // 2. Actualizar cada fila individualmente en MySQL usando los métodos reales de tu interfaz
    await this.configRepo.actualizarValor('wifi_nombre', dto.wifiNombre);
    await this.configRepo.actualizarValor('wifi_clave', dto.wifiClave);
  }
}