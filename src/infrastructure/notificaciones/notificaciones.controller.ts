import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { NotificacionSchema, Notificacion } from './persistence/notificacion.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificacionesGateway } from './notificaciones.gateway';

@Controller('notificaciones')
@UseGuards(JwtAuthGuard)
export class NotificacionesController {
  constructor(
    @InjectRepository(NotificacionSchema)
    private readonly notificacionRepo: Repository<Notificacion>,
    private readonly notificacionesGateway: NotificacionesGateway,
  ) {}

  @Post()
  async crearNotificacion(
    @Req() req: any,
    @Body() dto: {
      destinatarioRol: string;
      titulo: string;
      mensaje: string;
      tipo?: string;
      habitacionNumero?: string;
      estanciaId?: string;
    },
  ) {
    if (!dto.titulo || !dto.mensaje) {
      throw new BadRequestException('El título y mensaje son obligatorios.');
    }

    const usuario = req.user;
    const nueva = this.notificacionRepo.create({
      remitenteId: String(usuario.id),
      remitenteNombre: usuario.nombre || usuario.username || 'Recepcionista',
      remitenteRol: usuario.rol || 'recepcionista',
      destinatarioRol: dto.destinatarioRol || 'todos',
      titulo: dto.titulo,
      mensaje: dto.mensaje,
      tipo: dto.tipo || 'liberacion_habitacion',
      habitacionNumero: dto.habitacionNumero,
      estanciaId: dto.estanciaId,
      leido: false,
    });

    const guardada = await this.notificacionRepo.save(nueva);

    // Retransmitir por WebSockets en tiempo real
    this.notificacionesGateway.notificarDirecto({
      id: guardada.id,
      remitenteId: guardada.remitenteId,
      remitenteNombre: guardada.remitenteNombre,
      remitenteRol: guardada.remitenteRol,
      destinatarioRol: guardada.destinatarioRol,
      titulo: guardada.titulo,
      mensaje: guardada.mensaje,
      tipo: guardada.tipo,
      habitacionNumero: guardada.habitacionNumero,
      estanciaId: guardada.estanciaId,
      leido: guardada.leido,
      timestamp: guardada.fecha,
    });

    return guardada;
  }

  @Get()
  async listarPorUsuario(@Req() req: any) {
    const rol = req.user.rol;
    // Administradores y supervisores ven las notificaciones dirigidas a su rol o a 'todos'
    const rolesPermitidos = [rol, 'todos'];
    if (rol === 'admin' || rol === 'supervisor') {
      rolesPermitidos.push('admin', 'supervisor');
    }

    return await this.notificacionRepo.find({
      where: {
        destinatarioRol: In(rolesPermitidos),
      },
      order: { fecha: 'DESC' },
      take: 50,
    });
  }

  @Patch(':id/leer')
  async marcarComoLeida(@Param('id') id: string) {
    await this.notificacionRepo.update(id, { leido: true });
    return { ok: true };
  }

  @Delete('limpiar')
  async limpiarTodas(@Req() req: any) {
    const rol = req.user.rol;
    const rolesPermitidos = [rol, 'todos'];
    if (rol === 'admin' || rol === 'supervisor') {
      rolesPermitidos.push('admin', 'supervisor');
    }

    await this.notificacionRepo.delete({
      destinatarioRol: In(rolesPermitidos),
    });

    return { ok: true };
  }
}
