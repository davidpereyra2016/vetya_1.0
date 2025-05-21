import mongoose from "mongoose";

/**
 * Esquema para las notificaciones del sistema
 * Este modelo almacena las notificaciones que se envían a los usuarios
 * Permite realizar seguimiento de notificaciones leídas/no leídas y categorizarlas
 */
const notificacionSchema = new mongoose.Schema({
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  titulo: {
    type: String,
    required: true
  },
  mensaje: {
    type: String,
    required: true
  },
  tipo: {
    type: String,
    enum: ['Cita', 'Emergencia', 'Recordatorio', 'Sistema', 'Promocion'],
    default: 'Sistema'
  },
  icono: {
    type: String,
    default: 'notifications-outline'
  },
  color: {
    type: String,
    default: '#1E88E5'
  },
  leida: {
    type: Boolean,
    default: false
  },
  fechaEnvio: {
    type: Date,
    default: Date.now
  },
  fechaLectura: {
    type: Date
  },
  enlace: {
    tipo: {
      type: String,
      enum: ['Cita', 'Emergencia', 'Mascota', 'Veterinario', 'Consejo', 'Externo'],
      default: null
    },
    id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    url: {
      type: String,
      default: null
    }
  },
  activa: {
    type: Boolean,
    default: true
  },
  prioridad: {
    type: String,
    enum: ['Alta', 'Media', 'Baja'],
    default: 'Media'
  }
}, {
  timestamps: true
});

// Índice para buscar notificaciones no leídas de un usuario
notificacionSchema.index({ usuario: 1, leida: 1 });

// Índice para ordenar por fecha
notificacionSchema.index({ fechaEnvio: -1 });

const Notificacion = mongoose.model("Notificacion", notificacionSchema);
export default Notificacion;
