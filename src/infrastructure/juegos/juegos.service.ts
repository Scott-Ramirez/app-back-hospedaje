import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JuegoRecord, JuegoRecordSchema } from './persistence/juego-record.schema';

@Injectable()
export class JuegosService {
  constructor(
    @InjectRepository(JuegoRecordSchema)
    private readonly recordRepo: Repository<JuegoRecord>,
  ) {}

  async guardarPuntaje(
    usuarioId: number,
    usuarioNombre: string,
    usuarioRol: string,
    juego: 'runner' | 'snake',
    puntaje: number,
  ): Promise<{ esNuevoRecord: boolean; mejorPuntaje: number; ranking: JuegoRecord[] }> {
    const puntajeLimpio = Math.max(0, Math.floor(Number(puntaje) || 0));

    // Buscar si ya existe récord para este usuario y juego
    let registro = await this.recordRepo.findOne({
      where: { usuarioId, juego },
    });

    let esNuevoRecord = false;

    if (!registro) {
      registro = this.recordRepo.create({
        juego,
        usuarioId,
        usuarioNombre: usuarioNombre || 'Colaborador',
        usuarioRol: usuarioRol || 'recepcionista',
        puntaje: puntajeLimpio,
      });
      await this.recordRepo.save(registro);
      esNuevoRecord = puntajeLimpio > 0;
    } else {
      if (puntajeLimpio > registro.puntaje) {
        registro.puntaje = puntajeLimpio;
        registro.usuarioNombre = usuarioNombre || registro.usuarioNombre;
        registro.usuarioRol = usuarioRol || registro.usuarioRol;
        await this.recordRepo.save(registro);
        esNuevoRecord = true;
      }
    }

    const ranking = await this.obtenerTopPorJuego(juego);

    return {
      esNuevoRecord,
      mejorPuntaje: registro.puntaje,
      ranking,
    };
  }

  async obtenerTopPorJuego(juego: 'runner' | 'snake'): Promise<JuegoRecord[]> {
    return await this.recordRepo.find({
      where: { juego },
      order: { puntaje: 'DESC', updatedAt: 'ASC' },
      take: 10,
    });
  }

  async obtenerRankingCompleto(): Promise<{ runner: JuegoRecord[]; snake: JuegoRecord[] }> {
    const [runner, snake] = await Promise.all([
      this.obtenerTopPorJuego('runner'),
      this.obtenerTopPorJuego('snake'),
    ]);

    return { runner, snake };
  }
}
