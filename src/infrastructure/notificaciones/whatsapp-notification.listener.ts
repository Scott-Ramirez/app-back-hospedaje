import { Injectable, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { IConfiguracionRepository } from '../../core/configuraciones/interfaces/configuracion-repository.interface';

@Injectable()
export class WhatsappNotificationListener {
  
  constructor(
    @Inject('IConfiguracionRepository')
    private readonly configuracionRepo: IConfiguracionRepository,
  ) {}

  /**
   * Escucha el evento de Check-in para enviar el mensaje de bienvenida
   */
  @OnEvent('estancia.creada')
  async manejarEnvioBienvenida(payload: { 
    huespedNombre: string; 
    huespedCelular: string; 
    habitacionNumero: string; 
    montoTotal: number; 
  }) {
    console.log(`📱 Preparando envío de WhatsApp para: ${payload.huespedNombre} (${payload.huespedCelular})`);

    // 1. Consultamos de manera dinámica los valores actuales en la base de datos
    const wifiNombreConfig = await this.configuracionRepo.obtenerPorLlave('wifi_nombre');
    const wifiClaveConfig = await this.configuracionRepo.obtenerPorLlave('wifi_clave');
    const checkoutHoraConfig = await this.configuracionRepo.obtenerPorLlave('checkout_hora');

    // 2. Extraemos los valores o dejamos los respaldos por defecto que tenías por si acaso
    const wifiNombre = wifiNombreConfig?.valor || 'Hospedaje_Guests';
    const wifiClave = wifiClaveConfig?.valor || 'internet2026';
    const checkoutHora = checkoutHoraConfig?.valor || '13:00';

    // Diseñamos el mensaje de texto limpio y profesional para el cliente usando los datos de MySQL
    const mensajeTexto = 
      `🏨 *¡BIENVENIDO A NUESTRO HOSPEDAJE!* 🏨\n\n` +
      `Hola *${payload.huespedNombre}*, gracias por visitarnos.\n\n` +
      `📌 *Detalles de tu estadía:*\n` +
      `• *Habitación asignada:* N° ${payload.habitacionNumero}\n` +
      `• *Monto total:* S/. ${payload.montoTotal}\n` +
      `• *Hora de Check-out:* ${checkoutHora} hrs.\n\n` +
      `📶 *Red Wi-Fi del hospedaje:*\n` +
      `• *Usuario:* ${wifiNombre}\n` +
      `• *Contraseña:* ${wifiClave}\n\n` +
      `Disfruta tu estancia. Si necesitas algo, escribe a este chat. 🤝`;

    // Por ahora, simulamos el envío en los logs de la consola
    console.log(`✉️ CONTENIDO DEL MENSAJE DINÁMICO GENERADO:\n\n${mensajeTexto}\n`);
    
    // NOTA: Aquí es donde se conecta la librería (ej: client.sendMessage) para dispararlo al celular real.
  }
}