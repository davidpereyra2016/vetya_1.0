import express from "express";
import Emergencia from "../models/Emergencia.js";
import Mascota from "../models/Mascota.js";
import Veterinario from "../models/Veterinario.js";
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
    const estadosActivos = ["Solicitada", "Asignada", "En camino"];
    
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

// Obtener una emergencia por ID
router.get("/:id", protectRoute, async (req, res) => {
  try {
    const emergencia = await Emergencia.findById(req.params.id)
      .populate("mascota", "nombre tipo raza imagen edad genero color")
      .populate("veterinario", "nombre especialidad imagen rating experiencia ubicacion telefono email");
    
    if (!emergencia) {
      return res.status(404).json({ message: "Emergencia no encontrada" });
    }
    
    // Verificar si el usuario actual es el propietario
    if (emergencia.usuario.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "No autorizado para ver esta emergencia" });
    }
    
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
    
    // Verificar que el veterinario exista
    const veterinario = await Veterinario.findById(veterinarioId);
    if (!veterinario) {
      return res.status(404).json({ message: "Veterinario no encontrado" });
    }
    
    // Solo se puede asignar a emergencias solicitadas
    if (emergencia.estado !== "Solicitada") {
      return res.status(400).json({ message: "Solo se puede asignar veterinario a emergencias solicitadas" });
    }
    
    emergencia.veterinario = veterinarioId;
    emergencia.estado = "Asignada";
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

export default router;
