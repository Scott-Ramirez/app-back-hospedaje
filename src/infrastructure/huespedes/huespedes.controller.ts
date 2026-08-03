import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Inject } from '@nestjs/common';
import { BuscarHuespedUseCase } from '../../core/huespedes/use-cases/buscar-huesped.use-case';
import { RegistrarHuespedUseCase } from '../../core/huespedes/use-cases/registrar-huesped.use-case';
import { ActualizarHuespedUseCase } from '../../core/huespedes/use-cases/actualizar-huesped.use-case';
import { EliminarHuespedUseCase } from '../../core/huespedes/use-cases/eliminar-huesped.use-case';
import { ListarHuespedesUseCase } from '../../core/huespedes/use-cases/listar-huespedes.use-case';
import { CreateHuespedDto } from './dtos/create-huesped.dto';
import { UpdateHuespedDto } from './dtos/update-huesped.dto';

// Protectores de seguridad y roles
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('huespedes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HuespedesController {
  constructor(
    private readonly buscarHuespedUseCase: BuscarHuespedUseCase,
    private readonly registrarHuespedUseCase: RegistrarHuespedUseCase,
    private readonly actualizarHuespedUseCase: ActualizarHuespedUseCase,
    private readonly eliminarHuespedUseCase: EliminarHuespedUseCase,
    private readonly listarHuespedesUseCase: ListarHuespedesUseCase,
    
    // 🌟 CORRECCIÓN TS1272: Tipamos como 'any' para evitar que chocan 'isolatedModules' y los decoradores
    @Inject('IHuespedRepository') private readonly huespedRepository: any,
    @Inject('IEstanciaRepository') private readonly estanciaRepository: any,
  ) {}

  // ==========================================
  // 1️⃣ RUTAS ESTÁTICAS / ESPECÍFICAS (Prioridad Alta)
  // ==========================================

  /**
   * Obtiene las métricas reales del hotel: Activos, Históricos y Total.
   * GET /huespedes/metricas
   */
  @Get('metricas')
  @Roles('admin', 'supervisor', 'recepcionista')
  async obtenerMetricas() {
    const todosLosHuespedes = await this.huespedRepository.obtenerTodos();
    const total = todosLosHuespedes.length;

    // Consultamos las estancias mediante el método 'listar()'
    const estancias = await this.estanciaRepository.listar(); 
    
    // FILTRADO: Un huésped sigue físicamente en el hotel si su estado es 'pendiente' o 'pagado'
    const estanciasActivas = estancias.filter(
      (e: any) => e.estado === 'pendiente' || e.estado === 'pagado' || !e.fecha_salida_real
    );

    // Mapeamos los IDs únicos para evitar duplicados si un huésped reservó más de una habitación
    const huespedesActivosIds = new Set(estanciasActivas.map((e: any) => e.huespedId));
    
    const activos = huespedesActivosIds.size;
    const historicos = Math.max(0, total - activos);

    return {
      activos,
      historicos,
      total
    };
  }

  /**
   * Busca huéspedes de forma dinámica (por DNI o nombre) para el autocompletado en recepción.
   * GET /huespedes/buscar
   */
  @Get('buscar')
  @Roles('admin', 'supervisor', 'recepcionista')
  async buscar(@Query('q') q: string) {
    return await this.buscarHuespedUseCase.execute(q);
  }

  // ==========================================
  // 2️⃣ RUTA BASE GENERAL (Prioridad Media)
  // ==========================================

  /**
   * Obtiene la lista completa de huéspedes registrados.
   * GET /huespedes
   */
  @Get()
  @Roles('admin', 'supervisor', 'recepcionista')
  async listarTodos() {
    return await this.listarHuespedesUseCase.execute();
  }

  // ==========================================
  // 3️⃣ RUTAS DE CREACIÓN / MUTACIÓN
  // ==========================================

  /**
   * Registra un nuevo cliente en el sistema.
   * POST /huespedes
   */
  @Post()
  @Roles('admin', 'supervisor', 'recepcionista')
  async crear(@Body() createHuespedDto: CreateHuespedDto) {
    return await this.registrarHuespedUseCase.execute(createHuespedDto);
  }

  // ==========================================
  // 4️⃣ RUTAS DINÁMICAS / CON PARÁMETROS (Prioridad Baja)
  // ==========================================

  /**
   * Modifica los datos de contacto o de perfil de un huésped existente.
   * PATCH /huespedes/:id
   */
  @Patch(':id')
  @Roles('admin', 'supervisor', 'recepcionista')
  async actualizar(@Param('id') id: string, @Body() updateHuespedDto: UpdateHuespedDto) {
    return await this.actualizarHuespedUseCase.execute(id, updateHuespedDto);
  }

  /**
   * Envía un huésped a la papelera (eliminación lógica).
   * DELETE /huespedes/:id
   */
  @Delete(':id')
  @Roles('admin', 'supervisor')
  async eliminar(@Param('id') id: string) {
    const huespedEliminado = await this.eliminarHuespedUseCase.execute(id);
    return {
      message: 'Huésped enviado a la papelera con éxito',
      data: huespedEliminado
    };
  }
}