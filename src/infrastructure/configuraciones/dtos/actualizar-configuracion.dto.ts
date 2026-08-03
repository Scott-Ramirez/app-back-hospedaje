import { IsNotEmpty, IsString } from 'class-validator';

export class ActualizarConfiguracionDto {
  @IsString({ message: 'El valor debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El campo valor no puede estar vacío' })
  // El '!' soluciona el error de compilación de TypeScript
  readonly valor!: string; 
}