import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsNumber,
  IsOptional,
  Min,
  IsEnum,
} from 'class-validator';

import { MetodoPago } from '../../cobranzas/enums/metodo-pago.enum';


export class RegistroInicialDto {

  // ==========================
  // Datos del Huésped
  // ==========================

  @IsString()
  @IsNotEmpty()
  nombre!: string;


  @IsString()
  @IsNotEmpty()
  dni!: string;


  @IsString()
  @IsOptional()
  celular?: string;



  // ==========================
  // Datos de la Estancia
  // ==========================

  @IsUUID()
  @IsNotEmpty()
  habitacionId!: string;


  /**
   * Monto total calculado de la estancia
   */
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  total_pagar!: number;


  /**
   * Fecha programada de salida
   * Formato ISO:
   * 2026-07-30T13:00:00
   */
  @IsString()
  @IsNotEmpty()
  fecha_salida_programada!: string;

  /**
   * Tarifa pactada por noche (opcional, para rebajas o estancias largas).
   * Si no se envía, toma el precio base de la habitación.
   */
  @IsNumber()
  @IsOptional()
  @Min(0)
  precio_noche?: number;



  // ==========================
  // Pago inicial (opcional)
  // ==========================

  /**
   * Si el huésped desea pagar adelantado.
   * Puede ser:
   * - pago completo
   * - pago parcial
   * - no enviar este campo
   */
  @IsNumber()
  @IsOptional()
  @Min(0)
  pago_inicial?: number;



  /**
   * Método utilizado para el pago inicial
   */
  @IsEnum(MetodoPago)
  @IsOptional()
  metodo_pago?: MetodoPago;

  /**
   * Tipo de estancia: 'normal' o 'cortesia' (para familiares/amigos del dueño)
   */
  @IsString()
  @IsOptional()
  tipo_estancia?: 'normal' | 'cortesia';

  /**
   * Observaciones o motivo de cortesía / acuerdo especial
   */
  @IsString()
  @IsOptional()
  observaciones?: string;

}