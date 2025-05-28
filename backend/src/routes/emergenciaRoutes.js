import express from 'express';
import mongoose from 'mongoose';
import Emergencia from "../models/Emergencia.js";
import Mascota from "../models/Mascota.js";
import Prestador from "../models/Prestador.js";
import cloudinary from "../lib/cloudinary.js";
import protectRoute from "../middleware/auth.middleware.js";

const router = express.Router();

// Obtener todas las emergencias del usuario autenticado
router.get("/", protectRoute, async (req, res) => {
  try {
    const emergencias = await Emergencia.find({ usuario: req.user._id })
      .populate("mascota", "nombre tipo raza imagen")
      .populate("veterinario", "nombre especialidad imagen rating")
      .sort({ fechaSolicitud: -1 });
    
    res.status(200).json(emergencias);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al obtener las emergencias" });
  }
});

// Obtener emergencias por estado
router.get("/estado/:estado", protectRoute, async (req, res) => {
  try {
    const estados = ["Solicitada", "Asignada", "En camino", "Atendida", "Cancelada"];
    if (!estados.includes(req.params.estado)) {
      return res.status(400).json({ message: "Estado de emergencia inválido" });
    }
    
    const emergencias = await Emergencia.find({ 
      usuario: req.user._id,
      estado: req.params.estado
    })
      .populate("mascota", "nombre tipo raza imagen")
      .populate("veterinario", "nombre especialidad imagen rating")
      .sort({ fechaSolicitud: -1 });
    
    res.status(200).json(emergencias);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al obtener las emergencias" });
  }
});

// Obtener emergencias activas del usuario
router.get("/activas", protectRoute, async (req, res) => {
  try {
    const estadosActivos = ["Solicitada", "Asignada", "Confirmada", "En camino"];
    
    const emergencias = await Emergencia.find({ 
      usuario: req.user._id,
      estado: { $in: estadosActivos }
    })
      .populate("mascota", "nombre tipo raza imagen")
      .populate("veterinario", "nombre especialidad imagen rating");
    
    res.status(200).json(emergencias);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al obtener la emergencia" });
  }
});

// Obtener emergencias asignadas al veterinario autenticado
router.get("/asignadas", protectRoute, async (req, res) => {
  try {
    // Verificar que el usuario sea un prestador de tipo veterinario
    const prestador = await Prestador.findOne({ usuario: req.user._id });
    
    if (!prestador || prestador.tipo !== "Veterinario") {
      return res.status(403).json({ message: "Solo los veterinarios pueden acceder a emergencias asignadas" });
    }
    
    // Obtener todas las emergencias asignadas a este veterinario
    const emergencias = await Emergencia.find({
      veterinario: prestador._id,
      estado: { $in: ["Asignada", "En camino", "Atendida"] }
    })
      .populate("mascota", "nombre tipo raza imagen edad genero color")
      .populate("usuario", "username telefono email profilePicture")
      .sort({ fechaAsignacion: -1 });
    
    console.log(`Encontradas ${emergencias.length} emergencias asignadas al veterinario ${prestador._id}`);
    res.status(200).json(emergencias);
  } catch (error) {
    console.log("Error al obtener emergencias asignadas:", error);
    res.status(500).json({ message: "Error al obtener emergencias asignadas" });
  }
});

// Obtener una emergencia por ID
router.get("/:id", protectRoute, async (req, res) => {
  try {
    console.log('Solicitud de emergencia por ID:', req.params.id, 'Usuario:', req.user._id);
    
    // Buscamos primero al prestador si el usuario es un prestador (veterinario)
    let prestador = null;
    try {
      prestador = await Prestador.findOne({ usuario: req.user._id });
      console.log('Prestador encontrado:', prestador ? prestador._id : 'No es prestador');
    } catch (err) {
      console.log('Error al buscar prestador:', err);
    }
    
    // Primero obtenemos la emergencia sin populate para verificar permisos
    const emergenciaBase = await Emergencia.findById(req.params.id);
    
    if (!emergenciaBase) {
      return res.status(404).json({ message: "Emergencia no encontrada" });
    }
    
    // Verificar si el usuario actual es el propietario o el veterinario asignado
    const esCliente = emergenciaBase.usuario.toString() === req.user._id.toString();
    // Si es prestador, verificamos si el ID del prestador coincide con el veterinario asignado
    const esVeterinarioAsignado = prestador && emergenciaBase.veterinario && 
      emergenciaBase.veterinario.toString() === prestador._id.toString();
    
    console.log('Verificando permisos detallados:', {
      usuarioId: req.user._id,
      prestadorId: prestador ? prestador._id : null,
      esCliente,
      esVeterinarioAsignado,
      usuarioEmergencia: emergenciaBase.usuario.toString(),
      veterinarioEmergencia: emergenciaBase.veterinario ? emergenciaBase.veterinario.toString() : null
    });
    
    if (!esCliente && !esVeterinarioAsignado) {
      console.log('Acceso denegado - No es cliente ni veterinario asignado');
      return res.status(401).json({ message: "No autorizado para ver esta emergencia" });
    }
    
    // Si está autorizado, ahora obtenemos la emergencia con todos los datos populados
    const emergencia = await Emergencia.findById(req.params.id)
      .populate("mascota", "nombre tipo raza imagen edad genero color")
      .populate("usuario", "username email profilePicture telefono")
      .populate({
        path: "veterinario",
        model: "Prestador",
        select: "nombre especialidad imagen rating experiencia ubicacion telefono email"
      });
    
    console.log('Emergencia enviada al cliente:', {
      id: emergencia._id,
      estado: emergencia.estado,
      mascota: emergencia.mascota ? emergencia.mascota.nombre : null,
      usuario: emergencia.usuario ? emergencia.usuario.email : null,
      veterinario: emergencia.veterinario ? emergencia.veterinario.nombre : null
    });
    
    res.status(200).json(emergencia);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al obtener la emergencia" });
  }
});

// Crear una nueva solicitud de emergencia
router.post("/", protectRoute, async (req, res) => {
  try {
    const { mascota, descripcion, tipoEmergencia, nivelUrgencia, ubicacion, imagenes } = req.body;
    
    // Verificar si el usuario ya tiene una emergencia activa o reciente (dentro de los últimos 5 minutos)
    const tiempoLimite = new Date(Date.now() - 5 * 60 * 1000); // 5 minutos atrás
    
    const emergenciasRecientes = await Emergencia.find({
      usuario: req.user._id,
      estado: { $in: ['Solicitada', 'Asignada', 'En camino'] },
      fechaSolicitud: { $gte: tiempoLimite }
    });
    
    if (emergenciasRecientes.length > 0) {
      console.log(`El usuario ${req.user._id} ya tiene una emergencia activa o reciente`);
      return res.status(429).json({
        message: 'Ya tienes una emergencia activa o has solicitado una recientemente. Por favor espera 5 minutos entre solicitudes.',
        tiempoRestante: Math.ceil((new Date(emergenciasRecientes[0].expiraEn) - new Date()) / 1000 / 60), // tiempo restante en minutos
        emergenciaActiva: emergenciasRecientes[0]
      });
    }
    
    // Validar campos obligatorios
    if (!mascota || !descripcion || !tipoEmergencia || !ubicacion) {
      return res.status(400).json({ message: "Por favor completa todos los campos obligatorios" });
    }
    
    // Verificar que la mascota exista y pertenezca al usuario
    const mascotaExiste = await Mascota.findById(mascota);
    if (!mascotaExiste) {
      return res.status(404).json({ message: "Mascota no encontrada" });
    }
    if (mascotaExiste.propietario.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "No autorizado para solicitar emergencia con esta mascota" });
    }
    
    // Procesar imágenes si se proporcionan
    let imagenesUrls = [];
    if (imagenes && imagenes.length > 0) {
      for (const imagen of imagenes) {
        try {
          const uploadResponse = await cloudinary.uploader.upload(imagen, {
            folder: "emergencias"
          });
          imagenesUrls.push(uploadResponse.secure_url);
        } catch (error) {
          console.log("Error al subir imagen a Cloudinary:", error);
          // Continúa con las otras imágenes si una falla
        }
      }
    }
    
    // Adaptar el formato de ubicación para que coincida con el modelo
    let ubicacionFormateada = {
      direccion: ubicacion.direccion || 'Dirección no especificada',
      ciudad: ubicacion.ciudad || 'Ciudad no especificada',
      coordenadas: {
        lat: ubicacion.coordenadas?.latitud || 0,
        lng: ubicacion.coordenadas?.longitud || 0
      }
    };
    
    console.log('Ubicación formateada:', JSON.stringify(ubicacionFormateada));
    
    // Crear nueva emergencia
    const nuevaEmergencia = new Emergencia({
      usuario: req.user._id,
      mascota,
      descripcion,
      tipoEmergencia,
      nivelUrgencia: nivelUrgencia || "Media",
      estado: "Solicitada",
      ubicacion: ubicacionFormateada,
      fechaSolicitud: new Date(),
      imagenes: imagenesUrls
    });
    
    await nuevaEmergencia.save();
    
    // Buscar veterinarios cercanos (esto es un ejemplo, en una implementación real 
    // podrías usar geolocalización para encontrar los veterinarios más cercanos)
    
    // Populate para devolver la información completa
    const emergenciaCompletada = await Emergencia.findById(nuevaEmergencia._id)
      .populate("mascota", "nombre tipo raza imagen")
      .populate("veterinario", "nombre especialidad imagen rating");
    
    res.status(201).json(emergenciaCompletada);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al crear la solicitud de emergencia" });
  }
});

// Verificar y cancelar emergencias expiradas
router.get("/verificar-expiracion/:id", protectRoute, async (req, res) => {
  try {
    const emergencia = await Emergencia.findById(req.params.id);
    
    if (!emergencia) {
      return res.status(404).json({ message: "Emergencia no encontrada" });
    }
    
    // Verificar si el usuario actual es el propietario
    if (emergencia.usuario.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "No autorizado para verificar esta emergencia" });
    }
    
    let expiracionOcurrida = false;
    let mensajeExpiracion = '';

    // Verificar si la emergencia ha expirado (Solicitud inicial no atendida)
    if (emergencia.estado === 'Solicitada' && emergencia.expiraEn && new Date() > new Date(emergencia.expiraEn)) {
      emergencia.estado = 'Cancelada';
      emergencia.motivoCancelacion = 'Expirada antes de asignación';
      emergencia.expirada = true;
      await emergencia.save();
      expiracionOcurrida = true;
      mensajeExpiracion = 'La solicitud de emergencia ha expirado antes de ser asignada y fue cancelada automáticamente';
    }
    // Verificar si la emergencia ha expirado (Veterinario asignado no respondió a tiempo)
    else if (emergencia.estado === 'Asignada' && emergencia.expiraRespuestaVetEn && new Date() > new Date(emergencia.expiraRespuestaVetEn)) {
      emergencia.estado = 'Cancelada';
      emergencia.motivoCancelacion = 'Veterinario no respondió a tiempo';
      emergencia.expirada = true;
      await emergencia.save();
      expiracionOcurrida = true;
      mensajeExpiracion = 'El veterinario asignado no respondió a tiempo y la emergencia fue cancelada automáticamente';
      // Aquí podrías añadir lógica para notificar al cliente que la emergencia fue cancelada
      // y quizás reabrir la posibilidad de buscar otro veterinario si es aplicable.
    }

    if (expiracionOcurrida) {
      return res.status(200).json({
        message: mensajeExpiracion,
        emergencia
      });
    }
    
    // Calcular tiempo restante en segundos para la próxima expiración relevante
    let tiempoRestante = 0;
    let proximaExpiracion = null;

    if (emergencia.estado === 'Solicitada' && emergencia.expiraEn) {
      proximaExpiracion = new Date(emergencia.expiraEn);
    } else if (emergencia.estado === 'Asignada' && emergencia.expiraRespuestaVetEn) {
      proximaExpiracion = new Date(emergencia.expiraRespuestaVetEn);
    }

    if (proximaExpiracion) {
      tiempoRestante = Math.max(0, Math.floor((proximaExpiracion - new Date()) / 1000));
    }
    
    return res.status(200).json({
      message: 'Emergencia válida',
      tiempoRestante,
      emergencia
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al verificar expiración de la emergencia" });
  }
});

// Cancelar una emergencia
router.post("/:id/cancelar", protectRoute, async (req, res) => {
  try {
    const emergencia = await Emergencia.findById(req.params.id);
    
    if (!emergencia) {
      return res.status(404).json({ message: "Emergencia no encontrada" });
    }
    
    // Verificar que el usuario sea el propietario de la emergencia
    if (emergencia.usuario.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "No autorizado para cancelar esta emergencia" });
    }
    
    // Verificar que la emergencia esté en un estado que permita cancelación
    const estadosPermitidos = ["Solicitada", "Asignada"];
    if (!estadosPermitidos.includes(emergencia.estado)) {
      return res.status(400).json({ 
        message: `No se puede cancelar una emergencia en estado ${emergencia.estado}` 
      });
    }
    
    // Actualizar estado
    emergencia.estado = "Cancelada";
    emergencia.expirada = true;
    emergencia.expiraEn = new Date(); // Expira inmediatamente
    await emergencia.save();
    
    return res.status(200).json({ 
      message: "Emergencia cancelada exitosamente",
      emergencia
    });
  } catch (error) {
    console.log("Error al cancelar emergencia:", error);
    return res.status(500).json({ message: "Error al cancelar la emergencia" });
  }
});

// Actualizar estado de una emergencia
router.patch("/:id/estado", protectRoute, async (req, res) => {
  try {
    const { estado } = req.body;
    const estados = ["Solicitada", "Asignada", "En camino", "Atendida", "Cancelada"];
    
    if (!estado || !estados.includes(estado)) {
      return res.status(400).json({ message: "Estado de emergencia inválido" });
    }
    
    const emergencia = await Emergencia.findById(req.params.id);
    
    if (!emergencia) {
      return res.status(404).json({ message: "Emergencia no encontrada" });
    }
    
    // Verificar si el usuario actual es el propietario
    if (emergencia.usuario.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "No autorizado para modificar esta emergencia" });
    }
    
    // No permitir cambiar a "Asignada" o "En camino" desde el cliente
    if ((estado === "Asignada" || estado === "En camino") && 
        emergencia.estado !== "Asignada" && 
        emergencia.estado !== "En camino") {
      return res.status(400).json({ message: "No autorizado para asignar o poner en camino la emergencia" });
    }
    
    emergencia.estado = estado;
    
    // Actualizar fechas según el estado
    if (estado === "Asignada" && !emergencia.fechaAsignacion) {
      emergencia.fechaAsignacion = new Date();
    } else if (estado === "Atendida" && !emergencia.fechaAtencion) {
      emergencia.fechaAtencion = new Date();
      
      // Si se atiende la emergencia, agregar automáticamente al historial médico de la mascota
      const mascota = await Mascota.findById(emergencia.mascota);
      
      if (mascota) {
        mascota.historialMedico.push({
          fecha: emergencia.fechaAtencion,
          descripcion: `Emergencia: ${emergencia.tipoEmergencia} - ${emergencia.descripcion}`,
          veterinario: emergencia.veterinario,
          tipoVisita: "Emergencia"
        });
        
        mascota.ultimaVisita = emergencia.fechaAtencion;
        await mascota.save();
      }
    }
    
    await emergencia.save();
    
    const emergenciaActualizada = await Emergencia.findById(emergencia._id)
      .populate("mascota", "nombre tipo raza imagen")
      .populate("veterinario", "nombre especialidad imagen");
    
    res.status(200).json(emergenciaActualizada);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al actualizar el estado de la emergencia" });
  }
});

// Asignar veterinario a una emergencia (ruta para admin o sistema)
router.patch("/:id/asignar-veterinario", protectRoute, async (req, res) => {
  try {
    const { veterinarioId } = req.body;
    
    if (!veterinarioId) {
      return res.status(400).json({ message: "ID del veterinario es requerido" });
    }
    
    const emergencia = await Emergencia.findById(req.params.id);
    
    if (!emergencia) {
      return res.status(404).json({ message: "Emergencia no encontrada" });
    }
    
    // Verificar que el prestador (veterinario) exista
    const veterinario = await Prestador.findById(veterinarioId);
    if (!veterinario || veterinario.tipo !== "Veterinario") {
      return res.status(404).json({ message: "Prestador de tipo Veterinario no encontrado" });
    }
    
    // Solo se puede asignar a emergencias solicitadas
    if (emergencia.estado !== "Solicitada") {
      return res.status(400).json({ message: "Solo se puede asignar veterinario a emergencias solicitadas" });
    }
    
    emergencia.veterinario = veterinarioId;
    // El estado no se cambia aquí, se mantiene como 'Solicitada'
    // El cambio de estado a 'Asignada' o 'Confirmada' se hará en el paso de confirmación del usuario.
    emergencia.fechaAsignacion = new Date();
    
    await emergencia.save();
    
    const emergenciaActualizada = await Emergencia.findById(emergencia._id)
      .populate("mascota", "nombre tipo raza imagen")
      .populate("veterinario", "nombre especialidad imagen rating");
    
    res.status(200).json(emergenciaActualizada);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al asignar veterinario a la emergencia" });
  }
});

// Función auxiliar para calcular distancia entre dos puntos geográficos
function calcularDistancia(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const d = R * c; // Distancia en km
  return d;
}

// Obtener actualización de ubicación del veterinario asignado a una emergencia
router.get("/:id/ubicacion-veterinario", protectRoute, async (req, res) => {
  try {
    const emergencia = await Emergencia.findById(req.params.id);
    
    if (!emergencia) {
      return res.status(404).json({ message: "Emergencia no encontrada" });
    }
    
    // Verificar si el usuario actual es el propietario de la emergencia
    if (emergencia.usuario.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "No autorizado para ver esta información" });
    }
    
    // Verificar si hay un veterinario asignado
    if (!emergencia.veterinario) {
      return res.status(400).json({ message: "No hay veterinario asignado a esta emergencia" });
    }
    
    // Buscar el prestador (veterinario) para obtener su ubicación actual
    const veterinario = await Prestador.findById(emergencia.veterinario);
    
    if (!veterinario || !veterinario.ubicacionActual || !veterinario.ubicacionActual.coordenadas) {
      return res.status(404).json({ message: "No se encontró la ubicación del veterinario" });
    }
    
    // Coordenadas del cliente y veterinario
    const clienteLat = emergencia.ubicacion.coordenadas.lat;
    const clienteLng = emergencia.ubicacion.coordenadas.lng;
    
    // Verificar que las coordenadas del veterinario sean válidas
    let vetLat, vetLng;
    if (Array.isArray(veterinario.ubicacionActual.coordenadas) && 
        veterinario.ubicacionActual.coordenadas.length >= 2) {
      vetLng = veterinario.ubicacionActual.coordenadas[0]; // MongoDB GeoJSON: [longitud, latitud]
      vetLat = veterinario.ubicacionActual.coordenadas[1];
    } else {
      // Usar coordenadas cercanas simuladas si no hay datos válidos
      // Variación aleatoria pequeña para simular movimiento pero preservar privacidad
      const variacion = 0.001 * (Math.random() - 0.5);
      vetLat = clienteLat + variacion;
      vetLng = clienteLng + variacion;
    }
    
    // Asegurarse de que las coordenadas son números válidos
    if (isNaN(clienteLat) || isNaN(clienteLng) || isNaN(vetLat) || isNaN(vetLng)) {
      return res.status(400).json({ message: "Coordenadas inválidas" });
    }
    
    // Calcular distancia real (usando la fórmula haversine)
    const distanciaReal = calcularDistancia(clienteLat, clienteLng, vetLat, vetLng);
    
    // Aplicar radio de privacidad (mínimo 1km)
    const distanciaAjustada = Math.max(1.0, distanciaReal);
    
    // Calcular tiempo estimado (asumiendo 30km/h en entorno urbano)
    const tiempoEstimadoMin = Math.ceil(distanciaAjustada * 2); // 2 min por km
    
    res.status(200).json({
      distancia: {
        valor: distanciaAjustada,
        texto: `${distanciaAjustada.toFixed(1)} km`
      },
      tiempoEstimado: {
        valor: tiempoEstimadoMin,
        texto: `${tiempoEstimadoMin} min`
      },
      ultimaActualizacion: veterinario.ubicacionActual.ultimaActualizacion || new Date()
    });
    
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al obtener la ubicación del veterinario" });
  }
});

// Agregar imagen a una emergencia
router.post("/:id/imagen", protectRoute, async (req, res) => {
  try {
    const { imagen } = req.body;
    
    if (!imagen) {
      return res.status(400).json({ message: "La imagen es requerida" });
    }
    
    const emergencia = await Emergencia.findById(req.params.id);
    
    if (!emergencia) {
      return res.status(404).json({ message: "Emergencia no encontrada" });
    }
    
    // Verificar si el usuario actual es el propietario
    if (emergencia.usuario.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "No autorizado para modificar esta emergencia" });
    }
    
    // Subir imagen a Cloudinary
    const uploadResponse = await cloudinary.uploader.upload(imagen, {
      folder: "emergencias"
    });
    
    // Agregar URL de la imagen a la emergencia
    emergencia.imagenes.push(uploadResponse.secure_url);
    await emergencia.save();
    
    res.status(200).json(emergencia);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al agregar imagen a la emergencia" });
  }
});

// Obtener emergencias activas cercanas a una ubicación (para veterinarios)
router.post("/cercanas", protectRoute, async (req, res) => {
  try {
    const { lat, lng, radio } = req.body;
    
    if (!lat || !lng) {
      return res.status(400).json({ message: "La ubicación es requerida" });
    }
    
    // En una implementación real, aquí usarías geolocalización para encontrar emergencias cercanas
    // Este es un ejemplo simplificado para demostración
    const emergencias = await Emergencia.find({
      estado: "Solicitada",
      "ubicacion.coordenadas": {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [lng, lat]
          },
          $maxDistance: radio || 5000 // 5km por defecto
        }
      }
    })
      .populate("mascota", "nombre tipo raza imagen")
      .sort({ fechaSolicitud: -1 });
    
    res.status(200).json(emergencias);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al obtener emergencias cercanas" });
  }
});

// Obtener emergencias cercanas disponibles para el veterinario (endpoint especial para la app de veterinarios)
router.get("/cercanas/disponibles", protectRoute, async (req, res) => {
  try {
    // Verificar que el usuario sea un prestador de tipo veterinario
    const prestador = await Prestador.findOne({ usuario: req.user._id });
    
    if (!prestador || prestador.tipo !== "Veterinario") {
      return res.status(403).json({ message: "Solo los veterinarios pueden acceder a emergencias cercanas" });
    }
    
    // Obtener ubicación del veterinario
    if (!prestador.ubicacion || !prestador.ubicacion.coordenadas) {
      return res.status(400).json({ message: "El veterinario no tiene ubicación registrada" });
    }
    
    const lat = prestador.ubicacion.coordenadas.lat;
    const lng = prestador.ubicacion.coordenadas.lng;
    
    // Buscar emergencias solicitadas cercanas a la ubicación del veterinario
    const emergencias = await Emergencia.find({
      estado: "Solicitada",
      "ubicacion.coordenadas": {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [lng, lat]
          },
          $maxDistance: 10000 // 10km por defecto
        }
      }
    })
      .populate("mascota", "nombre tipo raza imagen")
      .populate("usuario", "nombre telefono")
      .sort({ fechaSolicitud: -1 })
      .limit(10); // Limitar a 10 emergencias para no sobrecargar
    
    // Añadir información de distancia para cada emergencia
    const emergenciasConDistancia = emergencias.map(emergencia => {
      const emergenciaObj = emergencia.toObject();
      const distancia = calcularDistancia(
        lat,
        lng,
        emergencia.ubicacion.coordenadas.lat,
        emergencia.ubicacion.coordenadas.lng
      );
      
      // Aplicar radio de privacidad de 1km
      const distanciaAjustada = Math.max(distancia, 1.0);
      
      // Calcular tiempo estimado basado en velocidad promedio de 30km/h
      const tiempoEstimado = Math.ceil(distanciaAjustada / 30 * 60); // en minutos
      
      return {
        ...emergenciaObj,
        distancia: distanciaAjustada,
        tiempoEstimado: tiempoEstimado
      };
    });
    
    console.log(`Encontradas ${emergenciasConDistancia.length} emergencias cercanas disponibles para el veterinario ${prestador._id}`);
    res.status(200).json(emergenciasConDistancia);
  } catch (error) {
    console.log("Error al obtener emergencias cercanas disponibles:", error);
    res.status(500).json({ message: "Error al obtener emergencias cercanas disponibles" });
  }
});

// Aceptar una emergencia (ruta para veterinarios)
router.post("/:id/aceptar", protectRoute, async (req, res) => {
  try {
    // Validación de ID
    if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.log(`ID de emergencia inválido: ${req.params.id}`);
      return res.status(400).json({ message: "ID de emergencia inválido" });
    }
    
    // Buscar emergencia
    const emergencia = await Emergencia.findById(req.params.id);
    
    if (!emergencia) {
      console.log(`Emergencia no encontrada con ID: ${req.params.id}`);
      return res.status(404).json({ message: "Emergencia no encontrada" });
    }
    
    // Verificar que el prestador (veterinario) exista
    const prestador = await Prestador.findOne({ usuario: req.user._id });
    if (!prestador || prestador.tipo !== "Veterinario") {
      return res.status(403).json({ message: "Solo los veterinarios pueden aceptar emergencias" });
    }
    
    // Verificar que el veterinario que acepta sea el asignado a la emergencia
    if (emergencia.veterinario && emergencia.veterinario.toString() !== prestador._id.toString()) {
      return res.status(403).json({ message: "No autorizado: solo el veterinario asignado puede actualizar esta emergencia" });
    }
    
    // Cambiar estado a "En camino"
    emergencia.estado = "En camino";
    emergencia.fechaEnCamino = new Date();
    
    await emergencia.save();
    
    const emergenciaActualizada = await Emergencia.findById(emergencia._id)
      .populate("mascota", "nombre tipo raza imagen edad genero color")
      .populate("usuario", "nombre email telefono")
      .populate("veterinario", "nombre especialidad imagen rating");
    
    console.log(`Emergencia ${emergencia._id} aceptada por el veterinario ${prestador._id} y puesta en camino`);
    res.status(200).json(emergenciaActualizada);
  } catch (error) {
    console.error(`Error al aceptar emergencia: ${error.message}`, error);
    res.status(500).json({ message: "Error al aceptar la emergencia" });
  }
});

// Rechazar una emergencia (ruta para veterinarios)
router.post("/:id/rechazar", protectRoute, async (req, res) => {
  try {
    // Validación de ID
    if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.log(`ID de emergencia inválido: ${req.params.id}`);
      return res.status(400).json({ message: "ID de emergencia inválido" });
    }
    
    // Buscar emergencia
    const emergencia = await Emergencia.findById(req.params.id);
    
    if (!emergencia) {
      console.log(`Emergencia no encontrada con ID: ${req.params.id}`);
      return res.status(404).json({ message: "Emergencia no encontrada" });
    }
    
    // Verificar que el prestador (veterinario) exista
    const prestador = await Prestador.findOne({ usuario: req.user._id });
    if (!prestador || prestador.tipo !== "Veterinario") {
      return res.status(403).json({ message: "Solo los veterinarios pueden rechazar emergencias" });
    }
    
    // Verificar que el veterinario que rechaza sea el asignado a la emergencia
    if (emergencia.veterinario && emergencia.veterinario.toString() !== prestador._id.toString()) {
      return res.status(403).json({ message: "No autorizado: solo el veterinario asignado puede actualizar esta emergencia" });
    }
    
    // Cambiar estado a "Cancelada"
    emergencia.estado = "Cancelada";
    emergencia.fechaCancelacion = new Date();
    emergencia.motivoCancelacion = "Rechazada por el veterinario";
    
    await emergencia.save();
    
    const emergenciaActualizada = await Emergencia.findById(emergencia._id)
      .populate("mascota", "nombre tipo raza imagen")
      .populate("usuario", "nombre email telefono")
      .populate("veterinario", "nombre especialidad imagen rating");
    
    console.log(`Emergencia ${emergencia._id} rechazada por el veterinario ${prestador._id} y marcada como cancelada`);
    res.status(200).json(emergenciaActualizada);
  } catch (error) {
    console.error(`Error al rechazar emergencia: ${error.message}`, error);
    res.status(500).json({ message: "Error al rechazar la emergencia" });
  }
});

// Confirmar servicio de emergencia
router.patch("/:id/confirmar", protectRoute, async (req, res) => {
  try {
    const { metodoPago } = req.body;
    console.log(`Recibida solicitud para confirmar emergencia ${req.params.id} con método de pago: ${metodoPago}`);
    
    // Validación de ID
    if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.log(`ID de emergencia inválido: ${req.params.id}`);
      return res.status(400).json({ message: "ID de emergencia inválido" });
    }
    
    // Buscar emergencia
    const emergencia = await Emergencia.findById(req.params.id);
    
    if (!emergencia) {
      console.log(`Emergencia no encontrada con ID: ${req.params.id}`);
      return res.status(404).json({ message: "Emergencia no encontrada" });
    }
    
    console.log(`Emergencia encontrada: ${emergencia._id}, estado actual: ${emergencia.estado}`);
    
    // Verificar si el usuario actual es el propietario
    if (emergencia.usuario && emergencia.usuario.toString() !== req.user._id.toString()) {
      console.log(`Usuario no autorizado: ${req.user._id} vs propietario: ${emergencia.usuario}`);
      return res.status(401).json({ message: "No autorizado para confirmar esta emergencia" });
    }
    
    // Verificar que la emergencia tenga un veterinario asignado
    if (!emergencia.veterinario) {
      console.log(`Emergencia sin veterinario asignado: ${emergencia._id}`);
      return res.status(400).json({ message: "No se puede confirmar una emergencia sin veterinario asignado" });
    }
    
    // Verificar estado válido para confirmar
    const estadosValidos = ["Solicitada", "Asignada"];
    if (!estadosValidos.includes(emergencia.estado)) {
      console.log(`Estado no válido para confirmar: ${emergencia.estado}`);
      return res.status(400).json({ 
        message: `No se puede confirmar una emergencia en estado ${emergencia.estado}. Debe estar en estado Solicitada o Asignada` 
      });
    }
    
    // Actualizar estado y método de pago
    // Cuando el cliente confirma, la emergencia pasa a 'Asignada',
    // esperando la aceptación/confirmación del veterinario desde su app.
    emergencia.estado = "Asignada";
    
    if (metodoPago) {
      emergencia.metodoPago = metodoPago;
    } else {
      emergencia.metodoPago = "Efectivo"; // Valor por defecto
    }
    
    // Registrar fecha de confirmación
    emergencia.fechaConfirmacion = new Date();
    
    console.log(`Guardando emergencia con estado: ${emergencia.estado} y método de pago: ${emergencia.metodoPago}`);
    await emergencia.save();
    
    // Devolver los datos actualizados de la emergencia
    const emergenciaActualizada = await Emergencia.findById(emergencia._id)
      .populate("mascota", "nombre tipo raza imagen")
      .populate("veterinario", "nombre especialidad email telefono imagen rating");
    
    console.log(`Emergencia confirmada exitosamente: ${emergencia._id}`);
    return res.status(200).json(emergenciaActualizada);
  } catch (error) {
    console.error(`Error al confirmar emergencia: ${error.message}`, error);
    return res.status(500).json({ message: "Error al confirmar la emergencia", error: error.message });
  }
});

export default router;
