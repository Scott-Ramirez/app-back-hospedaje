import { NotFoundException, BadRequestException } from '@nestjs/common';
import { IReservaRepository } from '../interfaces/reserva-repository.interface';
import { RegistrarHuespedConEstanciaUseCase } from '../../estancias/use-cases/registrar-huesped-con-estancia.use-case';
import { Estancia } from '../../estancias/entities/estancia.entity';

export class ConvertirReservaEstanciaUseCase {
  constructor(
    private readonly reservaRepo: IReservaRepository,
    private readonly registrarEstanciaUseCase: RegistrarHuespedConEstanciaUseCase,
  ) {}

  async execute(reservaId: string, sesionCajaId?: string): Promise<Estancia> {
    const reserva = await this.reservaRepo.obtenerPorId(reservaId);
    if (!reserva) {
      throw new NotFoundException('La reserva no existe');
    }

    if (reserva.estado !== 'confirmada') {
      throw new BadRequestException(`No se puede realizar Check-In de una reserva con estado '${reserva.estado}'`);
    }

    // 1. Ejecutar registro de la estancia con los datos de la reserva
    const estancia = await this.registrarEstanciaUseCase.execute(
      {
        habitacionId: reserva.habitacionId,
        nombre: reserva.huesped?.nombre || 'Huésped Reservado',
        dni: reserva.huesped?.dni || '00000000',
        celular: reserva.huesped?.celular,
        fecha_salida_programada: new Date(reserva.fecha_fin).toISOString(),
        total_pagar: Number(reserva.monto_total_estimado || reserva.monto_adelanto),
        pago_inicial: Number(reserva.monto_adelanto),
        metodo_pago: reserva.metodo_pago as any,
      },
      sesionCajaId,
      true, // esDesdeReserva = true
    );

    // 2. Marcar reserva como completada
    await this.reservaRepo.cambiarEstado(reservaId, 'completada');

    return estancia;
  }
}
