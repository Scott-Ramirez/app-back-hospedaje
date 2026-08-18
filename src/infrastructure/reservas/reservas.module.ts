import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservaSchema } from './persistence/reserva.schema';
import { HabitacionSchema } from '../habitaciones/persistence/habitacion.schema';
import { HuespedSchema } from '../huespedes/persistence/huesped.schema';
import { MySqlReservaRepository } from './persistence/mysql-reserva.repository';
import { MySqlHabitacionRepository } from '../habitaciones/persistence/mysql-habitacion.repository';
import { MySqlHuespedRepository } from '../huespedes/persistence/mysql-huesped.repository';
import { ReservasController } from './controllers/reservas.controller';
import { CrearReservaUseCase } from '../../core/reservas/use-cases/crear-reserva.use-case';
import { ObtenerReservasUseCase } from '../../core/reservas/use-cases/obtener-reservas.use-case';
import { CancelarReservaUseCase } from '../../core/reservas/use-cases/cancelar-reserva.use-case';
import { ConvertirReservaEstanciaUseCase } from '../../core/reservas/use-cases/convertir-reserva-estancia.use-case';
import { RegistrarHuespedConEstanciaUseCase } from '../../core/estancias/use-cases/registrar-huesped-con-estancia.use-case';
import { EstanciasModule } from '../estancias/estancias.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReservaSchema, HabitacionSchema, HuespedSchema]),
    forwardRef(() => EstanciasModule),
  ],
  controllers: [ReservasController],
  providers: [
    {
      provide: 'IReservaRepository',
      useClass: MySqlReservaRepository,
    },
    {
      provide: 'IHabitacionRepository',
      useClass: MySqlHabitacionRepository,
    },
    {
      provide: 'IHuespedRepository',
      useClass: MySqlHuespedRepository,
    },
    {
      provide: CrearReservaUseCase,
      useFactory: (r, h, u) => new CrearReservaUseCase(r, h, u),
      inject: ['IReservaRepository', 'IHabitacionRepository', 'IHuespedRepository'],
    },
    {
      provide: ObtenerReservasUseCase,
      useFactory: (r) => new ObtenerReservasUseCase(r),
      inject: ['IReservaRepository'],
    },
    {
      provide: CancelarReservaUseCase,
      useFactory: (r) => new CancelarReservaUseCase(r),
      inject: ['IReservaRepository'],
    },
    {
      provide: ConvertirReservaEstanciaUseCase,
      useFactory: (r, e) => new ConvertirReservaEstanciaUseCase(r, e),
      inject: ['IReservaRepository', RegistrarHuespedConEstanciaUseCase],
    },
  ],
  exports: ['IReservaRepository', ObtenerReservasUseCase],
})
export class ReservasModule {}
