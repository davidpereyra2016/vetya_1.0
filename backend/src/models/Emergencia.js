import mongoose from "mongoose";

/**
 * Esquema para emergencias veterinarias
 * Este modelo almacena información relacionada con solicitudes de atención de emergencia
 * Incluye tipo de emergencia, estado, ubicación y referencias al usuario, mascota y veterinario
 */
const emergenciaSchema = new mongoose.Schema({
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  mascota: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mascota',
    required: true
  },
  veterinario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Veterinario'
    // No es requerido inicialmente ya que puede asignarse después
  },
  descripcion: {
    type: String,
    required: true
  },
  tipoEmergencia: {
    type: String,
    required: true,
    enum: ['Accidente', 'Envenenamiento', 'Dificultad respiratoria', 'Herida grave', 'Convulsiones', 'Otro']
  },
  nivelUrgencia: {
    type: String,
    enum: ['Alta', 'Media', 'Baja'],
    default: 'Media'
  },
  estado: {
    type: String,
    enum: ['Solicitada', 'Asignada', 'En camino', 'Atendida', 'Cancelada'],
    default: 'Solicitada'
  },
  ubicacion: {
    direccion: {
      type: String,
      required: true
    },
    ciudad: {
      type: String,
      required: true
    },
    coordenadas: {
      lat: {
        type: Number,
        required: true
      },
      lng: {
        type: Number,
        required: true
      }
    }
  },
  fechaSolicitud: {
    type: Date,
    default: Date.now
  },
  fechaAsignacion: {
    type: Date
  },
  fechaAtencion: {
    type: Date
  },
  notas: {
    type: String
  },
  imagenes: [{
    type: String
  }],
  notificacionesEnviadas: {
    solicitada: {
      type: Boolean,
      default: false
    },
    asignada: {
      type: Boolean,
      default: false
    },
    enCamino: {
      type: Boolean,
      default: false
    },
    atendida: {
      type: Boolean,
      default: false
    }
  },
  costoTotal: {
    type: Number
  },
  metodoPago: {
    type: String,
    enum: ['Efectivo', 'Tarjeta', 'Transferencia', 'Por definir'],
    default: 'Por definir'
  },
  pagado: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Índice para búsqueda de emergencias por estado y fecha
emergenciaSchema.index({ estado: 1, fechaSolicitud: -1 });

// Índice para búsqueda de emergencias por usuario
emergenciaSchema.index({ usuario: 1 });

// Índice para búsqueda de emergencias por veterinario
emergenciaSchema.index({ veterinario: 1 });

const Emergencia = mongoose.model("Emergencia", emergenciaSchema);
export default Emergencia;
