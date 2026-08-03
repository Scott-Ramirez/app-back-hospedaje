import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';

import { ICobranzaRepository } from '../../../core/cobranzas/interfaces/cobranza-repository.interface';
import { Cobranza } from '../../../core/cobranzas/entities/cobranza.entity';
import { TipoMovimiento } from '../../../core/cobranzas/enums/tipo-movimiento.enum';

import { CobranzaSchema } from './cobranza.schema';


@Injectable()
export class MySqlCobranzaRepository implements ICobranzaRepository {

  constructor(
    @InjectRepository(CobranzaSchema)
    private readonly repository: Repository<Cobranza>,
  ) {}


  /**
   * Crear movimiento de cobranza
   */
  async crear(datos: Partial<Cobranza>): Promise<Cobranza> {

    const nuevaCobranza = this.repository.create(datos);

    return await this.repository.save(nuevaCobranza);
  }



  /**
   * Movimientos de una estancia
   */
  async obtenerPorEstancia(
    estanciaId: string,
  ): Promise<Cobranza[]> {

    return await this.repository.find({
      where: {
        estanciaId,
      },
      order: {
        fecha: 'ASC',
      },
    });
  }



  /**
   * Movimientos de un huésped
   */
  async obtenerPorHuesped(
    huespedId: string,
  ): Promise<Cobranza[]> {

    return await this.repository.find({
      where: {
        huespedId,
      },
      order: {
        fecha: 'DESC',
      },
    });
  }



  /**
   * Buscar movimiento por ID
   */
  async obtenerPorId(
    id: string,
  ): Promise<Cobranza | null> {

    return await this.repository.findOne({
      where: {
        id,
      },
    });
  }



  /**
   * Actualizar movimiento
   */
  async actualizar(
    id: string,
    datos: Partial<Cobranza>,
  ): Promise<Cobranza> {

    await this.repository.update(id, datos);

    const actualizado = await this.obtenerPorId(id);


    if (!actualizado) {
      throw new Error(
        `No se encontró la cobranza ${id} después de actualizar`,
      );
    }


    return actualizado;
  }




  /**
   * Caja diaria
   * Solo considera pagos realizados.
   */
  async obtenerIngresosDelDia(
    fechaInicio: Date,
    fechaFin: Date,
  ): Promise<Cobranza[]> {


    return await this.repository.find({

      where: {
        tipo: TipoMovimiento.PAGO,
        fecha: Between(fechaInicio, fechaFin),
      },

      order: {
        fecha: 'DESC',
      },

    });

  }




  /**
   * Buscar por tipo:
   * cargo o pago
   */
  async obtenerPorTipo(
    tipo: TipoMovimiento,
  ): Promise<Cobranza[]> {


    return await this.repository.find({

      where: {
        tipo,
      },

      order: {
        fecha: 'DESC',
      },

    });

  }

}