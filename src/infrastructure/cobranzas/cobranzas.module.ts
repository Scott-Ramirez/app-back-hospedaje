import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CobranzaSchema } from './persistence/cobranza.schema';
import { MySqlCobranzaRepository } from './persistence/mysql-cobranza.repository';
import { CobranzaService } from '../../core/cobranzas/services/cobranza.service';
import { GenerarCargosDiariosJob } from './jobs/generar-cargos-diarios.job';
import { EstanciasModule } from '../estancias/estancias.module';

// Nuevas dependencias para el control de turnos
import { CajaSesionSchema } from './persistence/caja-sesion.schema';
import { MySqlCajaSesionRepository } from './persistence/mysql-caja-sesion.repository';
import { CajaSesionService } from '../../core/cobranzas/services/caja-sesion.service';
import { CajaSesionesController } from './caja-sesiones.controller';
import { GastoSchema } from '../bitacora/persistence/gasto.schema';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CobranzaSchema, 
      CajaSesionSchema,
      GastoSchema
    ]),
    forwardRef(() => EstanciasModule),
  ],
  controllers: [
    CajaSesionesController
  ],
  providers: [
    {
      provide: 'ICobranzaRepository',
      useClass: MySqlCobranzaRepository,
    },
    {
      provide: 'ICajaSesionRepository',
      useClass: MySqlCajaSesionRepository,
    },
    CobranzaService,
    CajaSesionService,
    GenerarCargosDiariosJob,
  ],
  exports: [
    'ICobranzaRepository',
    'ICajaSesionRepository',
    CobranzaService,
    CajaSesionService,
  ],
})
export class CobranzasModule {}
