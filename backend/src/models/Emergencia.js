import mongoose from "mongoose";

/**
 * Esquema para emergencias veterinarias
 * Este modelo almacena información relacionada con solicitudes de atención de emergencia
 * Incluye tipo de emergencia, estado, ubicación y referencias al usuario, mascota y veterinario
 */
const emergenciaSchema = new mongoose.Schema({
  // Campo para controlar expiración automática
  expiraEn: {
    type: Date,
    default: function() {
      // Por defecto, expira 5 minutos después de la creación
      return new Date(Date.now() + 5 * 60 * 1000);
    }
  },
  expirada: {
    type: Boolean,
    default: false
  },
  expiraRespuestaVetEn: {
    type: Date
  },
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
    ref: 'Prestador'
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
    enum: ['Solicitada', 'Asignada', 'Confirmada', 'En camino', 'Atendida', 'Cancelada'],
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

// Middleware pre-save para manejar estados
emergenciaSchema.pre('save', function(next) {
  const ahora = new Date();

  // Manejo de fechas y expiraciones según el estado
  if (this.isNew && this.estado === 'Solicitada') {
    if (!this.fechaSolicitud) this.fechaSolicitud = ahora;
    // Establecer la hora de expiración de la solicitud inicial en 5 minutos por defecto
    if (this.expiraEn === undefined) { // Solo si no se proveyó explícitamente
        this.expiraEn = new Date(ahora.getTime() + 5 * 60 * 1000);
    }
  } else if (this.isModified('estado') || this.isModified('veterinario')) {
    if (this.estado === 'Asignada' && this.veterinario) {
      if (!this.fechaAsignacion) this.fechaAsignacion = ahora;
      // Establecer tiempo límite para respuesta del veterinario (5 minutos desde asignación)
      this.expiraRespuestaVetEn = new Date(this.fechaAsignacion.getTime() + 5 * 60 * 1000);
      this.expiraEn = undefined; // La expiración de la solicitud inicial ya no aplica
      this.expirada = false;
    } else if (['Confirmada', 'En camino', 'Atendida'].includes(this.estado)) {
      this.expiraEn = undefined;
      this.expiraRespuestaVetEn = undefined;
      this.expirada = false;
      if (this.estado === 'Atendida' && !this.fechaAtencion) {
        this.fechaAtencion = ahora;
      }
    }
  }

  // Si la emergencia se cancela, marcarla como expirada
  if (this.estado === 'Cancelada') {
    this.expirada = true;
    // Opcional: limpiar fechas de expiración si se cancela
    // this.expiraEn = undefined;
    // this.expiraRespuestaVetEn = undefined;
  }
  
  next();
});

// Índice para expiración
emergenciaSchema.index({ expiraEn: 1 }, { expireAfterSeconds: 0 });

const Emergencia = mongoose.model("Emergencia", emergenciaSchema);
export default Emergencia;
