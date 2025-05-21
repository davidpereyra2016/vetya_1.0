import mongoose from "mongoose";

/**
 * Esquema para las valoraciones/reseñas de veterinarios
 * Este modelo almacena las calificaciones y comentarios que los usuarios hacen sobre los veterinarios
 * Se relaciona tanto con el usuario que hace la valoración como con el veterinario valorado
 */
const valoracionSchema = new mongoose.Schema({
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  veterinario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Veterinario',
    required: true
  },
  mascota: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mascota'
    // Opcional, puede incluirse la mascota relacionada con la atención
  },
  cita: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cita'
    // Opcional, referencia a la cita relacionada con esta valoración
  },
  emergencia: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Emergencia'
    // Opcional, referencia a la emergencia relacionada con esta valoración
  },
  calificacion: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comentario: {
    type: String
  },
  fechaAtencion: {
    type: Date
  },
  tipoServicio: {
    type: String,
    enum: ['Consulta', 'Emergencia', 'Otro']
  },
  verificada: {
    type: Boolean,
    default: false
    // Indica si la valoración ha sido verificada por un administrador
  },
  reportada: {
    type: Boolean,
    default: false
    // Indica si la valoración ha sido reportada por contenido inapropiado
  },
  visible: {
    type: Boolean,
    default: true
    // Permite ocultar valoraciones inapropiadas
  }
}, {
  timestamps: true
});

// Un usuario solo puede valorar una vez cada interacción (cita o emergencia)
valoracionSchema.index({ usuario: 1, veterinario: 1, cita: 1 }, { unique: true, sparse: true });
valoracionSchema.index({ usuario: 1, veterinario: 1, emergencia: 1 }, { unique: true, sparse: true });

// Hook para actualizar el rating promedio del veterinario cuando se crea/modifica una valoración
valoracionSchema.post('save', async function() {
  const Veterinario = mongoose.model('Veterinario');
  
  // Calcular el nuevo promedio de calificaciones para este veterinario
  const valoraciones = await this.constructor.find({ 
    veterinario: this.veterinario,
    visible: true 
  });
  
  let suma = 0;
  valoraciones.forEach(val => {
    suma += val.calificacion;
  });
  
  const nuevoRating = valoraciones.length > 0 ? suma / valoraciones.length : 0;
  
  // Actualizar el rating y número de reseñas del veterinario
  await Veterinario.findByIdAndUpdate(this.veterinario, {
    rating: parseFloat(nuevoRating.toFixed(1)),
    reviews: valoraciones.length
  });
});

const Valoracion = mongoose.model("Valoracion", valoracionSchema);
export default Valoracion;
