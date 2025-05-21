import mongoose from "mongoose";
const { Schema } = mongoose;

/**
 * Esquema para gestionar la disponibilidad de los prestadores
 * Este modelo permite definir horarios específicos disponibles para cada servicio
 * y mantener un registro de las horas ya reservadas.
 */
const disponibilidadSchema = new Schema({
  prestador: {
    type: Schema.Types.ObjectId,
    ref: 'Prestador',
    required: true
  },
  servicio: {
    type: Schema.Types.ObjectId,
    ref: 'Servicio',
    required: true
  },
  // Horarios específicos para este servicio (si difieren del horario general del prestador)
  horarioEspecifico: {
    activo: {
      type: Boolean,
      default: false // Por defecto, usa el horario general del prestador
    },
    horarios: [{
      dia: {
        type: Number, // 0 = Domingo, 1 = Lunes, ... 6 = Sábado
        required: true
      },
      apertura: {
        type: String, // Formato: "HH:MM"
        required: true
      },
      cierre: {
        type: String, // Formato: "HH:MM"
        required: true
      },
      intervalo: {
        type: Number, // Intervalo en minutos entre citas
        default: 30
      },
      descanso: {
        inicio: String, // Formato: "HH:MM"
        fin: String // Formato: "HH:MM"
      }
    }]
  },
  // Fechas específicas con disponibilidad personalizada
  fechasEspeciales: [{
    fecha: {
      type: Date,
      required: true
    },
    disponible: {
      type: Boolean,
      default: true
    },
    horarios: [{
      inicio: String, // Formato: "HH:MM"
      fin: String // Formato: "HH:MM"
    }]
  }],
  // Fechas y horas ya reservadas (no disponibles)
  reservas: [{
    fecha: {
      type: Date,
      required: true
    },
    horaInicio: {
      type: String, // Formato: "HH:MM"
      required: true
    },
    horaFin: {
      type: String, // Formato: "HH:MM"
      required: true
    },
    cita: {
      type: Schema.Types.ObjectId,
      ref: 'Cita'
    }
  }]
}, {
  timestamps: true
});

// Índices para mejorar el rendimiento de las consultas
disponibilidadSchema.index({ prestador: 1, servicio: 1 });
disponibilidadSchema.index({ 'reservas.fecha': 1 });

const Disponibilidad = mongoose.model('Disponibilidad', disponibilidadSchema);

export default Disponibilidad;
