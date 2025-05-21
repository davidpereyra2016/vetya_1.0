import mongoose from "mongoose";

/**
 * Esquema para los veterinarios
 * Este modelo almacena toda la información relacionada con los veterinarios registrados
 * Incluye datos personales, profesionales, especialidades y estadísticas
 */
const veterinarioSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  especialidad: {
    type: String,
    required: true,
    trim: true
  },
  especialidades: [{
    type: String,
    trim: true
  }],
  experiencia: {
    type: String,
    required: true
  },
  imagen: {
    type: String,
    default: ""
  },
  educacion: {
    type: String,
    required: true
  },
  matricula: {
    type: String,
    required: true,
    unique: true
  },
  idiomas: [{
    type: String
  }],
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: 5
  },
  reviews: {
    type: Number,
    default: 0
  },
  pacientes: {
    type: Number,
    default: 0
  },
  disponible: {
    type: Boolean,
    default: true
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
        type: Number
      },
      lng: {
        type: Number
      }
    }
  },
  horarios: [{
    dia: {
      type: String,
      enum: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
    },
    horaInicio: String,
    horaFin: String,
    disponible: {
      type: Boolean,
      default: true
    }
  }],
  servicios: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Servicio'
  }],
  telefono: {
    type: String
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  descripcion: {
    type: String
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

const Veterinario = mongoose.model("Veterinario", veterinarioSchema);
export default Veterinario;
