import express from "express";
import Notificacion from "../models/Notificacion.js";
import protectRoute from "../middleware/auth.middleware.js";

const router = express.Router();

// Obtener todas las notificaciones del usuario autenticado
router.get("/", protectRoute, async (req, res) => {
  try {
    const { leidas } = req.query;
    const filtro = { usuario: req.user._id };
    
    if (leidas !== undefined) {
      filtro.leida = leidas === 'true';
    }
    
    const notificaciones = await Notificacion.find(filtro)
      .sort({ fechaEnvio: -1 });
    
    res.status(200).json(notificaciones);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al obtener las notificaciones" });
  }
});

// Marcar una notificación como leída
router.patch("/:id/leer", protectRoute, async (req, res) => {
  try {
    const notificacion = await Notificacion.findById(req.params.id);
    
    if (!notificacion) {
      return res.status(404).json({ message: "Notificación no encontrada" });
    }
    
    // Verificar si el usuario actual es el destinatario
    if (notificacion.usuario.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "No autorizado para modificar esta notificación" });
    }
    
    if (!notificacion.leida) {
      notificacion.leida = true;
      notificacion.fechaLectura = new Date();
      await notificacion.save();
    }
    
    res.status(200).json(notificacion);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al marcar la notificación como leída" });
  }
});

// Marcar todas las notificaciones como leídas
router.patch("/leer-todas", protectRoute, async (req, res) => {
  try {
    await Notificacion.updateMany(
      { usuario: req.user._id, leida: false },
      { 
        $set: { 
          leida: true,
          fechaLectura: new Date()
        } 
      }
    );
    
    res.status(200).json({ message: "Todas las notificaciones marcadas como leídas" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al marcar las notificaciones" });
  }
});

// Eliminar una notificación
router.delete("/:id", protectRoute, async (req, res) => {
  try {
    const notificacion = await Notificacion.findById(req.params.id);
    
    if (!notificacion) {
      return res.status(404).json({ message: "Notificación no encontrada" });
    }
    
    // Verificar si el usuario actual es el destinatario
    if (notificacion.usuario.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "No autorizado para eliminar esta notificación" });
    }
    
    await Notificacion.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Notificación eliminada con éxito" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al eliminar la notificación" });
  }
});

// Crear una nueva notificación (solo para uso interno/admin)
router.post("/", protectRoute, async (req, res) => {
  try {
    const { usuario, titulo, mensaje, tipo, icono, color, prioridad, enlace } = req.body;
    
    // Validar campos obligatorios
    if (!usuario || !titulo || !mensaje) {
      return res.status(400).json({ message: "Usuario, título y mensaje son obligatorios" });
    }
    
    // Crear nueva notificación
    const nuevaNotificacion = new Notificacion({
      usuario,
      titulo,
      mensaje,
      tipo: tipo || "Sistema",
      icono: icono || "notifications-outline",
      color: color || "#1E88E5",
      prioridad: prioridad || "Media",
      enlace: enlace || { tipo: null, id: null, url: null }
    });
    
    await nuevaNotificacion.save();
    res.status(201).json(nuevaNotificacion);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al crear la notificación" });
  }
});

// Obtener conteo de notificaciones no leídas
router.get("/conteo", protectRoute, async (req, res) => {
  try {
    const conteo = await Notificacion.countDocuments({
      usuario: req.user._id,
      leida: false
    });
    
    res.status(200).json({ conteo });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al obtener el conteo de notificaciones" });
  }
});

export default router;
