import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { SeedService } from './seed.service';

@Controller('seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async executeSeed() {
    try {
      await this.seedService.runSeed();
      return {
        success: true,
        message: 'Base de datos poblada con éxito. Se crearon 2 recepcionistas (clave: 123123123), 10 habitaciones, 8 huéspedes, sesiones de caja históricas, cobranzas y gastos de demostración.',
      };
    } catch (err: any) {
      console.error('Error al ejecutar el seed:', err);
      return {
        success: false,
        message: 'Fallo al ejecutar el sembrado de base de datos.',
        error: err.message || err,
      };
    }
  }
}
