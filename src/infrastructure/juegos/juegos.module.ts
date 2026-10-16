import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JuegoRecordSchema } from './persistence/juego-record.schema';
import { JuegosService } from './juegos.service';
import { JuegosController } from './juegos.controller';

@Module({
  imports: [TypeOrmModule.forFeature([JuegoRecordSchema])],
  controllers: [JuegosController],
  providers: [JuegosService],
  exports: [JuegosService],
})
export class JuegosModule {}
