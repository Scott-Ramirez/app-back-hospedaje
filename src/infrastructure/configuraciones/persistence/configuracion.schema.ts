import { EntitySchema } from 'typeorm';

export interface Configuracion {
  id: number;
  llave: string;
  valor: string;
  descripcion: string;
}

export const ConfiguracionSchema = new EntitySchema<Configuracion>({
  name: 'Configuracion',
  tableName: 'configuraciones',
  columns: {
    id: {
      type: Number,
      primary: true,
      generated: true,
    },
    llave: {
      type: String,
      unique: true, // Para que no se repitan las llaves de configuración
      length: 100,
    },
    valor: {
      type: 'text', // Usamos text por si el mensaje de bienvenida es largo
    },
    descripcion: {
      type: String,
      length: 255,
      nullable: true,
    },
  },
});