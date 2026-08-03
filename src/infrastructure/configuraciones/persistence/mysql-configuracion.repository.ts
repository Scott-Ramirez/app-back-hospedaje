import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IConfiguracionRepository } from '../../../core/configuraciones/interfaces/configuracion-repository.interface';
import { Configuracion, ConfiguracionSchema } from './configuracion.schema';

@Injectable()
export class MySqlConfiguracionRepository implements IConfiguracionRepository {
  constructor(
    @InjectRepository(ConfiguracionSchema)
    private readonly repository: Repository<Configuracion>,
  ) {}

  async obtenerPorLlave(llave: string): Promise<Configuracion | null> {
    return await this.repository.findOne({ where: { llave } });
  }

  async actualizarValor(llave: string, nuevoValor: string): Promise<void> {
    await this.repository.update({ llave }, { valor: nuevoValor });
  }

  async obtenerTodas(): Promise<Configuracion[]> {
    return await this.repository.find();
  }
}