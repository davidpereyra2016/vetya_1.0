import mongoose from "mongoose";

/**
 * Esquema para las mascotas
 * Este modelo almacena toda la información relacionada con las mascotas registradas
 * Incluye datos básicos, características físicas, información médica y referencias al propietario
 */
const mascotaSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  tipo: {
    type: String,
    required: true,
    enum: ['Perro', 'Gato', 'Ave', 'Reptil', 'Roedor', 'Otro']
  },
  raza: {
    type: String,
    required: true
  },
  edad: {
    type: String,
    required: true
  },
  genero: {
    type: String,
    enum: ['Macho', 'Hembra'],
    required: true
  },
  color: {
    type: String
  },
  peso: {
    type: String
  },
  vacunado: {
    type: Boolean,
    default: false
  },
  necesidadesEspeciales: {
    type: String,
    default: ""
  },
  imagen: {
    type: String,
    default: ""
  },
  fechaNacimiento: {
    type: Date
  },
  historialMedico: [{
    fecha: {
      type: Date,
      default: Date.now
    },
    descripcion: {
      type: String,
      required: true
    },
    veterinario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Veterinario'
    },
    tipoVisita: {
      type: String,
      enum: ['Consulta', 'Vacunación', 'Emergencia', 'Cirugía', 'Otro']
    }
  }],
  ultimaVisita: {
    type: Date
  },
  proximasVacunas: [{
    nombre: String,
    fecha: Date
  }],
  propietario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  activo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const Mascota = mongoose.model("Mascota", mascotaSchema);
export default Mascota;
