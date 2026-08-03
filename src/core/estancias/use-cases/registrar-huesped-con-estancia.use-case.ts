import { Injectable, Inject, BadRequestException } from '@nestjs/common';

import type { IHuespedRepository } from '../../huespedes/interfaces/huesped-repository.interface';
import type { IHabitacionRepository } from '../../habitaciones/interfaces/habitacion-repository.interface';
import type { IEstanciaRepository } from '../interfaces/estancia-repository.interface';

import { CobranzaService } from '../../cobranzas/services/cobranza.service';

import { Estancia } from '../entities/estancia.entity';

import type { RegistroInicialDto } from '../dtos/registro-inicial.dto';



@Injectable()
export class RegistrarHuespedConEstanciaUseCase {


  constructor(

    @Inject('IHuespedRepository')
    private readonly huespedRepository: IHuespedRepository,

    @Inject('IHabitacionRepository')
    private readonly habitacionRepository: IHabitacionRepository,

    @Inject('IEstanciaRepository')
    private readonly estanciaRepository: IEstanciaRepository,

    private readonly cobranzaService: CobranzaService,

  ) {}



  async execute(
    dto: RegistroInicialDto,
    sesionCajaId?: string,
  ): Promise<Estancia> {


    // ==========================
    // 1. Verificar habitación
    // ==========================

    const habitacion =
      await this.habitacionRepository.obtenerPorId(
        dto.habitacionId,
      );


    if(!habitacion){

      throw new BadRequestException(
        'La habitación no existe',
      );

    }



    if(!habitacion.estaDisponible()){

      throw new BadRequestException(
        'La habitación no está disponible',
      );

    }



    // ==========================
    // 2. Crear o reutilizar huésped
    // ==========================
    let huesped = await this.huespedRepository.obtenerPorDni(dto.dni);
    if (!huesped) {
      huesped = await this.huespedRepository.crear({
        nombre: dto.nombre,
        dni: dto.dni,
        celular: dto.celular,
      });
    } else {
      huesped = await this.huespedRepository.actualizar(huesped.id, {
        nombre: dto.nombre,
        celular: dto.celular,
      });
    }



    // ==========================
    // 3. Crear estancia
    // ==========================

    const estancia =
      await this.estanciaRepository.crear({

        huespedId: huesped.id,

        habitacionId: habitacion.id,

        fecha_entrada: new Date(),

        fecha_salida_programada:
          new Date(dto.fecha_salida_programada),

        total_pagar: dto.total_pagar,

        estado:'pendiente',

      });



    // ==========================
    // 4. Ocupar habitación
    // ==========================

    await this.habitacionRepository.actualizarEstado(
      habitacion.id,
      'ocupado',
    );



    // ==========================
    // 5. Crear cargo inicial
    // ==========================

    await this.cobranzaService.crearCargo({
      estanciaId: estancia.id,
      huespedId: huesped.id,
      monto: dto.total_pagar,
      concepto: 'Hospedaje',
      sesionCajaId,
    });



    // ==========================
    // 6. Registrar pago inicial
    // ==========================

    if(
      dto.pago_inicial &&
      dto.pago_inicial > 0
    ){

      if(!dto.metodo_pago){

        throw new BadRequestException(
          'Debe indicar método de pago',
        );

      }



      if(dto.pago_inicial > dto.total_pagar){

        throw new BadRequestException(
          'El pago no puede superar la deuda',
        );

      }



      await this.cobranzaService.registrarPago({
        estanciaId: estancia.id,
        huespedId: huesped.id,
        monto: dto.pago_inicial,
        metodoPago: dto.metodo_pago,
        concepto: 'Pago inicial de hospedaje',
        sesionCajaId,
      });

    }



    return estancia;

  }

}