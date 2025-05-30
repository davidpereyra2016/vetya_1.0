import express from "express";
import Notificacion from "../models/Notificacion.js";
import protectRoute from "../middleware/auth.middleware.js";
import Prestador from "../models/Prestador.js";
import admin from "../config/firebase.js"; // Para notificaciones push

const router = express.Router();

// Obtener todas las notificaciones del usuario autenticado
router.get("/", protectRoute, async (req, res) => {
  try {
    const { leidas } = req.query;
    
    // Verificar si el usuario es un prestador (veterinario)
    let esPrestador = false;
    let prestadorId = null;
    
    try {
      const prestador = await Prestador.findOne({ usuario: req.user._id });
      if (prestador) {
        esPrestador = true;
        prestadorId = prestador._id;
      }
    } catch (err) {
      console.log('Error al verificar si es prestador:', err);
    }
    
    // Definir filtro según si es usuario normal o prestador
    let filtro;
    if (esPrestador) {
      filtro = { prestador: prestadorId };
    } else {
      filtro = { usuario: req.user._id };
    }
    
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
    
    // Verificar si el usuario es un prestador
    let esPrestador = false;
    let prestadorId = null;
    
    try {
      const prestador = await Prestador.findOne({ usuario: req.user._id });
      if (prestador) {
        esPrestador = true;
        prestadorId = prestador._id;
      }
    } catch (err) {
      console.log('Error al verificar si es prestador:', err);
    }
    
    // Verificar si el usuario actual es el destinatario (sea usuario o prestador)
    const esDestinatarioValido = esPrestador 
      ? notificacion.prestador && notificacion.prestador.toString() === prestadorId.toString()
      : notificacion.usuario && notificacion.usuario.toString() === req.user._id.toString();
    
    if (!esDestinatarioValido) {
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
    // Verificar si el usuario es un prestador
    let esPrestador = false;
    let prestadorId = null;
    
    try {
      const prestador = await Prestador.findOne({ usuario: req.user._id });
      if (prestador) {
        esPrestador = true;
        prestadorId = prestador._id;
      }
    } catch (err) {
      console.log('Error al verificar si es prestador:', err);
    }
    
    // Definir filtro según si es usuario normal o prestador
    let filtro;
    if (esPrestador) {
      filtro = { prestador: prestadorId, leida: false };
    } else {
      filtro = { usuario: req.user._id, leida: false };
    }
    
    await Notificacion.updateMany(
      filtro,
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
    const { usuario, prestador, titulo, mensaje, tipo, icono, color, prioridad, enlace, enviarPush } = req.body;
    
    // Validar campos obligatorios - al menos uno de usuario o prestador debe estar presente
    if ((!usuario && !prestador) || !titulo || !mensaje) {
      return res.status(400).json({ message: "Usuario o prestador, título y mensaje son obligatorios" });
    }
    
    // Crear nueva notificación
    const nuevaNotificacion = new Notificacion({
      usuario,
      prestador,
      titulo,
      mensaje,
      tipo: tipo || "Sistema",
      icono: icono || "notifications-outline",
      color: color || "#1E88E5",
      prioridad: prioridad || "Media",
      enlace: enlace || { tipo: null, id: null, url: null }
    });
    
    await nuevaNotificacion.save();
    
    // Enviar notificación push si se solicita
    if (enviarPush && admin) {
      try {
        let destinatarioInfo;
        
        if (prestador) {
          // Buscar información del prestador para obtener su token de dispositivo
          const prestadorData = await Prestador.findById(prestador)
            .populate('usuario', 'deviceToken');
          
          if (prestadorData && prestadorData.usuario && prestadorData.usuario.deviceToken) {
            destinatarioInfo = {
              token: prestadorData.usuario.deviceToken,
              nombre: prestadorData.nombre
            };
          }
        } else if (usuario) {
          // Buscar información del usuario para obtener su token de dispositivo
          const userData = await User.findById(usuario);
          
          if (userData && userData.deviceToken) {
            destinatarioInfo = {
              token: userData.deviceToken,
              nombre: userData.username
            };
          }
        }
        
        if (destinatarioInfo && destinatarioInfo.token) {
          const message = {
            notification: {
              title: titulo,
              body: mensaje
            },
            data: {
              tipo: tipo || "Sistema",
              notificacionId: nuevaNotificacion._id.toString(),
              enlaceTipo: enlace?.tipo || "",
              enlaceId: enlace?.id || "",
              enlaceUrl: enlace?.url || ""
            },
            token: destinatarioInfo.token
          };
          
          const result = await admin.messaging().send(message);
          console.log(`Notificación push enviada a ${destinatarioInfo.nombre}:`, result);
        }
      } catch (pushError) {
        console.error('Error al enviar notificación push:', pushError);
        // No interrumpimos el flujo si falla la notificación push
      }
    }
    
    res.status(201).json(nuevaNotificacion);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al crear la notificación" });
  }
});

// Obtener conteo de notificaciones no leídas
router.get("/conteo", protectRoute, async (req, res) => {
  try {
    // Verificar si el usuario es un prestador (veterinario)
    let esPrestador = false;
    let prestadorId = null;
    
    try {
      const prestador = await Prestador.findOne({ usuario: req.user._id });
      if (prestador) {
        esPrestador = true;
        prestadorId = prestador._id;
      }
    } catch (err) {
      console.log('Error al verificar si es prestador:', err);
    }
    
    // Definir filtro según si es usuario normal o prestador
    let filtro;
    if (esPrestador) {
      filtro = { prestador: prestadorId, leida: false };
    } else {
      filtro = { usuario: req.user._id, leida: false };
    }
    
    const conteo = await Notificacion.countDocuments(filtro);
    
    res.status(200).json({ conteo });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al obtener el conteo de notificaciones" });
  }
});

// Ruta especial para notificar a un prestador sobre una emergencia asignada
router.post("/emergencia-asignada", protectRoute, async (req, res) => {
  try {
    const { emergenciaId, prestadorId, clienteNombre, mascotaNombre, tipoEmergencia } = req.body;
    
    // Validar campos obligatorios
    if (!emergenciaId || !prestadorId || !tipoEmergencia) {
      return res.status(400).json({ message: "Datos de emergencia incompletos" });
    }
    
    // Buscar información del prestador para la notificación
    const prestador = await Prestador.findById(prestadorId)
      .populate('usuario', 'deviceToken');
    
    if (!prestador) {
      return res.status(404).json({ message: "Prestador no encontrado" });
    }
    
    // Crear mensaje personalizado
    const mensaje = `${clienteNombre || 'Un cliente'} necesita atención urgente para ${mascotaNombre || 'su mascota'} por ${tipoEmergencia}. Por favor responde lo antes posible.`;
    
    // Crear nueva notificación en la base de datos
    const nuevaNotificacion = new Notificacion({
      prestador: prestadorId,
      titulo: "¡Emergencia Asignada!",
      mensaje: mensaje,
      tipo: "Emergencia",
      icono: "alert-circle",
      color: "#F44336",
      prioridad: "Alta",
      enlace: { 
        tipo: "Emergencia", 
        id: emergenciaId,
        url: "/emergencias/asignadas" 
      }
    });
    
    await nuevaNotificacion.save();
    
    // Enviar notificación push si el prestador tiene token de dispositivo
    if (admin && prestador.usuario && prestador.usuario.deviceToken) {
      try {
        const message = {
          notification: {
            title: "¡Emergencia Veterinaria Asignada!",
            body: mensaje
          },
          data: {
            tipo: "Emergencia",
            notificacionId: nuevaNotificacion._id.toString(),
            emergenciaId: emergenciaId,
            enlaceTipo: "Emergencia",
            enlaceId: emergenciaId,
            enlaceUrl: "/emergencias/asignadas",
            sonido: "emergency_sound.wav",  // Sonido especial de emergencia
            prioridad: "alta"
          },
          android: {
            priority: "high",
            notification: {
              sound: "emergency_sound",
              priority: "max",
              channelId: "emergency_channel"
            }
          },
          apns: {
            payload: {
              aps: {
                sound: "emergency_sound.wav",
                category: "EMERGENCY"
              }
            }
          },
          token: prestador.usuario.deviceToken
        };
        
        const result = await admin.messaging().send(message);
        console.log(`Notificación de emergencia enviada a ${prestador.nombre}:`, result);
      } catch (pushError) {
        console.error('Error al enviar notificación push de emergencia:', pushError);
      }
    } else {
      console.log('No se pudo enviar notificación push: token de dispositivo no disponible');
    }
    
    res.status(201).json({
      message: "Notificación de emergencia enviada",
      notificacion: nuevaNotificacion
    });
  } catch (error) {
    console.log('Error al enviar notificación de emergencia:', error);
    res.status(500).json({ message: "Error al enviar notificación de emergencia" });
  }
});

export default router;
