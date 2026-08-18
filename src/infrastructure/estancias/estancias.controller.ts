import { Controller, Post, Body, Get, Patch, Param, Query, UseGuards, Inject, Req, BadRequestException } from '@nestjs/common';
import { UseInterceptors, ClassSerializerInterceptor } from '@nestjs/common';
import { RegistrarHuespedConEstanciaUseCase } from '../../core/estancias/use-cases/registrar-huesped-con-estancia.use-case';
import { FinalizarEstanciaUseCase } from '../../core/estancias/use-cases/finalizar-estancia.use-case';
import { ListarEstanciasUseCase } from '../../core/estancias/use-cases/listar-estancias.use-case';
import { ConsultarHistorialUseCase } from '../../core/estancias/use-cases/consultar-historial.use-case';
import { RegistroInicialDto } from '../../core/estancias/dtos/registro-inicial.dto';
import type { IEstanciaRepository } from '../../core/estancias/interfaces/estancia-repository.interface';
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
  ) {
    return await this.consultarHistorialUseCase.execute({
      termino,
      pagina: pagina ? parseInt(pagina, 10) : 1
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
    if (req.user.rol === 'recepcionista' && !activa) {
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
    const precioHabitacion = Number(estancia.habitacion?.precio || 0);
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
   * Proceso de Check-out (Libera habitación y cierra estancia).
   * Permitido para todo el personal operativo para agilizar la salida del cliente.
   */
  @Patch(':id/check-out')
  @Roles('admin', 'supervisor', 'recepcionista')
  async finalizar(@Param('id') id: string) {
    return await this.finalizarEstanciaUseCase.execute(id);
  }
}