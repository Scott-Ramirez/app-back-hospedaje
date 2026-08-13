import { Injectable, Inject } from '@nestjs/common';

import type { ICobranzaRepository } from '../interfaces/cobranza-repository.interface';
import { TipoMovimiento } from '../enums/tipo-movimiento.enum';
import { MetodoPago } from '../enums/metodo-pago.enum';
import { Cobranza } from '../entities/cobranza.entity';


@Injectable()
export class CobranzaService {

  constructor(
    @Inject('ICobranzaRepository')
    private readonly cobranzaRepository: ICobranzaRepository,
  ) {}


  async crearCargo(
    datos: {
      estanciaId: string;
      huespedId: string;
      monto: number;
      concepto: string;
      sesionCajaId?: string | null;
    },
  ): Promise<Cobranza> {

    return this.cobranzaRepository.crear({
      estanciaId: datos.estanciaId,
      huespedId: datos.huespedId,
      tipo: TipoMovimiento.CARGO,
      monto: datos.monto,
      concepto: datos.concepto,
      fecha: new Date(),
      sesionCajaId: datos.sesionCajaId || null,
    } as any);

  }

  async registrarPago(
    datos:{
      estanciaId:string;
      huespedId:string;
      monto:number;
      metodoPago:MetodoPago;
      concepto:string;
      sesionCajaId?: string | null;
    },
  ):Promise<Cobranza>{

    return this.cobranzaRepository.crear({
      estanciaId: datos.estanciaId,
      huespedId: datos.huespedId,
      tipo: TipoMovimiento.PAGO,
      monto: datos.monto,
      metodoPago: datos.metodoPago,
      concepto: datos.concepto,
      fecha:new Date(),
      sesionCajaId: datos.sesionCajaId || null,
    } as any);

  }



  async obtenerDeuda(
    estanciaId:string,
  ):Promise<number>{

    const movimientos =
      await this.cobranzaRepository.obtenerPorEstancia(estanciaId);


    let deuda = 0;


    for(const movimiento of movimientos){

      if(movimiento.tipo === TipoMovimiento.CARGO){
        deuda += movimiento.monto;
      }


      if(movimiento.tipo === TipoMovimiento.PAGO){
        deuda -= movimiento.monto;
      }

    }


    return deuda < 0 ? 0 : deuda;

  }

  async obtenerEstadoCuenta(
    estanciaId: string,
  ): Promise<{ deuda: number; totalCargos: number; totalPagos: number; pagos: Cobranza[] }> {
    const movimientos = await this.cobranzaRepository.obtenerPorEstancia(estanciaId);
    let totalCargos = 0;
    let totalPagos = 0;
    const pagosList: Cobranza[] = [];

    for (const movimiento of movimientos) {
      if (movimiento.tipo === TipoMovimiento.CARGO) {
        totalCargos += Number(movimiento.monto);
      }
      if (movimiento.tipo === TipoMovimiento.PAGO) {
        totalPagos += Number(movimiento.monto);
        pagosList.push(movimiento);
      }
    }

    const deuda = totalCargos - totalPagos;
    return {
      deuda: deuda < 0 ? 0 : deuda,
      totalCargos,
      totalPagos,
      pagos: pagosList,
    };
  }

}