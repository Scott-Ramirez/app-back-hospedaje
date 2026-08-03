import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HuespedSchema } from './persistence/huesped.schema';
import { MySqlHuespedRepository } from './persistence/mysql-huesped.repository';
import { HuespedesController } from './huespedes.controller';

// Importar esquemas externos necesarios para las métricas
import { EstanciaSchema } from '../estancias/persistence/estancia.schema';
import { MySqlEstanciaRepository } from '../estancias/persistence/mysql-estancia.repository';

// Importar Use Cases
import { BuscarHuespedUseCase } from '../../core/huespedes/use-cases/buscar-huesped.use-case';
import { RegistrarHuespedUseCase } from '../../core/huespedes/use-cases/registrar-huesped.use-case';
import { ActualizarHuespedUseCase } from '../../core/huespedes/use-cases/actualizar-huesped.use-case';
import { EliminarHuespedUseCase } from '../../core/huespedes/use-cases/eliminar-huesped.use-case';
import { ListarHuespedesUseCase } from '../../core/huespedes/use-cases/listar-huespedes.use-case';

@Module({
  // Importamos los schemas para que TypeORM los reconozca en este ámbito de peticiones
  imports: [TypeOrmModule.forFeature([HuespedSchema, EstanciaSchema])],
  controllers: [HuespedesController],
  providers: [
    { 
      provide: 'IHuespedRepository', 
      useClass: MySqlHuespedRepository 
    },
    {
      provide: 'IEstanciaRepository',
      useClass: MySqlEstanciaRepository
    },
    {
      provide: BuscarHuespedUseCase,
      inject: ['IHuespedRepository'],
      useFactory: (repo) => new BuscarHuespedUseCase(repo),
    },
    {
      provide: RegistrarHuespedUseCase,
      inject: ['IHuespedRepository'],
      useFactory: (repo) => new RegistrarHuespedUseCase(repo),
    },
    {
      provide: ActualizarHuespedUseCase,
      inject: ['IHuespedRepository'],
      useFactory: (repo) => new ActualizarHuespedUseCase(repo),
    },
    {
      provide: EliminarHuespedUseCase,
      inject: ['IHuespedRepository'],
      useFactory: (repo) => new EliminarHuespedUseCase(repo),
    },
    {
      provide: ListarHuespedesUseCase,
      inject: ['IHuespedRepository'],
      useFactory: (repo) => new ListarHuespedesUseCase(repo),
    },
  ],
  exports: [
    'IHuespedRepository',
    BuscarHuespedUseCase, 
    RegistrarHuespedUseCase, 
    ActualizarHuespedUseCase, 
    EliminarHuespedUseCase,
    ListarHuespedesUseCase
  ],
})
export class HuespedesModule {}