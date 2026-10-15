import { Controller, Post, Body, Get, Patch, Param, Query, UseGuards, Inject, Req, BadRequestException, NotFoundException } from '@nestjs/common';
import { UseInterceptors, ClassSerializerInterceptor } from '@nestjs/common';
import { RegistrarHuespedConEstanciaUseCase } from '../../core/estancias/use-cases/registrar-huesped-con-estancia.use-case';
import { FinalizarEstanciaUseCase } from '../../core/estancias/use-cases/finalizar-estancia.use-case';
import { ListarEstanciasUseCase } from '../../core/estancias/use-cases/listar-estancias.use-case';
import { ConsultarHistorialUseCase } from '../../core/estancias/use-cases/consultar-historial.use-case';
import { RegistroInicialDto } from '../../core/estancias/dtos/registro-inicial.dto';
import type { IEstanciaRepository } from '../../core/estancias/interfaces/estancia-repository.interface';
import type { IHabitacionRepository } from '../../core/habitaciones/interfaces/habitacion-repository.interface';
import { CobranzaService } from '../../core/cobranzas/services/cobranza.service';
import { CajaSesionService } from '../../core/cobranzas/services/caja-sesion.service';

// Importamos la seguridad por Tokens y Roles
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseInterceptors(ClassSerializerInterceptor)
@Controller('estancias')
// Todo el módulo requiere token de autenticación obligatorio para interactuar
@UseGuards(JwtAuthGuard, RolesGuard)
export class EstanciasController {
  constructor(
    private readonly registrarHuespedConEstanciaUseCase: RegistrarHuespedConEstanciaUseCase,
    private readonly finalizarEstanciaUseCase: FinalizarEstanciaUseCase,
    private readonly listarEstanciasUseCase: ListarEstanciasUseCase,
    private readonly consultarHistorialUseCase: ConsultarHistorialUseCase,
    private readonly cobranzaService: CobranzaService,
    private readonly cajaSesionService: CajaSesionService,
    @Inject('IEstanciaRepository')
    private readonly estanciaRepo: IEstanciaRepository,
    @Inject('IHabitacionRepository')
    private readonly habitacionRepo: IHabitacionRepository,
  ) { }

  /**
   * Obtiene el historial de salidas del hotel.
   * RESTRICCIÓN: Herramienta de auditoría económica y operativa, exclusiva de rangos superiores.
   */
  @Get('historial-salidas')
  @Roles('admin', 'supervisor', 'recepcionista') // <-- Candado aplicado
  async obtenerHistorial(
    @Query('termino') termino?: string,
    @Query('pagina') pagina?: string,
    @Query('limite') limite?: string,
  ) {
    return await this.consultarHistorialUseCase.execute({
      termino,
      pagina: pagina ? parseInt(pagina, 10) : 1,
      limite: limite ? parseInt(limite, 10) : 10,
    });
  }

  /**
   * Proceso de Check-in (Crea huésped si no existe y asigna habitación).
   * Permitido para todo el personal (esencial en el mostrador).
   */
  @Post('check-in-nuevo')
  @Roles('admin', 'supervisor', 'recepcionista')
  async checkIn(@Req() req: any, @Body() dto: RegistroInicialDto) {
    const activa = await this.cajaSesionService.obtenerActiva(req.user.id);
    const esCortesia = dto.tipo_estancia === 'cortesia' || (Number(dto.total_pagar) === 0 && Number(dto.pago_inicial || 0) === 0);
    if (!esCortesia && req.user.rol === 'recepcionista' && !activa) {
      throw new BadRequestException('Debe abrir caja antes de realizar un Check-In.');
    }
    return await this.registrarHuespedConEstanciaUseCase.execute(dto, activa?.id);
  }

  /**
   * Listado de estancias para el Dashboard / Recepción.
   * Permitido para todo el personal operativo.
   */
  @Get()
  @Roles('admin', 'supervisor', 'recepcionista')
  async listar(
    @Query('estado') estado?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return await this.listarEstanciasUseCase.execute({
      estado,
      pagina: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  /**
   * Obtiene la deuda/saldo pendiente de una estancia.
   */
  @Get(':id/deuda')
  @Roles('admin', 'supervisor', 'recepcionista')
  async obtenerDeuda(@Param('id') id: string) {
    return await this.cobranzaService.obtenerEstadoCuenta(id);
  }

  @Get(':id')
  @Roles('admin', 'supervisor', 'recepcionista')
  async obtenerPorId(@Param('id') id: string) {
    const estancia = await this.estanciaRepo.obtenerPorId(id);
    if (!estancia) {
      throw new BadRequestException('Estancia no encontrada');
    }
    return estancia;
  }

  /**
   * Registra un pago o abono a cuenta de una estancia activa.
   */
  @Post(':id/pago')
  @Roles('admin', 'supervisor', 'recepcionista')
  async registrarPago(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: { monto: number; metodoPago: any; concepto?: string }
  ) {
    const activa = await this.cajaSesionService.obtenerActiva(req.user.id);
    if (req.user.rol === 'recepcionista' && !activa) {
      throw new BadRequestException('Debe abrir caja antes de registrar un pago.');
    }
    const estancia = await this.estanciaRepo.obtenerPorId(id);
    if (!estancia) {
      throw new BadRequestException('Estancia no encontrada');
    }
    const resultadoPago = await this.cobranzaService.registrarPago({
      estanciaId: id,
      huespedId: estancia.huespedId,
      monto: Number(dto.monto),
      metodoPago: dto.metodoPago,
      concepto: dto.concepto || 'Abono de saldo de hospedaje',
      sesionCajaId: activa?.id || null,
    });

    // Consultamos la suma real de todos los pagos registrados para esta estancia
    const estadoCuenta = await this.cobranzaService.obtenerEstadoCuenta(id);
    const nuevoTotal = estadoCuenta.totalPagos;
    const datosActualizacion: any = { total_pagar: nuevoTotal };

    // Si con el abono registrado se cubre el saldo del tiempo transcurrido, ampliamos automáticamente
    // la fecha de salida programada hasta mañana a las 13:00 hrs para reflejar la estancia al día
    const precioHabitacion = estancia.precioPorNoche;
    const montoRequerido = estancia.diasTranscurridos * precioHabitacion;

    if (precioHabitacion > 0 && nuevoTotal >= montoRequerido) {
      const proximaSalida = new Date();
      if (proximaSalida.getHours() >= 13) {
        proximaSalida.setDate(proximaSalida.getDate() + 1);
      }
      proximaSalida.setHours(13, 0, 0, 0);
      datosActualizacion.fecha_salida_programada = proximaSalida;
    }

    await this.estanciaRepo.actualizar(id, datosActualizacion);

    return resultadoPago;
  }

  /**
   * Modifica la tarifa/precio por noche pactado para una estancia activa
   * (útil para descuentos por estadías largas, semanas o meses sin alterar el catálogo de habitaciones).
   */
  @Patch(':id/tarifa')
  @Roles('admin', 'supervisor', 'recepcionista')
  async cambiarTarifa(
    @Param('id') id: string,
    @Body() dto: { nuevoPrecioNoche: number; motivo?: string }
  ) {
    const nuevoPrecio = Number(dto.nuevoPrecioNoche);
    if (isNaN(nuevoPrecio) || nuevoPrecio <= 0) {
      throw new BadRequestException('El nuevo precio por noche debe ser un número mayor a 0.');
    }

    const estancia = await this.estanciaRepo.obtenerPorId(id);
    if (!estancia) {
      throw new NotFoundException('Estancia no encontrada.');
    }

    if (estancia.estado === 'finalizado') {
      throw new BadRequestException('No se puede cambiar la tarifa de una estancia que ya ha finalizado.');
    }

    const precioAnterior = estancia.precioPorNoche;
    const actualizada = await this.estanciaRepo.actualizar(id, {
      precio_noche: nuevoPrecio,
    });

    return {
      ok: true,
      mensaje: `Tarifa actualizada con éxito de S/. ${precioAnterior.toFixed(2)} a S/. ${nuevoPrecio.toFixed(2)} por noche.`,
      precioAnterior,
      nuevoPrecioNoche: nuevoPrecio,
      estancia: actualizada,
    };
  }

  /**
   * Ampliación de estadía / Registro de noches adicionales por adelantado.
   * Actualiza la fecha de salida programada y registra el abono correspondiente en la caja activa.
   */
  @Post(':id/extender')
  @Roles('admin', 'supervisor', 'recepcionista')
  async extenderEstadia(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: {
      nuevaFechaSalida: string;
      diasAdicionales?: number;
      monto?: number;
      metodoPago?: any;
      concepto?: string;
      nuevoPrecioNoche?: number;
      observaciones?: string;
    }
  ) {
    const activa = await this.cajaSesionService.obtenerActiva(req.user.id);
    if (req.user.rol === 'recepcionista' && !activa) {
      throw new BadRequestException('Debe abrir caja antes de registrar un cobro por ampliación de estadía.');
    }

    const estancia = await this.estanciaRepo.obtenerPorId(id);
    if (!estancia) {
      throw new NotFoundException('Estancia no encontrada.');
    }

    if (estancia.estado === 'finalizado') {
      throw new BadRequestException('No se puede ampliar una estancia que ya ha finalizado.');
    }

    const nuevaFecha = new Date(dto.nuevaFechaSalida);
    if (isNaN(nuevaFecha.getTime())) {
      throw new BadRequestException('Fecha de salida programada inválida.');
    }

    const monto = Number(dto.monto || 0);
    let resultadoPago: any = null;

    if (monto > 0) {
      if (!dto.metodoPago) {
        throw new BadRequestException('Debe especificar el método de pago.');
      }

      // 1. Generar el cargo por la ampliación para mantener la contabilidad balanceada
      await this.cobranzaService.crearCargo({
        estanciaId: id,
        huespedId: estancia.huespedId,
        monto,
        concepto: dto.concepto || `Ampliación de estadía (+${dto.diasAdicionales || 1} noche(s))`,
        sesionCajaId: activa?.id || null,
      });

      // 2. Registrar el abono en caja
      resultadoPago = await this.cobranzaService.registrarPago({
        estanciaId: id,
        huespedId: estancia.huespedId,
        monto,
        metodoPago: dto.metodoPago,
        concepto: dto.concepto || `Ampliación de estadía (+${dto.diasAdicionales || 1} noche(s))`,
        sesionCajaId: activa?.id || null,
      });
    }

    // Actualizamos la fecha de salida programada, tarifa negociada y sincronizamos el total acumulado pagado
    const estadoCuenta = await this.cobranzaService.obtenerEstadoCuenta(id);
    const nuevoTotalPagado = estadoCuenta.totalPagos;

    const datosActualizacion: any = {
      fecha_salida_programada: nuevaFecha,
      total_pagar: nuevoTotalPagado,
    };

    if (dto.nuevoPrecioNoche !== undefined && dto.nuevoPrecioNoche !== null && Number(dto.nuevoPrecioNoche) >= 0) {
      datosActualizacion.precio_noche = Number(dto.nuevoPrecioNoche);
    }

    if (dto.observaciones && dto.observaciones.trim()) {
      datosActualizacion.observaciones = estancia.observaciones
        ? `${estancia.observaciones} | ${dto.observaciones.trim()}`
        : dto.observaciones.trim();
    }

    const estanciaActualizada = await this.estanciaRepo.actualizar(id, datosActualizacion);

    return {
      ok: true,
      mensaje: `Estadía ampliada exitosamente hasta el ${nuevaFecha.toLocaleString('es-PE')}`,
      estancia: estanciaActualizada,
      pago: resultadoPago,
    };
  }

  /**
   * Cambio de Habitación (Transfer de habitación en estadía activa)
   * Libera la habitación anterior (pasa a limpieza), ocupa la nueva habitación
   * y si hay cobro por diferencia de tarifa, registra el cargo y abono en la caja activa.
   */
  @Post(':id/cambiar-habitacion')
  @Roles('admin', 'supervisor', 'recepcionista')
  async cambiarHabitacion(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: {
      nuevaHabitacionId: string;
      montoDiferencia?: number;
      metodoPago?: any;
      nuevoPrecioNoche?: number;
      motivo: string;
    }
  ) {
    if (!dto.nuevaHabitacionId) {
      throw new BadRequestException('Debe especificar la nueva habitación.');
    }
    if (!dto.motivo || !dto.motivo.trim()) {
      throw new BadRequestException('Debe indicar el motivo del cambio de habitación.');
    }

    const estancia = await this.estanciaRepo.obtenerPorId(id);
    if (!estancia) {
      throw new NotFoundException('Estancia no encontrada.');
    }

    if (estancia.estado === 'finalizado') {
      throw new BadRequestException('No se puede cambiar la habitación de una estancia finalizada.');
    }

    if (estancia.habitacionId === dto.nuevaHabitacionId) {
      throw new BadRequestException('La nueva habitación debe ser diferente a la actual.');
    }

    const nuevaHabitacion = await this.habitacionRepo.obtenerPorId(dto.nuevaHabitacionId);
    if (!nuevaHabitacion) {
      throw new NotFoundException('La nueva habitación no existe.');
    }

    if (nuevaHabitacion.estado !== 'disponible') {
      throw new BadRequestException(`La habitación Nº ${nuevaHabitacion.numero} no está disponible (Estado actual: ${nuevaHabitacion.estado}).`);
    }

    const habitacionAnterior = estancia.habitacion;
    const numHabAnterior = habitacionAnterior?.numero || 'N/A';
    const numHabNueva = nuevaHabitacion.numero;

    const montoDiferencia = Number(dto.montoDiferencia || 0);
    let resultadoPago: any = null;

    if (montoDiferencia > 0) {
      const activa = await this.cajaSesionService.obtenerActiva(req.user.id);
      if (req.user.rol === 'recepcionista' && !activa) {
        throw new BadRequestException('Debe abrir caja antes de registrar un cobro por diferencia de cambio de habitación.');
      }
      if (!dto.metodoPago) {
        throw new BadRequestException('Debe especificar el método de pago para el cobro de la diferencia.');
      }

      // 1. Cargo por la diferencia de habitación
      await this.cobranzaService.crearCargo({
        estanciaId: id,
        huespedId: estancia.huespedId,
        monto: montoDiferencia,
        concepto: `Diferencia por cambio a Hab. ${numHabNueva} (desde Hab. ${numHabAnterior}): ${dto.motivo.trim()}`,
        sesionCajaId: activa?.id || null,
      });

      // 2. Abono en caja
      resultadoPago = await this.cobranzaService.registrarPago({
        estanciaId: id,
        huespedId: estancia.huespedId,
        monto: montoDiferencia,
        metodoPago: dto.metodoPago,
        concepto: `Cobro por cambio a Hab. ${numHabNueva} (desde Hab. ${numHabAnterior}): ${dto.motivo.trim()}`,
        sesionCajaId: activa?.id || null,
      });
    }

    // 3. Pasar la habitación anterior a 'limpieza'
    if (habitacionAnterior) {
      await this.habitacionRepo.actualizarEstadoPorNumero(habitacionAnterior.numero, 'limpieza' as any);
    }

    // 4. Pasar la nueva habitación a 'ocupado'
    await this.habitacionRepo.actualizarEstadoPorNumero(nuevaHabitacion.numero, 'ocupado' as any);

    // 5. Actualizar la estancia
    const estadoCuenta = await this.cobranzaService.obtenerEstadoCuenta(id);
    const nuevoTotalPagado = estadoCuenta.totalPagos;

    const notaCambio = `Cambio de Hab. ${numHabAnterior} a ${numHabNueva} (${dto.motivo.trim()})`;
    const observacionesActualizadas = estancia.observaciones
      ? `${estancia.observaciones} | ${notaCambio}`
      : notaCambio;

    const datosActualizacion: any = {
      habitacionId: dto.nuevaHabitacionId,
      total_pagar: nuevoTotalPagado,
      observaciones: observacionesActualizadas,
    };

    if (dto.nuevoPrecioNoche !== undefined && dto.nuevoPrecioNoche !== null && Number(dto.nuevoPrecioNoche) >= 0) {
      datosActualizacion.precio_noche = Number(dto.nuevoPrecioNoche);
    } else if (estancia.tipo_estancia !== 'cortesia') {
      datosActualizacion.precio_noche = Number(nuevaHabitacion.precio || 0);
    }

    const estanciaActualizada = await this.estanciaRepo.actualizar(id, datosActualizacion);

    return {
      ok: true,
      mensaje: `Habitación cambiada exitosamente de la ${numHabAnterior} a la ${numHabNueva}.`,
      estancia: estanciaActualizada,
      pago: resultadoPago,
    };
  }

  /**
   * Proceso de Check-out (Libera habitación y cierra estancia).
   * Permitido para todo el personal operativo para agilizar la salida del cliente.
   */
  @Patch(':id/check-out')
  @Roles('admin', 'supervisor', 'recepcionista')
  async finalizar(@Param('id') id: string) {
    return await this.finalizarEstanciaUseCase.execute(id);
  }
}