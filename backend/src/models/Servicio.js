import mongoose from "mongoose";

/**
 * Esquema para los servicios veterinarios
 * Este modelo almacena información sobre los diferentes servicios que pueden ofrecer los veterinarios
 * Incluye nombre, descripción, icono, etc.
 */
const servicioSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  descripcion: {
    type: String,
    required: true
  },
  icono: {
    type: String,
    default: "medkit-outline" // Icono predeterminado
  },
  color: {
    type: String,
    default: "#1E88E5" // Color predeterminado
  },
  precio: {
    type: Number
  },
  duracion: {
    type: Number, // Duración en minutos
    default: 30
  },
  categoria: {
    type: String,
    enum: [
      // Categorías para Veterinarias
      'Consulta general', 'Consulta especializada', 'Cirugía', 'Vacunación', 'Desparasitación', 
      'Radiografía', 'Ecografía', 'Análisis clínicos', 'Hospitalización', 'Urgencias', 
      'Dental', 'Oftalmología', 'Dermatología', 'Cardiología', 'Ortopedia',
      
      // Categorías para Peluquerías
      'Baño y corte', 'Baño sanitario', 'Corte de pelo', 'Corte de uñas', 'Limpieza de oídos', 
      'Limpieza de glándulas anales', 'Spa canino', 'Tratamiento antipulgas', 
      'Tratamiento dermatológico', 'Perfumería',
      
      // Categorías para Pet Shops
      'Alimentos premium', 'Alimentos medicados', 'Accesorios', 'Juguetes', 'Camas y cuchas', 
      'Transportadoras', 'Ropa para mascotas', 'Suplementos alimenticios', 'Productos de higiene', 
      'Farmacia veterinaria',
      
      // Categorías para Centros Veterinarios
      'Internación', 'Rehabilitación', 'Fisioterapia', 'Terapia acuática', 'Servicios a domicilio',
      
      // Otros servicios
      'Adiestramiento', 'Guardería', 'Adopción', 'Trámites de exportación', 'Otros'
    ],
    default: 'Consulta general'
  },
  tipoPrestador: {
    type: String,
    enum: ['Veterinario', 'Centro Veterinario', 'Veterinaria', 'Otro'],
    required: true
  },
  disponibleParaTipos: [{
    type: String,
    enum: ['Perro', 'Gato', 'Ave', 'Reptil', 'Roedor', 'Otro']
  }],
  requiereAprobacion: {
    type: Boolean,
    default: false
  },
  activo: {
    type: Boolean,
    default: true
  },
  esServicioPredefinido: {
    type: Boolean,
    default: false
  },
  prestadorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prestador'
  }
}, {
  timestamps: true
});

// Crear un índice compuesto para evitar que un prestador tenga servicios duplicados
servicioSchema.index({ nombre: 1, prestadorId: 1 }, { unique: true, sparse: true });

const Servicio = mongoose.model("Servicio", servicioSchema);
export default Servicio;
