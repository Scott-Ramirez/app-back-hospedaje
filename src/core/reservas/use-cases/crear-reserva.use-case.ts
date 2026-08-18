import { BadRequestException, ConflictException } from '@nestjs/common';
import { IReservaRepository } from '../interfaces/reserva-repository.interface';
import { IHabitacionRepository } from '../../habitaciones/interfaces/habitacion-repository.interface';
import { IHuespedRepository } from '../../huespedes/interfaces/huesped-repository.interface';
import { CrearReservaDto } from '../../../infrastructure/reservas/dtos/crear-reserva.dto';
import { Reserva } from '../entities/reserva.entity';

export class CrearReservaUseCase {
  constructor(
    private readonly reservaRepo: IReservaRepository,
    private readonly habitacionRepo: IHabitacionRepository,
    private readonly huespedRepo: IHuespedRepository,
  ) {}

  async execute(dto: CrearReservaDto): Promise<Reserva> {
    // 1. Validar habitación
    const habitacion = await this.habitacionRepo.obtenerPorId(dto.habitacionId);
    if (!habitacion) {
      throw new BadRequestException('La habitación especificada no existe');
    }

    // 2. Validar fechas
    const inicio = new Date(dto.fecha_inicio);
    const fin = new Date(dto.fecha_fin);

    if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
      throw new BadRequestException('Las fechas ingresadas no son válidas');
    }

    if (fin <= inicio) {
      throw new BadRequestException('La fecha de fin debe ser posterior a la fecha de inicio');
    }

    // 3. Validar pago adelantado obligatorio
    if (!dto.monto_adelanto || Number(dto.monto_adelanto) <= 0) {
      throw new BadRequestException('Se requiere un pago adelantado (depósito) mayor a S/. 0.00 para confirmar la reserva');
    }

    // 4. Verificar traslape con otras reservas activas para la misma habitación (todas las variantes de tarifa)
    const todasHab = await this.habitacionRepo.obtenerTodos();
    const idsMismoNumero = todasHab
      .filter((h) => h.numero === habitacion.numero)
      .map((h) => h.id);

    for (const hid of idsMismoNumero) {
      const reservasExistentes = await this.reservaRepo.obtenerPorHabitacionYFechas(
        hid,
        inicio,
        fin,
      );
      const activa = reservasExistentes.find((r) => r.estado === 'confirmada');
      if (activa) {
        const cliente = activa.huesped?.nombre || 'otro cliente';
        throw new ConflictException(
          `La Habitación Nº ${habitacion.numero} ya cuenta con una reserva confirmada en ese rango de fechas (a nombre de '${cliente}').`,
        );
      }
    }

    // 5. Crear o actualizar Huésped por DNI
    let huesped = await this.huespedRepo.obtenerPorDni(dto.dni);
    if (!huesped) {
      huesped = await this.huespedRepo.crear({
        nombre: dto.nombre,
        dni: dto.dni,
        celular: dto.celular,
      });
    } else if (dto.celular || dto.nombre) {
      huesped = await this.huespedRepo.actualizar(huesped.id, {
        nombre: dto.nombre || huesped.nombre,
        celular: dto.celular || huesped.celular,
      });
    }

    // 6. Registrar la reserva
    const reserva = await this.reservaRepo.crear({
      habitacionId: habitacion.id,
      huespedId: huesped.id,
      fecha_inicio: inicio,
      fecha_fin: fin,
      monto_adelanto: Number(dto.monto_adelanto),
      metodo_pago: dto.metodo_pago,
      monto_total_estimado: dto.monto_total_estimado ? Number(dto.monto_total_estimado) : undefined,
      comprobante_url: dto.comprobante_url,
      observaciones: dto.observaciones,
      estado: 'confirmada',
    });

    return reserva;
  }
}
