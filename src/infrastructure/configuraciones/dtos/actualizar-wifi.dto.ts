import { IsString, IsNotEmpty, Length } from 'class-validator';

export class ActualizarWifiDto {
  @IsString({ message: 'El nombre de la red WiFi debe ser un texto.' })
  @IsNotEmpty({ message: 'El nombre de la red WiFi no puede estar vacío.' })
  wifiNombre!: string;

  @IsString({ message: 'La contraseña del WiFi debe ser un texto.' })
  @IsNotEmpty({ message: 'La contraseña del WiFi no puede estar vacía.' })
  @Length(8, 64, { message: 'La contraseña del WiFi debe tener entre 8 y 64 caracteres.' })
  wifiClave!: string;
}