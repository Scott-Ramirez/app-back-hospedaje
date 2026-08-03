import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ListarHabitacionesUseCase } from '../../core/habitaciones/use-cases/listar-habitaciones.use-case';
import { CrearHabitacionUseCase } from '../../core/habitaciones/use-cases/crear-habitacion.use-case';
import { ActualizarHabitacionUseCase } from '../../core/habitaciones/use-cases/actualizar-habitacion.use-case';
import { EliminarHabitacionUseCase } from '../../core/habitaciones/use-cases/eliminar-habitacion.use-case';
import { LiberarHabitacionUseCase } from '../../core/habitaciones/use-cases/liberar-habitacion.use-case';
import { ObtenerDashboardUseCase } from '../../core/habitaciones/use-cases/obtener-dashboard.use-case';
import { CreateHabitacionDto } from './dtos/create-habitacion.dto';
import { UpdateHabitacionDto } from './dtos/update-habitacion.dto';

// Importamos la seguridad por Tokens y Roles
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('habitaciones')
// Todo el módulo requiere autenticación obligatoria
@UseGuards(JwtAuthGuard, RolesGuard)
export class HabitacionesController {
  constructor(
    private readonly listarHabitacionesUseCase: ListarHabitacionesUseCase,
    private readonly crearHabitacionUseCase: CrearHabitacionUseCase,
    private readonly actualizarHabitacionUseCase: ActualizarHabitacionUseCase,
    private readonly eliminarHabitacionUseCase: EliminarHabitacionUseCase,
    private readonly liberarHabitacionUseCase: LiberarHabitacionUseCase,
    private readonly obtenerDashboardUseCase: ObtenerDashboardUseCase,
  ) {}

  /**
   * Obtiene la vista gráfica o resumen del estado de las habitaciones.
   * Permitido para todo el personal operativo.
   */
  @Get('dashboard')
  @Roles('admin', 'supervisor', 'recepcionista')
  async obtenerDashboard() {
    return await this.obtenerDashboardUseCase.execute();
  }

  /**
   * Lista el inventario completo de habitaciones.
   * Permitido para todo el personal.
   */
  @Get()
  @Roles('admin', 'supervisor', 'recepcionista')
  async listar() {
    return await this.listarHabitacionesUseCase.execute();
  }

  /**
   * Crea una nueva habitación física en el sistema.
   * RESTRICCIÓN: Solo el dueño/administrador gestiona el inventario estructural.
   */
  @Post()
  @Roles('admin') // <-- Candado estricto
  async crear(@Body() dto: CreateHabitacionDto) {
    return await this.crearHabitacionUseCase.execute(dto);
  }

  /**
   * Modifica precios, tipos o detalles de la habitación.
   * Permitido para Admin y Supervisor (útil si hay cambios de tarifa rápidos).
   */
  @Patch(':id')
  @Roles('admin', 'supervisor')
  async actualizar(@Param('id') id: string, @Body() dto: UpdateHabitacionDto) {
    return await this.actualizarHabitacionUseCase.execute(id, dto);
  }

  /**
   * Cambia el estado de una habitación (ej: pasar de Sucia/Limpieza a Disponible).
   * Permitido para todo el equipo para no trabar la operación diaria.
   */
  @Patch(':id/liberar')
  @Roles('admin', 'supervisor', 'recepcionista')
  async liberar(@Param('id') id: string) {
    return await this.liberarHabitacionUseCase.execute(id);
  }

  /**
   * Elimina permanentemente una habitación.
   * RESTRICCIÓN: Acción destructiva, exclusiva del Administrador.
   */
  @Delete(':id')
  @Roles('admin') // <-- Candado estricto
  async eliminar(@Param('id') id: string) {
    const result = await this.eliminarHabitacionUseCase.execute(id);
    return { message: 'Habitación eliminada correctamente', numero: result.numero };
  }
}