import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { IEstanciaRepository } from '../../../core/estancias/interfaces/estancia-repository.interface';
import type { ICobranzaRepository } from '../../../core/cobranzas/interfaces/cobranza-repository.interface';
import { TipoMovimiento } from '../../../core/cobranzas/enums/tipo-movimiento.enum';

@Injectable()
export class GenerarCargosDiariosJob {
  private readonly logger = new Logger(GenerarCargosDiariosJob.name);

  constructor(
    @Inject('IEstanciaRepository')
    private readonly estanciaRepository: IEstanciaRepository,
    @Inject('ICobranzaRepository')
    private readonly cobranzaRepository: ICobranzaRepository,
  ) {}

  /**
   * Tarea programada que se ejecuta cada hora a minuto 0.
   * Revisa todas las estancias activas y genera cargos automáticos si el hospedado
   * ha acumulado días de estancia que aún no han sido cobrados (basado en la regla de salida de las 13:00).
   */
  @Cron('0 * * * *')
  async handleCron() {
    this.logger.log('Iniciando job de generación de cargos diarios...');
    try {
      // 1. Obtener todas las estancias activas (pendientes) con límite alto
      const estancias = await this.estanciaRepository.listar({
        estado: 'pendiente',
        limit: 999999,
      });

      this.logger.log(`Se encontraron ${estancias.length} estancias activas para revisar.`);

      for (const estancia of estancias) {
        // 2. Obtener movimientos de cobranza de esta estancia
        const cobranzas = await this.cobranzaRepository.obtenerPorEstancia(estancia.id);

        // 3. Sumar todos los cargos ya registrados para esta estancia
        const totalCargos = cobranzas
          .filter(c => c.tipo === TipoMovimiento.CARGO)
          .reduce((sum, c) => sum + Number(c.monto), 0);

        // 4. Obtener el monto acumulado dinámico según la regla de las 13:00 de la entidad
        const montoAcumulado = estancia.montoAcumulado;

        // 5. Si el acumulado actual supera los cargos registrados, se genera un cargo por la diferencia
        if (montoAcumulado > totalCargos) {
          const diferencia = montoAcumulado - totalCargos;

          await this.cobranzaRepository.crear({
            estanciaId: estancia.id,
            huespedId: estancia.huespedId,
            tipo: TipoMovimiento.CARGO,
            monto: diferencia,
            concepto: `Recargo automático por estancia (Días transcurridos: ${estancia.diasTranscurridos})`,
            fecha: new Date(),
          });

          this.logger.log(
            `Cargo automático generado con éxito para Estancia ${estancia.id}: Monto ${diferencia} (Acumulado: ${montoAcumulado}, Cargos previos: ${totalCargos})`
          );
        }
      }
      this.logger.log('Finalizó el procesamiento de cargos diarios automáticos.');
    } catch (error) {
      this.logger.error('Error durante la ejecución del job de cargos diarios automáticos', error);
    }
  }
}
