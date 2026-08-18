import { IsNotEmpty, IsString, IsNumber, IsDateString, IsEnum, IsOptional, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class CrearReservaDto {
  @IsString()
  @IsNotEmpty()
  habitacionId!: string;

  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsString()
  @IsNotEmpty()
  dni!: string;

  @IsString()
  @IsOptional()
  celular?: string;

  @IsDateString()
  @IsNotEmpty()
  fecha_inicio!: string;

  @IsDateString()
  @IsNotEmpty()
  fecha_fin!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'El monto de adelanto debe ser mayor a 0 para confirmar la reserva' })
  @Transform(({ value }) => parseFloat(value))
  monto_adelanto!: number;

  @IsEnum(['efectivo', 'yape', 'plin', 'transferencia', 'tarjeta'])
  @IsNotEmpty()
  metodo_pago!: 'efectivo' | 'yape' | 'plin' | 'transferencia' | 'tarjeta';

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Transform(({ value }) => (value ? parseFloat(value) : undefined))
  monto_total_estimado?: number;

  @IsString()
  @IsOptional()
  comprobante_url?: string;

  @IsString()
  @IsOptional()
  observaciones?: string;
}
