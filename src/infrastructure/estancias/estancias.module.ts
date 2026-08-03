import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { EstanciaSchema } from './persistence/estancia.schema';
import { MySqlEstanciaRepository } from './persistence/mysql-estancia.repository';

import { EstanciasController } from './estancias.controller';

// Use Cases
import { RegistrarHuespedConEstanciaUseCase } 
from '../../core/estancias/use-cases/registrar-huesped-con-estancia.use-case';

import { FinalizarEstanciaUseCase } 
from '../../core/estancias/use-cases/finalizar-estancia.use-case';

import { ListarEstanciasUseCase } 
from '../../core/estancias/use-cases/listar-estancias.use-case';

import { ConsultarHistorialUseCase } 
from '../../core/estancias/use-cases/consultar-historial.use-case';


// Módulos externos
import { HuespedesModule } 
from '../huespedes/huespedes.module';

import { HabitacionesModule } 
from '../habitaciones/habitaciones.module';

import { CobranzasModule } 
from '../cobranzas/cobranzas.module';
import { CobranzaService } from '../../core/cobranzas/services/cobranza.service';



@Module({

  imports: [

    TypeOrmModule.forFeature([
      EstanciaSchema
    ]),

    HuespedesModule,

    forwardRef(() => HabitacionesModule),

    forwardRef(() => CobranzasModule),

  ],


  controllers: [
    EstanciasController
  ],



  providers: [

    {
      provide: 'IEstanciaRepository',
      useClass: MySqlEstanciaRepository,
    },


    /**
     * Registrar huésped + estancia
     */
    {
      provide: RegistrarHuespedConEstanciaUseCase,

      inject: [
        'IHuespedRepository',
        'IHabitacionRepository',
        'IEstanciaRepository',
        CobranzaService,
      ],

      useFactory: (
        hRepo,
        haRepo,
        eRepo,
        cService,
      ) => 

        new RegistrarHuespedConEstanciaUseCase(
          hRepo,
          haRepo,
          eRepo,
          cService,
        ),
    },



    /**
     * Finalizar estancia
     */
    {
      provide: FinalizarEstanciaUseCase,

      inject: [
        'IEstanciaRepository',
        'IHabitacionRepository',
        EventEmitter2,
      ],

      useFactory: (
        eRepo,
        haRepo,
        eventEmitter,

      ) => 

        new FinalizarEstanciaUseCase(
          eRepo,
          haRepo,
          eventEmitter,
        ),
    },



    /**
     * Listar estancias
     */
    {
      provide: ListarEstanciasUseCase,

      inject: [
        'IEstanciaRepository'
      ],

      useFactory: (
        eRepo

      ) => 

        new ListarEstanciasUseCase(eRepo),
    },



    /**
     * Historial
     */
    {
      provide: ConsultarHistorialUseCase,

      inject: [
        'IEstanciaRepository'
      ],

      useFactory: (
        eRepo

      ) => 

        new ConsultarHistorialUseCase(eRepo),
    },


  ],



  exports: [
    'IEstanciaRepository',
  ],


})

export class EstanciasModule {}