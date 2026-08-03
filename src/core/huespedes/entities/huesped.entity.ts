export class Huesped {
  id!: string; 
  nombre!: string;
  dni!: string;
  celular?: string;
  createdAt!: Date;
  updatedAt!: Date;
  deletedAt?: Date;

  // Una sola declaración de la propiedad para la relación
  estancias?: any[];

  constructor(props: Partial<Huesped>) {
    Object.assign(this, props);
  }
}