import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { JuegosService } from './juegos.service';

@Controller('juegos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class JuegosController {
  constructor(private readonly juegosService: JuegosService) {}

  @Get('ranking')
  @Roles('admin', 'supervisor', 'recepcionista')
  async obtenerRanking() {
    return await this.juegosService.obtenerRankingCompleto();
  }

  @Post('record')
  @Roles('admin', 'supervisor', 'recepcionista')
  async registrarRecord(
    @Req() req: any,
    @Body() body: { juego: 'runner' | 'snake'; puntaje: number },
  ) {
    const usuario = req.user;
    return await this.juegosService.guardarPuntaje(
      usuario.id,
      usuario.nombre || usuario.username,
      usuario.rol,
      body.juego,
      body.puntaje,
    );
  }
}
