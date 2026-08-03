import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Prefijo global: Tus rutas serán http://localhost:3000/api/v1/huespedes/...
  app.setGlobalPrefix('api/v1');

  // 2. Habilitar CORS para que tu frontend en Laravel pueda hacer peticiones
  app.enableCors({
    origin: '*', // En producción cambia esto a tu dominio específico
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // 3. Validaciones globales (Clean Code): Transforma los datos y limpia lo que no sirve
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Elimina campos que no estén en el DTO
      forbidNonWhitelisted: true, // Lanza error si envían campos extra
      transform: true, // Convierte tipos automáticamente (ej. string a number)
    }),
  );

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  
  console.log(`🚀 API de Hospedaje corriendo en: http://localhost:${port}/api/v1`);
}
bootstrap();