import mongoose from "mongoose";

/**
 * Esquema para los consejos de salud
 * Este modelo almacena información sobre consejos y artículos de salud para mascotas
 * Permite organizar contenido educativo por categorías y tipos de mascota
 */
const consejoDeSaludSchema = new mongoose.Schema({
  titulo: {
    type: String,
    required: true,
    trim: true
  },
  contenido: {
    type: String,
    required: true
  },
  resumen: {
    type: String,
    required: true
  },
  imagen: {
    type: String,
    required: true
  },
  categoria: {
    type: String,
    enum: ['Nutrición', 'Prevención', 'Cuidados básicos', 'Comportamiento', 'Emergencias', 'Otro'],
    required: true
  },
  paraTipos: [{
    type: String,
    enum: ['Perro', 'Gato', 'Ave', 'Reptil', 'Roedor', 'Todos']
  }],
  tiempoLectura: {
    type: Number, // Tiempo estimado de lectura en minutos
    default: 5
  },
  autor: {
    type: String,
    default: "Equipo Vetya"
  },
  fuente: {
    type: String
  },
  etiquetas: [{
    type: String
  }],
  destacado: {
    type: Boolean,
    default: false
  },
  visualizaciones: {
    type: Number,
    default: 0
  },
  likes: {
    type: Number,
    default: 0
  },
  activo: {
    type: Boolean,
    default: true
  },
  fechaPublicacion: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Índice para búsqueda por categoría
consejoDeSaludSchema.index({ categoria: 1 });

// Índice para búsqueda por tipo de mascota
consejoDeSaludSchema.index({ paraTipos: 1 });

// Índice para búsqueda de texto completo
consejoDeSaludSchema.index({ 
  titulo: 'text', 
  contenido: 'text', 
  resumen: 'text',
  etiquetas: 'text' 
});

const ConsejoDeSalud = mongoose.model("ConsejoDeSalud", consejoDeSaludSchema);
export default ConsejoDeSalud;
