import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { ActividadSchema, Actividad } from '../persistence/actividad.schema';

@Injectable()
export class LimpiezaBitacoraJob {
  private readonly logger = new Logger(LimpiezaBitacoraJob.name);

  constructor(
    @InjectRepository(ActividadSchema)
    private readonly actividadRepo: Repository<Actividad>,
  ) {}

  /**
   * Tarea programada que se ejecuta todos los días a la medianoche (00:00).
   * Elimina las actividades de la bitácora que tengan más de 30 días.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCron() {
    this.logger.log('Iniciando job de limpieza de la bitácora de actividades (30 días)...');
    try {
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() - 30);

      const resultado = await this.actividadRepo.delete({
        fecha: LessThan(fechaLimite),
      });

      this.logger.log(
        `Limpieza completada. Se eliminaron ${resultado.affected || 0} registros de la bitácora anteriores al ${fechaLimite.toLocaleDateString()}.`
      );
    } catch (error) {
      this.logger.error('Error durante la ejecución del job de limpieza de la bitácora', error);
    }
  }
}
