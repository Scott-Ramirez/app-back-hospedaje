import { Controller, Post, Get, Body, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CajaSesionService } from '../../core/cobranzas/services/caja-sesion.service';

@Controller('caja-sesiones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CajaSesionesController {
  constructor(
    private readonly cajaSesionService: CajaSesionService,
  ) {}

  @Post('abrir')
  @Roles('admin', 'supervisor', 'recepcionista')
  async abrirCaja(@Req() req: any, @Body() dto: { montoInicial: number }) {
    const usuarioId = req.user.id;
    return await this.cajaSesionService.abrir(usuarioId, dto.montoInicial);
  }

  @Get('activa')
  @Roles('admin', 'supervisor', 'recepcionista')
  async obtenerActiva(@Req() req: any) {
    const usuarioId = req.user.id;
    return await this.cajaSesionService.obtenerActiva(usuarioId);
  }

  @Post('cerrar')
  @Roles('admin', 'supervisor', 'recepcionista')
  async cerrarCaja(
    @Req() req: any,
    @Body() dto: { montoReal: number; observaciones?: string }
  ) {
    const usuarioId = req.user.id;
    return await this.cajaSesionService.cerrar(usuarioId, dto.montoReal, dto.observaciones);
  }

  @Get('ultimo-cierre')
  @Roles('admin', 'supervisor', 'recepcionista')
  async obtenerUltimoCierre() {
    const monto = await this.cajaSesionService.obtenerUltimoCierre();
    return { ultimoMontoCierre: monto };
  }

  @Get('pagos')
  @Roles('admin', 'supervisor')
  async obtenerTodosLosPagos() {
    return await this.cajaSesionService.listarTodosLosPagos();
  }

  @Get('historial')
  @Roles('admin', 'supervisor')
  async obtenerHistorial(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    const offset = (Number(page) - 1) * Number(limit);
    const [data, total] = await this.cajaSesionService.listarHistorial(Number(limit), offset);
    return { data, total };
  }
}
