import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { HuespedSchema } from '../huespedes/persistence/huesped.schema';
import { HabitacionSchema } from '../habitaciones/persistence/habitacion.schema'; 
import { EstanciaSchema } from '../estancias/persistence/estancia.schema'; 
import { ConfiguracionSchema } from '../configuraciones/persistence/configuracion.schema'; 
import { UsuarioSchema } from '../auth/persistence/usuario.schema'; // <-- 1. IMPORTAR EL SCHEMA DE USUARIOS

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'hospedaje_db',
  entities: [
    HuespedSchema, 
    HabitacionSchema,
    EstanciaSchema,
    ConfiguracionSchema,
    UsuarioSchema, // <-- 2. REGISTRARLO AQUÍ PARA QUE TYPEORM LO MAPEE
  ],
  synchronize: true, // Al estar en true, creará la tabla 'usuarios' automáticamente si no existe
  logging: true,
};