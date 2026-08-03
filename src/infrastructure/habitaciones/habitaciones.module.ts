import { Module, forwardRef } from '@nestjs/common'; // <-- CORRECCIÓN: Importamos forwardRef
import { TypeOrmModule } from '@nestjs/typeorm';
import { HabitacionSchema } from './persistence/habitacion.schema';
import { MySqlHabitacionRepository } from './persistence/mysql-habitacion.repository';
import { HabitacionesController } from './habitaciones.controller';

// 1. Interfaces
import { IHabitacionRepository } from '../../core/habitaciones/interfaces/habitacion-repository.interface';
import { IEstanciaRepository } from '../../core/estancias/interfaces/estancia-repository.interface';

// 2. Use Cases
import { ListarHabitacionesUseCase } from '../../core/habitaciones/use-cases/listar-habitaciones.use-case';
import { CrearHabitacionUseCase } from '../../core/habitaciones/use-cases/crear-habitacion.use-case';
import { ActualizarHabitacionUseCase } from '../../core/habitaciones/use-cases/actualizar-habitacion.use-case';
import { LiberarHabitacionUseCase } from '../../core/habitaciones/use-cases/liberar-habitacion.use-case';
import { EliminarHabitacionUseCase } from '../../core/habitaciones/use-cases/eliminar-habitacion.use-case';
import { ObtenerDashboardUseCase } from '../../core/habitaciones/use-cases/obtener-dashboard.use-case';

// 3. Módulos Externos
import { EstanciasModule } from '../estancias/estancias.module'; // <-- Importamos el módulo vecino

@Module({
  imports: [
    TypeOrmModule.forFeature([HabitacionSchema]),
    // CORRECCIÓN: Usamos forwardRef para romper el ciclo A -> B -> A de NestJS
    forwardRef(() => EstanciasModule), 
  ],
  controllers: [HabitacionesController],
  providers: [
    {
      provide: 'IHabitacionRepository',
      useClass: MySqlHabitacionRepository,
    },
    {
      provide: ListarHabitacionesUseCase,
      inject: ['IHabitacionRepository'],
      useFactory: (repo: IHabitacionRepository) => new ListarHabitacionesUseCase(repo),
    },
    {
      provide: CrearHabitacionUseCase,
      inject: ['IHabitacionRepository'],
      useFactory: (repo: IHabitacionRepository) => new CrearHabitacionUseCase(repo),
    },
    {
      provide: ActualizarHabitacionUseCase,
      inject: ['IHabitacionRepository'],
      useFactory: (repo: IHabitacionRepository) => new ActualizarHabitacionUseCase(repo),
    },
    {
      provide: EliminarHabitacionUseCase,
      inject: ['IHabitacionRepository'],
      useFactory: (repo: IHabitacionRepository) => new EliminarHabitacionUseCase(repo),
    },
    {
      provide: LiberarHabitacionUseCase,
      inject: ['IHabitacionRepository'],
      useFactory: (repo: IHabitacionRepository) => new LiberarHabitacionUseCase(repo),
    },
    { 
      provide: ObtenerDashboardUseCase,
      inject: ['IHabitacionRepository', 'IEstanciaRepository'],
      useFactory: (habitacionRepo: IHabitacionRepository, estanciaRepo: IEstanciaRepository) => 
        new ObtenerDashboardUseCase(habitacionRepo, estanciaRepo),
    },
  ],
  exports: [
    'IHabitacionRepository', 
    ListarHabitacionesUseCase, 
    CrearHabitacionUseCase,
    ActualizarHabitacionUseCase,
    EliminarHabitacionUseCase,
    LiberarHabitacionUseCase,
    ObtenerDashboardUseCase
  ],
})
export class HabitacionesModule {}