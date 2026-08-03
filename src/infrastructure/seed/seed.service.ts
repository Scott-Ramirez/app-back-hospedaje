import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SeedService {
  constructor(private readonly dataSource: DataSource) {}

  async runSeed() {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Desactivar validaciones de llave foránea para limpieza segura
      await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0;');

      // 2. Limpiar las tablas (preservando usuarios admin y supervisor creados manualmente)
      await queryRunner.query("DELETE FROM usuarios WHERE rol NOT IN ('admin', 'supervisor');");
      // Reiniciar autoincrement de usuarios si es posible (en MySQL)
      const maxUserResult = await queryRunner.query("SELECT MAX(id) as maxId FROM usuarios;");
      const nextId = (maxUserResult[0]?.maxId || 0) + 1;
      await queryRunner.query(`ALTER TABLE usuarios AUTO_INCREMENT = ${nextId};`);

      await queryRunner.query('TRUNCATE TABLE cobranzas;');
      await queryRunner.query('TRUNCATE TABLE gastos;');
      await queryRunner.query('TRUNCATE TABLE estancias;');
      await queryRunner.query('TRUNCATE TABLE caja_sesiones;');
      await queryRunner.query('TRUNCATE TABLE habitaciones;');
      await queryRunner.query('TRUNCATE TABLE huespedes;');
      await queryRunner.query('TRUNCATE TABLE actividades;'); // Limpiar también bitácora
      await queryRunner.query('TRUNCATE TABLE solicitudes_egreso;');

      // 3. Crear 2 usuarios Recepcionistas con contraseña "123123123"
      const saltRounds = 10;
      const passHash = await bcrypt.hash('123123123', saltRounds);

      // Insertar recepcionista 1
      await queryRunner.query(`
        INSERT INTO usuarios (username, password_hash, nombre, rol, activo, debe_changiar_password)
        VALUES ('recepcionista1', '${passHash}', 'Juan Recepcionista', 'recepcionista', 1, 0);
      `);
      // Obtener el ID generado
      const userRes1 = await queryRunner.query("SELECT id FROM usuarios WHERE username = 'recepcionista1';");
      const recep1Id = userRes1[0].id;

      // Insertar recepcionista 2
      await queryRunner.query(`
        INSERT INTO usuarios (username, password_hash, nombre, rol, activo, debe_changiar_password)
        VALUES ('recepcionista2', '${passHash}', 'Maria Recepcionista', 'recepcionista', 1, 0);
      `);
      const userRes2 = await queryRunner.query("SELECT id FROM usuarios WHERE username = 'recepcionista2';");
      const recep2Id = userRes2[0].id;

      // 4. Crear 10 Habitaciones (5 simples, 5 matrimoniales)
      const habitacionesData = [
        { numero: '101', tipo: 'simple', precio: 45.00, estado: 'disponible' },
        { numero: '102', tipo: 'simple', precio: 45.00, estado: 'ocupado' }, // Se pondrá ocupada con estancia activa
        { numero: '103', tipo: 'simple', precio: 50.00, estado: 'disponible' },
        { numero: '104', tipo: 'simple', precio: 50.00, estado: 'limpieza' },
        { numero: '105', tipo: 'simple', precio: 55.00, estado: 'disponible' },
        { numero: '201', tipo: 'matrimonial', precio: 70.00, estado: 'disponible' },
        { numero: '202', tipo: 'matrimonial', precio: 70.00, estado: 'ocupado' }, // Ocupada con estancia activa
        { numero: '203', tipo: 'matrimonial', precio: 80.00, estado: 'disponible' },
        { numero: '204', tipo: 'matrimonial', precio: 80.00, estado: 'disponible' },
        { numero: '205', tipo: 'matrimonial', precio: 90.00, estado: 'disponible' },
      ];

      const roomIdsByNumber: { [num: string]: string } = {};

      for (const room of habitacionesData) {
        const id = this.generateUUID();
        await queryRunner.query(`
          INSERT INTO habitaciones (id, numero, tipo, precio, estado, aire_acondicionado, wifi, ventilador)
          VALUES ('${id}', '${room.numero}', '${room.tipo}', ${room.precio}, '${room.estado}', 0, 1, 1);
        `);
        roomIdsByNumber[room.numero] = id;
      }

      // 5. Crear 8 Huéspedes
      const huespedesData = [
        { nombre: 'Juan Perez', dni: '12345678', celular: '999888777' },
        { nombre: 'Maria Rodriguez', dni: '87654321', celular: '999777666' },
        { nombre: 'Carlos Mendoza', dni: '44332211', celular: '988777666' },
        { nombre: 'Ana Flores', dni: '55667788', celular: '977666555' },
        { nombre: 'Pedro Gomez', dni: '33221100', celular: '966555444' },
        { nombre: 'Lucia Castro', dni: '22110099', celular: '955444333' },
        { nombre: 'Jose Quispe', dni: '99887766', celular: '944333222' },
        { nombre: 'Elena Rojas', dni: '66554433', celular: '933222111' },
      ];

      const guestIdsByIndex: string[] = [];

      for (const guest of huespedesData) {
        const id = this.generateUUID();
        await queryRunner.query(`
          INSERT INTO huespedes (id, nombre, dni, celular)
          VALUES ('${id}', '${guest.nombre}', '${guest.dni}', '${guest.celular}');
        `);
        guestIdsByIndex.push(id);
      }

      // 6. Crear Sesiones de Caja históricas (Turnos)
      // Turno 1: Recepcionista 1, en Junio 2026. Inicial 100, ingresos 200, egresos 30, real entregado 270, descuadre 0.
      const sesion1Id = this.generateUUID();
      await queryRunner.query(`
        INSERT INTO caja_sesiones (id, usuarioId, fecha_apertura, fecha_cierre, monto_inicial, monto_ingresos, monto_egresos, monto_real_entregado, descuadre, estado, observaciones)
        VALUES ('${sesion1Id}', ${recep1Id}, '2026-06-01 08:00:00', '2026-06-01 20:00:00', 100.00, 200.00, 30.00, 270.00, 0.00, 'cerrada', 'Turno entregado conforme');
      `);

      // Turno 2: Recepcionista 2, en Junio 2026. Inicial 270, ingresos 350, egresos 50, real entregado 570, descuadre 0.
      const sesion2Id = this.generateUUID();
      await queryRunner.query(`
        INSERT INTO caja_sesiones (id, usuarioId, fecha_apertura, fecha_cierre, monto_inicial, monto_ingresos, monto_egresos, monto_real_entregado, descuadre, estado, observaciones)
        VALUES ('${sesion2Id}', ${recep2Id}, '2026-06-01 20:00:00', '2026-06-02 08:00:00', 270.00, 350.00, 50.00, 570.00, 0.00, 'cerrada', 'Cierre de turno nocturno');
      `);

      // Turno 3: Recepcionista 1, en Julio 2026. Inicial 100, ingresos 210, egresos 0, real entregado 310, descuadre 0.
      const sesion3Id = this.generateUUID();
      await queryRunner.query(`
        INSERT INTO caja_sesiones (id, usuarioId, fecha_apertura, fecha_cierre, monto_inicial, monto_ingresos, monto_egresos, monto_real_entregado, descuadre, estado, observaciones)
        VALUES ('${sesion3Id}', ${recep1Id}, '2026-07-01 08:00:00', '2026-07-01 20:00:00', 100.00, 210.00, 0.00, 310.00, 0.00, 'cerrada', 'Sin observaciones');
      `);

      // Turno 4: Recepcionista 2, en Julio 2026. Inicial 100, ingresos 300, egresos 20, real entregado 380, descuadre 0.
      const sesion4Id = this.generateUUID();
      await queryRunner.query(`
        INSERT INTO caja_sesiones (id, usuarioId, fecha_apertura, fecha_cierre, monto_inicial, monto_ingresos, monto_egresos, monto_real_entregado, descuadre, estado, observaciones)
        VALUES ('${sesion4Id}', ${recep2Id}, '2026-07-15 08:00:00', '2026-07-15 20:00:00', 100.00, 300.00, 20.00, 380.00, 0.00, 'cerrada', 'Turno tranquilo');
      `);

      // 7. Crear Estancias y Cobranzas históricas (Finalizadas)
      
      // Estancia 1: Hab 101, Huésped 1 (Juan Perez), Turno 1. S/. 45.00
      const estancia1Id = this.generateUUID();
      await queryRunner.query(`
        INSERT INTO estancias (id, huespedId, habitacionId, fecha_entrada, fecha_salida_programada, fecha_salida_real, total_pagar, estado)
        VALUES ('${estancia1Id}', '${guestIdsByIndex[0]}', '${roomIdsByNumber['101']}', '2026-06-01 09:00:00', '2026-06-01 19:00:00', '2026-06-01 19:00:00', 45.00, 'finalizado');
      `);
      await queryRunner.query(`
        INSERT INTO cobranzas (id, estanciaId, huespedId, tipo, monto, metodoPago, concepto, fecha, sesionCajaId)
        VALUES ('${this.generateUUID()}', '${estancia1Id}', '${guestIdsByIndex[0]}', 'pago', 45.00, 'efectivo', 'Cobro completo de estancia Hab. 101', '2026-06-01 19:00:00', '${sesion1Id}');
      `);

      // Estancia 2: Hab 201, Huésped 2 (Maria Rodriguez), Turno 2. S/. 70.00
      const estancia2Id = this.generateUUID();
      await queryRunner.query(`
        INSERT INTO estancias (id, huespedId, habitacionId, fecha_entrada, fecha_salida_programada, fecha_salida_real, total_pagar, estado)
        VALUES ('${estancia2Id}', '${guestIdsByIndex[1]}', '${roomIdsByNumber['201']}', '2026-06-01 21:00:00', '2026-06-02 07:00:00', '2026-06-02 07:00:00', 70.00, 'finalizado');
      `);
      await queryRunner.query(`
        INSERT INTO cobranzas (id, estanciaId, huespedId, tipo, monto, metodoPago, concepto, fecha, sesionCajaId)
        VALUES ('${this.generateUUID()}', '${estancia2Id}', '${guestIdsByIndex[1]}', 'pago', 70.00, 'yape', 'Cobro completo de estancia Hab. 201', '2026-06-02 07:00:00', '${sesion2Id}');
      `);

      // Estancia 3: Hab 103, Huésped 3 (Carlos Mendoza), Turno 3. S/. 50.00
      const estancia3Id = this.generateUUID();
      await queryRunner.query(`
        INSERT INTO estancias (id, huespedId, habitacionId, fecha_entrada, fecha_salida_programada, fecha_salida_real, total_pagar, estado)
        VALUES ('${estancia3Id}', '${guestIdsByIndex[2]}', '${roomIdsByNumber['103']}', '2026-07-01 10:00:00', '2026-07-01 18:00:00', '2026-07-01 18:00:00', 50.00, 'finalizado');
      `);
      await queryRunner.query(`
        INSERT INTO cobranzas (id, estanciaId, huespedId, tipo, monto, metodoPago, concepto, fecha, sesionCajaId)
        VALUES ('${this.generateUUID()}', '${estancia3Id}', '${guestIdsByIndex[2]}', 'pago', 50.00, 'plin', 'Cobro completo de estancia Hab. 103', '2026-07-01 18:00:00', '${sesion3Id}');
      `);

      // Estancia 4: Hab 203, Huésped 4 (Ana Flores), Turno 4. S/. 80.00
      const estancia4Id = this.generateUUID();
      await queryRunner.query(`
        INSERT INTO estancias (id, huespedId, habitacionId, fecha_entrada, fecha_salida_programada, fecha_salida_real, total_pagar, estado)
        VALUES ('${estancia4Id}', '${guestIdsByIndex[3]}', '${roomIdsByNumber['203']}', '2026-07-15 09:00:00', '2026-07-15 17:00:00', '2026-07-15 17:00:00', 80.00, 'finalizado');
      `);
      await queryRunner.query(`
        INSERT INTO cobranzas (id, estanciaId, huespedId, tipo, monto, metodoPago, concepto, fecha, sesionCajaId)
        VALUES ('${this.generateUUID()}', '${estancia4Id}', '${guestIdsByIndex[3]}', 'pago', 80.00, 'tarjeta', 'Cobro de estancia Hab. 203', '2026-07-15 17:00:00', '${sesion4Id}');
      `);

      // Estancia 5: Hab 204, Huésped 1 (Juan Perez) - Segunda visita, Turno 4. S/. 80.00
      const estancia5Id = this.generateUUID();
      await queryRunner.query(`
        INSERT INTO estancias (id, huespedId, habitacionId, fecha_entrada, fecha_salida_programada, fecha_salida_real, total_pagar, estado)
        VALUES ('${estancia5Id}', '${guestIdsByIndex[0]}', '${roomIdsByNumber['204']}', '2026-07-15 11:00:00', '2026-07-15 19:00:00', '2026-07-15 19:00:00', 80.00, 'finalizado');
      `);
      await queryRunner.query(`
        INSERT INTO cobranzas (id, estanciaId, huespedId, tipo, monto, metodoPago, concepto, fecha, sesionCajaId)
        VALUES ('${this.generateUUID()}', '${estancia5Id}', '${guestIdsByIndex[0]}', 'pago', 80.00, 'efectivo', 'Cobro de estancia Hab. 204', '2026-07-15 19:00:00', '${sesion4Id}');
      `);

      // Estancia 6: Hab 101, Huésped 1 (Juan Perez) - Tercera visita, en Julio. S/. 45.00
      const estancia6Id = this.generateUUID();
      await queryRunner.query(`
        INSERT INTO estancias (id, huespedId, habitacionId, fecha_entrada, fecha_salida_programada, fecha_salida_real, total_pagar, estado)
        VALUES ('${estancia6Id}', '${guestIdsByIndex[0]}', '${roomIdsByNumber['101']}', '2026-07-20 10:00:00', '2026-07-20 20:00:00', '2026-07-20 20:00:00', 45.00, 'finalizado');
      `);
      await queryRunner.query(`
        INSERT INTO cobranzas (id, estanciaId, huespedId, tipo, monto, metodoPago, concepto, fecha, sesionCajaId)
        VALUES ('${this.generateUUID()}', '${estancia6Id}', '${guestIdsByIndex[0]}', 'pago', 45.00, 'yape', 'Cobro de estancia Hab. 101', '2026-07-20 20:00:00', null);
      `);

      // Estancia 7: Hab 201, Huésped 2 (Maria Rodriguez) - Segunda visita. S/. 70.00
      const estancia7Id = this.generateUUID();
      await queryRunner.query(`
        INSERT INTO estancias (id, huespedId, habitacionId, fecha_entrada, fecha_salida_programada, fecha_salida_real, total_pagar, estado)
        VALUES ('${estancia7Id}', '${guestIdsByIndex[1]}', '${roomIdsByNumber['201']}', '2026-07-20 12:00:00', '2026-07-21 11:00:00', '2026-07-21 11:00:00', 70.00, 'finalizado');
      `);
      await queryRunner.query(`
        INSERT INTO cobranzas (id, estanciaId, huespedId, tipo, monto, metodoPago, concepto, fecha, sesionCajaId)
        VALUES ('${this.generateUUID()}', '${estancia7Id}', '${guestIdsByIndex[1]}', 'pago', 70.00, 'efectivo', 'Cobro de estancia Hab. 201', '2026-07-21 11:00:00', null);
      `);

      // Estancia 8: Hab 105, Huésped 7 (Jose Quispe), Julio. S/. 55.00
      const estancia8Id = this.generateUUID();
      await queryRunner.query(`
        INSERT INTO estancias (id, huespedId, habitacionId, fecha_entrada, fecha_salida_programada, fecha_salida_real, total_pagar, estado)
        VALUES ('${estancia8Id}', '${guestIdsByIndex[6]}', '${roomIdsByNumber['105']}', '2026-07-22 14:00:00', '2026-07-23 13:00:00', '2026-07-23 13:00:00', 55.00, 'finalizado');
      `);
      await queryRunner.query(`
        INSERT INTO cobranzas (id, estanciaId, huespedId, tipo, monto, metodoPago, concepto, fecha, sesionCajaId)
        VALUES ('${this.generateUUID()}', '${estancia8Id}', '${guestIdsByIndex[6]}', 'pago', 55.00, 'plin', 'Cobro de estancia Hab. 105', '2026-07-23 13:00:00', null);
      `);

      // 8. Crear Estancias Activas (Para que figuren Ocupadas hoy: 26 de Julio 2026)
      
      // Estancia Activa 1: Hab 102 (Simple, S/. 45.00), Huésped 5 (Pedro Gomez).
      // Entró hoy 14:00. Pagó adelanto de S/. 20.00 en Efectivo.
      const estanciaActiva1Id = this.generateUUID();
      await queryRunner.query(`
        INSERT INTO estancias (id, huespedId, habitacionId, fecha_entrada, fecha_salida_programada, fecha_salida_real, total_pagar, estado)
        VALUES ('${estanciaActiva1Id}', '${guestIdsByIndex[4]}', '${roomIdsByNumber['102']}', '2026-07-26 14:00:00', '2026-07-27 13:00:00', null, 45.00, 'pendiente');
      `);
      await queryRunner.query(`
        INSERT INTO cobranzas (id, estanciaId, huespedId, tipo, monto, metodoPago, concepto, fecha, sesionCajaId)
        VALUES ('${this.generateUUID()}', '${estanciaActiva1Id}', '${guestIdsByIndex[4]}', 'pago', 20.00, 'efectivo', 'Adelanto de ingreso Hab. 102', '2026-07-26 14:00:00', null);
      `);

      // Estancia Activa 2: Hab 202 (Matrimonial, S/. 70.00), Huésped 6 (Lucia Castro).
      // Entró hoy 15:00. Pagó adelanto de S/. 30.00 en Yape.
      const estanciaActiva2Id = this.generateUUID();
      await queryRunner.query(`
        INSERT INTO estancias (id, huespedId, habitacionId, fecha_entrada, fecha_salida_programada, fecha_salida_real, total_pagar, estado)
        VALUES ('${estanciaActiva2Id}', '${guestIdsByIndex[5]}', '${roomIdsByNumber['202']}', '2026-07-26 15:00:00', '2026-07-27 13:00:00', null, 70.00, 'pendiente');
      `);
      await queryRunner.query(`
        INSERT INTO cobranzas (id, estanciaId, huespedId, tipo, monto, metodoPago, concepto, fecha, sesionCajaId)
        VALUES ('${this.generateUUID()}', '${estanciaActiva2Id}', '${guestIdsByIndex[5]}', 'pago', 30.00, 'yape', 'Adelanto de ingreso Hab. 202', '2026-07-26 15:00:00', null);
      `);

      // 9. Crear Egresos / Gastos
      // Gasto 1: en Turno 1
      await queryRunner.query(`
        INSERT INTO gastos (id, usuario, monto, concepto, fecha, sesionCajaId)
        VALUES ('${this.generateUUID()}', 'Juan Recepcionista', 30.00, 'Compra de útiles de limpieza para habitaciones', '2026-06-01 12:00:00', '${sesion1Id}');
      `);

      // Gasto 2: en Turno 2
      await queryRunner.query(`
        INSERT INTO gastos (id, usuario, monto, concepto, fecha, sesionCajaId)
        VALUES ('${this.generateUUID()}', 'Maria Recepcionista', 50.00, 'Pago de recibo de agua - EPS', '2026-06-01 22:00:00', '${sesion2Id}');
      `);

      // Gasto 3: en Turno 4
      await queryRunner.query(`
        INSERT INTO gastos (id, usuario, monto, concepto, fecha, sesionCajaId)
        VALUES ('${this.generateUUID()}', 'Maria Recepcionista', 20.00, 'Refrigerio de recepción por turno extendido', '2026-07-15 14:00:00', '${sesion4Id}');
      `);

      // Gasto 4: hoy (fuera de turno cerrado)
      await queryRunner.query(`
        INSERT INTO gastos (id, usuario, monto, concepto, fecha, sesionCajaId)
        VALUES ('${this.generateUUID()}', 'Supervisor General', 15.00, 'Foco led de repuesto para pasillo de recepción', '2026-07-26 16:00:00', null);
      `);

      // 10. Bitácora de actividades (Auditoría)
      const actividadesMock = [
        { accion: 'Apertura de Caja', desc: 'Juan Recepcionista abrió caja con S/. 100.00', user: 'Juan Recepcionista', date: '2026-06-01 08:00:00' },
        { accion: 'Check-In', desc: 'Juan Recepcionista realizó Check-In en Habitación 101', user: 'Juan Recepcionista', date: '2026-06-01 09:00:00' },
        { accion: 'Gasto', desc: 'Juan Recepcionista registró gasto menor de S/. 30.00', user: 'Juan Recepcionista', date: '2026-06-01 12:00:00' },
        { accion: 'Check-Out', desc: 'Juan Recepcionista realizó Check-Out de Habitación 101', user: 'Juan Recepcionista', date: '2026-06-01 19:00:00' },
        { accion: 'Cierre de Caja', desc: 'Juan Recepcionista cerró caja con balance neto S/. 270.00', user: 'Juan Recepcionista', date: '2026-06-01 20:00:00' },
        { accion: 'Apertura de Caja', desc: 'Maria Recepcionista abrió caja con S/. 270.00', user: 'Maria Recepcionista', date: '2026-06-01 20:00:00' },
        { accion: 'Check-In', desc: 'Maria Recepcionista realizó Check-In en Habitación 201', user: 'Maria Recepcionista', date: '2026-06-01 21:00:00' },
        { accion: 'Gasto', desc: 'Maria Recepcionista registró gasto menor de S/. 50.00', user: 'Maria Recepcionista', date: '2026-06-01 22:00:00' },
        { accion: 'Check-Out', desc: 'Maria Recepcionista realizó Check-Out de Habitación 201', user: 'Maria Recepcionista', date: '2026-06-02 07:00:00' },
        { accion: 'Cierre de Caja', desc: 'Maria Recepcionista cerró caja con balance neto S/. 570.00', user: 'Maria Recepcionista', date: '2026-06-02 08:00:00' },
      ];

      for (const act of actividadesMock) {
        await queryRunner.query(`
          INSERT INTO actividades (id, accion, descripcion, usuario, fecha)
          VALUES ('${this.generateUUID()}', '${act.accion}', '${act.desc}', '${act.user}', '${act.date}');
        `);
      }

      // 10.1. Generar estancias y cobranzas históricas (2020 a 2025)
      const metodos = ['efectivo', 'yape', 'plin', 'tarjeta', 'transferencia'];
      let stayCounter = 1;
      
      for (let year = 2020; year <= 2025; year++) {
        // Generamos unas 6 estancias por año en diferentes meses
        const meses = [1, 3, 5, 7, 9, 11]; // Febrero, Abril, Junio, Agosto, Octubre, Diciembre
        for (const mes of meses) {
          const guestId = guestIdsByIndex[stayCounter % guestIdsByIndex.length];
          const roomNum = Object.keys(roomIdsByNumber)[stayCounter % Object.keys(roomIdsByNumber).length];
          const roomId = roomIdsByNumber[roomNum];
          const roomPrice = habitacionesData.find(r => r.numero === roomNum)?.precio || 50.00;
          
          const estanciaId = this.generateUUID();
          const mesStr = mes < 9 ? `0${mes + 1}` : `${mes + 1}`;
          const fechaEntrada = `${year}-${mesStr}-10 12:00:00`;
          const fechaSalida = `${year}-${mesStr}-11 11:00:00`;
          
          // Estancia finalizada
          await queryRunner.query(`
            INSERT INTO estancias (id, huespedId, habitacionId, fecha_entrada, fecha_salida_programada, fecha_salida_real, total_pagar, estado)
            VALUES ('${estanciaId}', '${guestId}', '${roomId}', '${fechaEntrada}', '${fechaSalida}', '${fechaSalida}', ${roomPrice}, 'finalizado');
          `);
          
          // Cobranza asociada
          const metodo = metodos[stayCounter % metodos.length];
          await queryRunner.query(`
            INSERT INTO cobranzas (id, estanciaId, huespedId, tipo, monto, metodoPago, concepto, fecha, sesionCajaId)
            VALUES ('${this.generateUUID()}', '${estanciaId}', '${guestId}', 'pago', ${roomPrice}, '${metodo}', 'Cobro completo estancia Hab. ${roomNum}', '${fechaSalida}', null);
          `);

          // Un gasto menor aleatorio por cada 3 estancias para egresos de años anteriores
          if (stayCounter % 3 === 0) {
            const gastoMonto = 15.00 + (stayCounter % 20);
            await queryRunner.query(`
              INSERT INTO gastos (id, usuario, monto, concepto, fecha, sesionCajaId)
              VALUES ('${this.generateUUID()}', 'Juan Recepcionista', ${gastoMonto}, 'Gasto de mantenimiento menor', '${year}-${mesStr}-11 14:00:00', null);
            `);
          }
          
          stayCounter++;
        }
      }

      // 11. Solicitudes de egreso
      await queryRunner.query(`
        INSERT INTO solicitudes_egreso (id, usuario_id, usuario_nombre, monto, concepto, descripcion, estado, aprobado_por_id, aprobado_por_nombre, sesion_caja_id, fecha)
        VALUES ('${this.generateUUID()}', ${recep1Id}, 'Juan Recepcionista', 25.50, 'Falta papel higiénico', 'Compra urgente de papel higiénico y jabón líquido para baños comunes', 'pendiente', null, null, '${sesion1Id}', '2026-07-26 18:00:00');
      `);

      await queryRunner.query(`
        INSERT INTO solicitudes_egreso (id, usuario_id, usuario_nombre, monto, concepto, descripcion, estado, aprobado_por_id, aprobado_por_nombre, sesion_caja_id, fecha)
        VALUES ('${this.generateUUID()}', ${recep2Id}, 'Maria Recepcionista', 45.00, 'Cable HDMI repuesto', 'Para la televisión de la habitación 203 que no tiene señal', 'pendiente', null, null, null, '2026-07-26 19:15:00');
      `);

      await queryRunner.query(`
        INSERT INTO solicitudes_egreso (id, usuario_id, usuario_nombre, monto, concepto, descripcion, estado, aprobado_por_id, aprobado_por_nombre, sesion_caja_id, fecha, fecha_resolucion)
        VALUES ('${this.generateUUID()}', ${recep1Id}, 'Juan Recepcionista', 35.00, 'Bidones de Agua', 'Compra de 2 bidones de agua mineral para recepción', 'aprobado', 1, 'Administrador General', '${sesion3Id}', '2026-07-01 11:00:00', '2026-07-01 11:30:00');
      `);

      await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1;');
      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1;');
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // Generador manual de UUIDs para evitar dependencias
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
