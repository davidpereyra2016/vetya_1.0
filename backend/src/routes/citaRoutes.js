import express from "express";
import Cita from "../models/Cita.js";
import Mascota from "../models/Mascota.js";
import Prestador from "../models/Prestador.js";
import Servicio from "../models/Servicio.js";
import Disponibilidad from "../models/Disponibilidad.js";
import protectRoute from "../middleware/auth.middleware.js";
import mongoose from "mongoose";

const router = express.Router();

// Obtener todas las citas del usuario autenticado
router.get("/", protectRoute, async (req, res) => {
  try {
    const citas = await Cita.find({ usuario: req.user._id })
      .populate("mascota", "nombre tipo raza imagen")
      .populate("veterinario", "nombre especialidad imagen rating")
      .populate("servicio", "nombre icono color")
      .sort({ fecha: 1 });
    
    res.status(200).json(citas);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al obtener las citas" });
  }
});

// Obtener citas por estado
router.get("/estado/:estado", protectRoute, async (req, res) => {
  try {
    const estados = ["Pendiente", "Confirmada", "Cancelada", "Completada"];
    if (!estados.includes(req.params.estado)) {
      return res.status(400).json({ message: "Estado de cita inválido" });
    }
    
    const citas = await Cita.find({ 
      usuario: req.user._id,
      estado: req.params.estado
    })
      .populate("mascota", "nombre tipo raza imagen")
      .populate("veterinario", "nombre especialidad imagen rating")
      .populate("servicio", "nombre icono color")
      .sort({ fecha: 1 });
    
    res.status(200).json(citas);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al obtener las citas" });
  }
});

// Obtener prestadores que ofrecen el servicio de consulta general
router.get("/prestadores/consulta-general", protectRoute, async (req, res) => {
  try {
    // Buscar servicios de consulta general
    const serviciosConsultaGeneral = await Servicio.find({
      categoria: 'Consulta general',
      activo: true
    }).select('prestadorId');

    if (!serviciosConsultaGeneral || serviciosConsultaGeneral.length === 0) {
      return res.status(200).json([]);
    }

    // Obtener IDs únicos de prestadores
    const prestadorIds = [...new Set(serviciosConsultaGeneral.map(s => s.prestadorId))];

    // Buscar prestadores activos que ofrecen estos servicios
    const prestadoresConsultaGeneral = await Prestador.find({
      _id: { $in: prestadorIds },
      activo: true
    }).select('_id nombre tipo imagen direccion especialidades rating');

    res.status(200).json(prestadoresConsultaGeneral);
  } catch (error) {
    console.error('Error al obtener prestadores con consulta general:', error);
    res.status(500).json({ 
      message: "Error interno al buscar prestadores", 
      error: error.message 
    });
  }
});

// Obtener disponibilidad de un prestador para un servicio específico
router.get("/prestadores/:prestadorId/disponibilidad", protectRoute, async (req, res) => {
  try {
    const { prestadorId } = req.params;
    const { servicioId } = req.query; // ID del servicio que se quiere agendar

    // Validaciones básicas
    if (!mongoose.Types.ObjectId.isValid(prestadorId)) {
      return res.status(400).json({ message: "ID de prestador inválido" });
    }

    // 1. Obtener el prestador y verificar que existe
    const prestador = await Prestador.findById(prestadorId);
    if (!prestador) {
      return res.status(404).json({ message: "Prestador no encontrado" });
    }

    // 2. Obtener el servicio y verificar que el prestador lo ofrece
    let servicio;
    if (servicioId) {
      servicio = await Servicio.findOne({ 
        _id: servicioId, 
        prestadorId: prestador._id 
      });
      
      if (!servicio) {
        return res.status(404).json({ 
          message: "Este prestador no ofrece el servicio solicitado" 
        });
      }
    }

    // 3. Obtener las citas existentes del prestador (para filtrar horarios ocupados)
    const citasExistentes = await Cita.find({
      prestador: prestadorId,
      estado: { $in: ["Pendiente", "Confirmada"] },
      fecha: { $gte: new Date() } // Solo citas futuras
    });

    // 4. Generar disponibilidad para los próximos 14 días
    const disponibilidad = [];
    const hoy = new Date();
    const duracionServicio = servicio?.duracion || 30; // Duración en minutos

    for (let i = 0; i < 14; i++) {
      const fecha = new Date(hoy);
      fecha.setDate(hoy.getDate() + i);
      const diaSemana = fecha.getDay(); // 0=Domingo, 1=Lunes, etc.

      // Buscar horario del prestador para este día
      const horarioDia = prestador.horarios.find(h => h.dia === diaSemana);
      if (!horarioDia) continue; // No trabaja este día

      // Procesar turno de mañana si está activo
      const slotsDisponibles = [];
      if (horarioDia.manana?.activo) {
        const slotsManana = generarSlotsDisponibles(
          horarioDia.manana.apertura,
          horarioDia.manana.cierre,
          duracionServicio,
          fecha,
          citasExistentes
        );
        slotsDisponibles.push(...slotsManana);
      }

      // Procesar turno de tarde si está activo
      if (horarioDia.tarde?.activo) {
        const slotsTarde = generarSlotsDisponibles(
          horarioDia.tarde.apertura,
          horarioDia.tarde.cierre,
          duracionServicio,
          fecha,
          citasExistentes
        );
        slotsDisponibles.push(...slotsTarde);
      }

      if (slotsDisponibles.length > 0) {
        disponibilidad.push({
          fecha: fecha,
          diaSemana: diaSemana,
          nombreDia: obtenerNombreDia(diaSemana),
          slots: slotsDisponibles
        });
      }
    }

    res.status(200).json(disponibilidad);
  } catch (error) {
    console.error('Error al obtener disponibilidad:', error);
    res.status(500).json({ 
      message: "Error al obtener disponibilidad", 
      error: error.message 
    });
  }
});

// Función auxiliar para generar slots disponibles
function generarSlotsDisponibles(horaInicio, horaFin, duracionMinutos, fecha, citasExistentes) {
  const slots = [];
  const [inicioHora, inicioMinuto] = horaInicio.split(':').map(Number);
  const [finHora, finMinuto] = horaFin.split(':').map(Number);
  
  let horaActual = inicioHora;
  let minutoActual = inicioMinuto;
  const finEnMinutos = finHora * 60 + finMinuto;
  
  while (horaActual * 60 + minutoActual < finEnMinutos) {
    const horaFinSlot = new Date(fecha);
    horaFinSlot.setHours(horaActual, minutoActual + duracionMinutos, 0, 0);
    
    // Verificar si este slot está ocupado por alguna cita existente
    const estaOcupado = citasExistentes.some(cita => {
      const citaInicio = new Date(cita.fecha);
      const [citaHora, citaMinuto] = cita.horaInicio.split(':').map(Number);
      citaInicio.setHours(citaHora, citaMinuto, 0, 0);
      
      const citaFin = new Date(cita.fecha);
      const [citaFinHora, citaFinMinuto] = cita.horaFin.split(':').map(Number);
      citaFin.setHours(citaFinHora, citaFinMinuto, 0, 0);
      
      const slotInicio = new Date(fecha);
      slotInicio.setHours(horaActual, minutoActual, 0, 0);
      
      return (
        (slotInicio >= citaInicio && slotInicio < citaFin) ||
        (horaFinSlot > citaInicio && horaFinSlot <= citaFin) ||
        (slotInicio <= citaInicio && horaFinSlot >= citaFin)
      );
    });
    
    if (!estaOcupado) {
      slots.push({
        inicio: `${horaActual.toString().padStart(2, '0')}:${minutoActual.toString().padStart(2, '0')}`,
        fin: horaFinSlot.toTimeString().substring(0, 5),
        disponible: true
      });
    }
    
    // Avanzar al siguiente slot
    minutoActual += duracionMinutos;
    if (minutoActual >= 60) {
      horaActual += Math.floor(minutoActual / 60);
      minutoActual = minutoActual % 60;
    }
  }
  
  return slots;
}

// Función auxiliar para obtener nombre del día
function obtenerNombreDia(numeroDia) {
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return dias[numeroDia];
}

// Obtener una cita por ID
router.get("/:id", protectRoute, async (req, res) => {
  try {
    const cita = await Cita.findById(req.params.id)
      .populate("mascota", "nombre tipo raza imagen edad genero color")
      .populate("veterinario", "nombre especialidad imagen rating experiencia ubicacion")
      .populate("servicio", "nombre descripcion icono color precio duracion");
    
    if (!cita) {
      return res.status(404).json({ message: "Cita no encontrada" });
    }
    
    // Verificar si el usuario actual es el propietario
    if (cita.usuario.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "No autorizado para ver esta cita" });
    }
    
    res.status(200).json(cita);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al obtener la cita" });
  }
});

// Crear una nueva cita
router.post("/", protectRoute, async (req, res) => {
  try {
    const { mascota, veterinario, servicio, fecha, horaInicio, horaFin, motivo, ubicacion, direccion } = req.body;
    
    // Validar campos obligatorios
    if (!mascota || !veterinario || !servicio || !fecha || !horaInicio || !horaFin) {
      return res.status(400).json({ message: "Por favor completa todos los campos obligatorios" });
    }
    
    // Verificar que la mascota exista y pertenezca al usuario
    const mascotaExiste = await Mascota.findById(mascota);
    if (!mascotaExiste) {
      return res.status(404).json({ message: "Mascota no encontrada" });
    }
    if (mascotaExiste.propietario.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "No autorizado para programar cita con esta mascota" });
    }
    
    // Verificar que el veterinario exista
    const veterinarioExiste = await Veterinario.findById(veterinario);
    if (!veterinarioExiste) {
      return res.status(404).json({ message: "Veterinario no encontrado" });
    }
    
    // Verificar que el servicio exista
    const servicioExiste = await Servicio.findById(servicio);
    if (!servicioExiste) {
      return res.status(404).json({ message: "Servicio no encontrado" });
    }
    
    // Verificar disponibilidad
    const fechaCita = new Date(fecha);
    const citasExistentes = await Cita.find({
      veterinario,
      fecha: {
        $gte: new Date(fechaCita.setHours(0, 0, 0, 0)),
        $lte: new Date(fechaCita.setHours(23, 59, 59, 999))
      },
      estado: { $in: ["Pendiente", "Confirmada"] }
    });
    
    for (const citaExistente of citasExistentes) {
      if ((horaInicio >= citaExistente.horaInicio && horaInicio < citaExistente.horaFin) ||
          (horaFin > citaExistente.horaInicio && horaFin <= citaExistente.horaFin) ||
          (horaInicio <= citaExistente.horaInicio && horaFin >= citaExistente.horaFin)) {
        return res.status(400).json({ message: "El veterinario ya tiene una cita agendada en ese horario" });
      }
    }
    
    // Crear nueva cita
    const nuevaCita = new Cita({
      mascota,
      veterinario,
      servicio,
      fecha,
      horaInicio,
      horaFin,
      motivo: motivo || "",
      ubicacion: ubicacion || "Clínica",
      direccion: ubicacion === "Domicilio" ? (direccion || "") : "",
      usuario: req.user._id,
      costoEstimado: servicioExiste.precio || 0
    });
    
    await nuevaCita.save();
    
    // Populate para devolver la información completa
    const citaCompletada = await Cita.findById(nuevaCita._id)
      .populate("mascota", "nombre tipo raza imagen")
      .populate("veterinario", "nombre especialidad imagen")
      .populate("servicio", "nombre icono color");
    
    res.status(201).json(citaCompletada);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al crear la cita" });
  }
});

// Actualizar estado de una cita
router.patch("/:id/estado", protectRoute, async (req, res) => {
  try {
    const { estado } = req.body;
    const estados = ["Pendiente", "Confirmada", "Cancelada", "Completada"];
    
    if (!estado || !estados.includes(estado)) {
      return res.status(400).json({ message: "Estado de cita inválido" });
    }
    
    const cita = await Cita.findById(req.params.id);
    
    if (!cita) {
      return res.status(404).json({ message: "Cita no encontrada" });
    }
    
    // Verificar si el usuario actual es el propietario
    if (cita.usuario.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "No autorizado para modificar esta cita" });
    }
    
    cita.estado = estado;
    
    // Si se completa la cita, agregar automáticamente al historial médico de la mascota
    if (estado === "Completada" && cita.estado !== "Completada") {
      const mascota = await Mascota.findById(cita.mascota);
      
      if (mascota) {
        mascota.historialMedico.push({
          fecha: cita.fecha,
          descripcion: cita.motivo || "Cita completada",
          veterinario: cita.veterinario,
          tipoVisita: "Consulta"
        });
        
        mascota.ultimaVisita = cita.fecha;
        await mascota.save();
      }
    }
    
    await cita.save();
    
    const citaActualizada = await Cita.findById(cita._id)
      .populate("mascota", "nombre tipo raza imagen")
      .populate("veterinario", "nombre especialidad imagen")
      .populate("servicio", "nombre icono color");
    
    res.status(200).json(citaActualizada);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al actualizar el estado de la cita" });
  }
});

// Eliminar una cita
router.delete("/:id", protectRoute, async (req, res) => {
  try {
    const cita = await Cita.findById(req.params.id);
    
    if (!cita) {
      return res.status(404).json({ message: "Cita no encontrada" });
    }
    
    // Verificar si el usuario actual es el propietario
    if (cita.usuario.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "No autorizado para eliminar esta cita" });
    }
    
    // Solo se pueden eliminar citas pendientes o canceladas
    if (cita.estado !== "Pendiente" && cita.estado !== "Cancelada") {
      return res.status(400).json({ message: "Solo se pueden eliminar citas pendientes o canceladas" });
    }
    
    await Cita.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Cita eliminada con éxito" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al eliminar la cita" });
  }
});

// Obtener horarios disponibles de un veterinario en una fecha específica
router.get("/horarios-disponibles/:veterinarioId/:fecha", async (req, res) => {
  try {
    const { veterinarioId, fecha } = req.params;
    
    // Verificar que el veterinario exista
    const veterinario = await Veterinario.findById(veterinarioId);
    if (!veterinario) {
      return res.status(404).json({ message: "Veterinario no encontrado" });
    }
    
    // Convertir la fecha a objeto Date
    const fechaConsulta = new Date(fecha);
    const diaSemana = fechaConsulta.getDay(); // 0: Domingo, 1: Lunes, etc.
    
    // Mapear el día de la semana a su nombre en español
    const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const nombreDia = diasSemana[diaSemana];
    
    // Verificar si el veterinario trabaja ese día
    const horarioDia = veterinario.horarios.find(h => h.dia === nombreDia && h.disponible);
    if (!horarioDia) {
      return res.status(400).json({ message: "El veterinario no atiende este día" });
    }
    
    // Obtener las horas de inicio y fin del horario del veterinario
    const [horaInicioStr, minInicioStr] = horarioDia.horaInicio.split(':');
    const [horaFinStr, minFinStr] = horarioDia.horaFin.split(':');
    
    const horaInicio = parseInt(horaInicioStr);
    const minInicio = parseInt(minInicioStr || 0);
    const horaFin = parseInt(horaFinStr);
    const minFin = parseInt(minFinStr || 0);
    
    // Generar bloques de 30 minutos
    const bloquesDisponibles = [];
    for (let hora = horaInicio; hora < horaFin; hora++) {
      for (let min = 0; min < 60; min += 30) {
        // Si es la hora de inicio, verificar los minutos
        if (hora === horaInicio && min < minInicio) continue;
        // Si es la hora de fin, verificar los minutos
        if (hora === horaFin && min >= minFin) continue;
        
        const horaFormateada = `${hora.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
        bloquesDisponibles.push(horaFormateada);
      }
    }
    
    // Obtener citas existentes para ese día y veterinario
    const citasExistentes = await Cita.find({
      veterinario: veterinarioId,
      fecha: {
        $gte: new Date(fechaConsulta.setHours(0, 0, 0, 0)),
        $lte: new Date(fechaConsulta.setHours(23, 59, 59, 999))
      },
      estado: { $in: ["Pendiente", "Confirmada"] }
    }).select("horaInicio horaFin");
    
    // Filtrar bloques que ya están ocupados
    const bloquesOcupados = citasExistentes.flatMap(cita => {
      const [horaInicioStr, minInicioStr] = cita.horaInicio.split(':');
      const [horaFinStr, minFinStr] = cita.horaFin.split(':');
      
      const horaInicioCita = parseInt(horaInicioStr);
      const minInicioCita = parseInt(minInicioStr || 0);
      const horaFinCita = parseInt(horaFinStr);
      const minFinCita = parseInt(minFinStr || 0);
      
      const bloques = [];
      for (let hora = horaInicioCita; hora <= horaFinCita; hora++) {
        for (let min = 0; min < 60; min += 30) {
          // Si es la hora de inicio, verificar los minutos
          if (hora === horaInicioCita && min < minInicioCita) continue;
          // Si es la hora de fin, verificar los minutos
          if (hora === horaFinCita && min >= minFinCita) continue;
          
          const horaFormateada = `${hora.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
          bloques.push(horaFormateada);
        }
      }
      return bloques;
    });
    
    const horariosDisponibles = bloquesDisponibles.filter(bloque => !bloquesOcupados.includes(bloque));
    
    res.status(200).json(horariosDisponibles);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al obtener horarios disponibles" });
  }
});

export default router;
